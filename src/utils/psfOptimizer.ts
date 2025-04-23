// src/utils/psfOptimizer.ts

export type PricingMode = "villa" | "apartment";

export interface FlatPriceAdder {
  units?: string[];                
  columns?: Record<string, string[]>;
  amount: number;                  
}

export const simulatePricing = (
  data: any[],
  config: {
    bedroomTypePricing: Array<{ type: string; basePsf: number }>;
    viewPricing: Array<{ view: string; psfAdjustment: number }>;
    floorRiseRules?: any[];
    additionalCategoryPricing?: Array<{
      column: string;
      category: string;
      psfAdjustment: number;
    }>;
    balconyPricing?: { fullAreaPct: number; remainderRate: number };
    flatPriceAdders?: FlatPriceAdder[];
  },
  mode: PricingMode = "apartment"
) => {
  return data.map((unit) => {
    const sellArea = parseFloat(unit.sellArea) || 0;
    const acArea   = parseFloat(unit.acArea)   || 0;

    // 1) base PSF + view
    const bt = config.bedroomTypePricing.find(b => b.type === unit.type);
    const vp = config.viewPricing.find(v => v.view === unit.view);
    const basePsf           = bt?.basePsf ?? 0;
    const viewPsfAdjustment = vp?.psfAdjustment ?? 0;

    // 2) floor premium only in apartment mode
    const floorAdjustment = mode === "apartment"
      ? calculateFloorPremium(parseInt(unit.floor) || 1, config.floorRiseRules ?? [])
      : 0;

    // 3) additional-category premiums
    let additionalAdjustment = 0;
    const additionalCategoryPriceComponents: Record<string, number> = {};
    (config.additionalCategoryPricing || []).forEach(cat => {
      const key = `${cat.column}: ${cat.category}`;
      if (unit[`${cat.column}_value`] === cat.category) {
        additionalAdjustment += cat.psfAdjustment;
        additionalCategoryPriceComponents[key] = cat.psfAdjustment;
      } else {
        additionalCategoryPriceComponents[key] = 0;
      }
    });

    // 4) balcony logic
    let balconyArea = parseFloat(unit.balcony) || 0;
    if (mode === "apartment" && sellArea > acArea && !balconyArea) {
      balconyArea = sellArea - acArea;
    }
    const { fullAreaPct = 0, remainderRate = 0 } = config.balconyPricing || {};
    const fullPct    = fullAreaPct   / 100;
    const remPct     = remainderRate / 100;
    const balconyPricedArea = mode === "apartment"
      ? balconyArea * fullPct + balconyArea * (1 - fullPct) * remPct
      : 0;

    // 5) combine PSF adjustments
    const basePsfWithAdjustments =
      basePsf + viewPsfAdjustment + floorAdjustment + additionalAdjustment;

    // 6) compute effective area
    const effectiveArea = mode === "villa"
      ? acArea
      : acArea + balconyPricedArea;

    // 7) raw price
    const totalPriceRaw = basePsfWithAdjustments * effectiveArea;

    // 8) flat price adders
    let flatAddTotal = 0;
    (config.flatPriceAdders || []).forEach(adder => {
      const matchUnit = adder.units?.includes(unit.name);
      const matchCols = adder.columns
        ? Object.entries(adder.columns).every(
            ([col, vals]) => vals.includes(unit[`${col}_value`])
          )
        : false;
      if (matchUnit || matchCols) {
        flatAddTotal += adder.amount;
      }
    });

    const priceWithFlat = totalPriceRaw + flatAddTotal;

    // 9) ceiling
    const finalTotalPrice = Math.ceil(priceWithFlat / 1000) * 1000;

    // 10) PSFs
    const finalPsf   = mode === "villa"
      ? acArea ? finalTotalPrice / acArea : 0
      : sellArea ? finalTotalPrice / sellArea : 0;
    const finalAcPsf = acArea   ? finalTotalPrice / acArea : 0;

    // 11) expose balcony & AC price
    const balconyPrice = basePsfWithAdjustments * balconyPricedArea;
    const acAreaPrice  = basePsfWithAdjustments * acArea;

    return {
      ...unit,

      // breakdown
      basePsf,
      viewPsfAdjustment,
      floorAdjustment,
      additionalAdjustment,
      psfAfterAllAdjustments: basePsfWithAdjustments,

      // balcony details
      balconyArea,
      balconyPercentage: sellArea ? (balconyArea / sellArea) * 100 : 0,
      balconyPricedArea,
      balconyPrice,
      acAreaPrice,

      // pricing
      totalPriceRaw,
      flatAddTotal,
      finalTotalPrice,

      // PSFs
      finalPsf,
      finalAcPsf,

      // detailed map used by table’s “premium” columns
      additionalCategoryPriceComponents,

      isOptimized: false,
    };
  });
};

export const calculateFloorPremium = (floor: number, rules: any[]) => {
  let premium = 0;
  const sorted = [...rules].sort((a,b) => a.startFloor - b.startFloor);
  for (const rule of sorted) {
    const end = rule.endFloor ?? Infinity;
    if (floor < rule.startFloor) continue;
    const count = Math.min(floor, end) - rule.startFloor + 1;
    premium += count * (rule.psfIncrement || 0);
    if (rule.jumpEveryFloor && rule.jumpIncrement) {
      const jumps = Math.floor(count / rule.jumpEveryFloor);
      premium += jumps * rule.jumpIncrement;
    }
    if (floor <= end) break;
  }
  return premium;
};

// … your mega/full optimization and summary functions unchanged …
