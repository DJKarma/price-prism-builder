// src/utils/psfOptimizer.ts

export type PricingMode = "villa" | "apartment";

/** Flat‐price adder rule */
export interface FlatPriceAdder {
  units?: string[];                   // exact unit names
  columns?: Record<string, string[]>; // category filters
  amount: number;                     // AED to add
}

/**
 * Simulate pricing for each unit, applying PSF adjustments,
 * balcony logic, flat‐price adders, and rounding.
 */
export const simulatePricing = (
  data: any[],
  config: {
    bedroomTypePricing: Array<{ type: string; basePsf: number }>;
    viewPricing:       Array<{ view: string; psfAdjustment: number }>;
    floorRiseRules?:   Array<{
      startFloor: number;
      endFloor:   number | null;
      psfIncrement: number;
      jumpEveryFloor?: number;
      jumpIncrement?:  number;
    }>;
    additionalCategoryPricing?: Array<{
      column: string;
      category: string;
      psfAdjustment: number;
    }>;
    balconyPricing?:       { fullAreaPct: number; remainderRate: number };
    flatPriceAdders?: FlatPriceAdder[];
  },
  mode: PricingMode = "apartment",
  /** UI filters no longer gate flat adders */
  _activeFilters?: {
    types?: string[];
    views?: string[];
    floors?: string[];
    additional?: Record<string, string[]>;
  }
): any[] => {
  return data.map((unit) => {
    const sellArea = parseFloat(unit.sellArea) || 0;
    const acArea   = parseFloat(unit.acArea)   || 0;

    // 1) Base PSF + view adjustment
    const bt = config.bedroomTypePricing.find((b) => b.type === unit.type);
    const vp = config.viewPricing.find((v) => v.view === unit.view);
    const basePsf           = bt?.basePsf       ?? 0;
    const viewPsfAdjustment = vp?.psfAdjustment ?? 0;

    // 2) Floor premium (apartments only)
    const floorAdjustment =
      mode === "apartment"
        ? calculateFloorPremium(parseInt(unit.floor) || 1, config.floorRiseRules || [])
        : 0;

    // 3) Additional‐category PSF premiums
    let additionalAdjustment = 0;
    const additionalCategoryPriceComponents: Record<string, number> = {};
    (config.additionalCategoryPricing || []).forEach((cat) => {
      const val = unit[`${cat.column}_value`];
      const key = `${cat.column}: ${val}`;
      if (val === cat.category) {
        additionalAdjustment += cat.psfAdjustment;
        additionalCategoryPriceComponents[key] = cat.psfAdjustment;
      }
    });

    // 4) Balcony pricing logic (apartments only)
    let balconyArea = parseFloat(unit.balcony) || 0;
    if (mode === "apartment" && sellArea > acArea && !balconyArea) {
      balconyArea = sellArea - acArea;
    }
    const { fullAreaPct = 0, remainderRate = 0 } = config.balconyPricing || {};
    const fullPct = fullAreaPct / 100;
    const remPct  = remainderRate / 100;
    // priceable portion of balcony
    const balconyPricedArea =
      mode === "apartment"
        ? balconyArea * fullPct + balconyArea * (1 - fullPct) * remPct
        : 0;

    // 5) PSF after adjustments
    const psfAfterAllAdjustments =
      basePsf + viewPsfAdjustment + floorAdjustment + additionalAdjustment;

    // 6) Raw price (two‐mode apartment vs. villa)
    let totalPriceRaw: number;
    if (mode === "apartment") {
      if (balconyArea > 0) {
        // split AC vs. balcony
        const acPrice       = psfAfterAllAdjustments * acArea;
        const balconyPrice  = psfAfterAllAdjustments * balconyPricedArea;
        totalPriceRaw = acPrice + balconyPrice;
      } else {
        // no balcony → price whole sellable area
        totalPriceRaw = psfAfterAllAdjustments * sellArea;
      }
    } else {
      // villa: always AC area only
      totalPriceRaw = psfAfterAllAdjustments * acArea;
    }
        // 7) Raw price
    const totalPriceRaw = psfAfterAllAdjustments * effectiveArea;

    // ── NEW: split out AC vs Balcony components ──
    const acPrice      = psfAfterAllAdjustments * acArea;
    const balconyPrice = psfAfterAllAdjustments * balconyPricedArea;

    // 8) Flat‐price adders …
    let flatAddTotal = 0;
    (config.flatPriceAdders || []).forEach((adder) => {
      // name‐match (or empty = match all)
      const unitsMatch = !adder.units || adder.units.length === 0
        ? true
        : adder.units.includes(unit.name);
      // column‐match (or unset = match all)
      const colsMatch = !adder.columns
        ? true
        : Object.entries(adder.columns).every(([col, vals]) => {
            const rawVal = unit[`${col}_value`];
            const v       = rawVal != null ? rawVal : unit[col];
            return vals.includes(v?.toString() ?? "");
          });
      if (unitsMatch && colsMatch) {
        flatAddTotal += adder.amount;
      }
    });
    const priceWithFlat = totalPriceRaw + flatAddTotal;

    // 8) Round up to nearest 1,000 AED
    const finalTotalPrice = Math.ceil(priceWithFlat / 1000) * 1000;

    // 9) Final PSF metrics
    const finalPsf   =
      mode === "villa"
        ? acArea   ? finalTotalPrice / acArea   : 0
        : sellArea ? finalTotalPrice / sellArea : 0;
    const finalAcPsf = acArea ? finalTotalPrice / acArea : 0;

    return {
      ...unit,
      basePsf,
      viewPsfAdjustment,
      floorAdjustment,
      additionalAdjustment,
      psfAfterAllAdjustments,
      balconyArea,
      balconyPercentage: sellArea ? (balconyArea / sellArea) * 100 : 0,
      balconyPricedArea,
      totalPriceRaw,
      flatAddTotal,
      finalTotalPrice,
      finalPsf,
      finalAcPsf,
      additionalCategoryPriceComponents,
    };
  });
};

/**
 * Calculate floor‐based PSF premium using defined rules.
 */
export const calculateFloorPremium = (
  floor: number,
  rules: Array<{
    startFloor:     number;
    endFloor?:      number | null;
    psfIncrement:   number;
    jumpEveryFloor?: number;
    jumpIncrement?:  number;
  }>
): number => {
  let premium = 0;
  const sorted = [...rules].sort((a, b) => a.startFloor - b.startFloor);
  for (const rule of sorted) {
    const end = rule.endFloor ?? Infinity;
    if (floor < rule.startFloor) continue;
    const floorsInRange = Math.min(floor, end) - rule.startFloor + 1;
    premium += floorsInRange * (rule.psfIncrement || 0);
    if (rule.jumpEveryFloor && rule.jumpIncrement) {
      const jumps = Math.floor(floorsInRange / rule.jumpEveryFloor);
      premium += jumps * rule.jumpIncrement;
    }
    if (floor <= end) break;
  }
  return premium;
};

/** Simple bedroom‐only optimizer (unchanged) */
export const megaOptimizePsf = (
  data: any[],
  config: any,
  targetPsf: number,
  types: string[] = [],
  mode: PricingMode = "apartment"
) => {
  const bedroomAdjustments: Record<string, number> = {};
  types.forEach((type) => {
    const bt = config.bedroomTypePricing.find((b: any) => b.type === type);
    if (!bt) return;
    const factor = targetPsf / Math.max(bt.basePsf, 1);
    bedroomAdjustments[type] = bt.basePsf * factor;
  });
  return {
    success: true,
    optimizedParams: { bedroomAdjustments },
    message: "Mega optimization applied",
  };
};

/** Full optimizer (unchanged) */
export const fullOptimizePsf = (
  data: any[],
  config: any,
  targetPsf: number,
  types: string[] = [],
  mode: PricingMode = "apartment"
) => {
  const base = megaOptimizePsf(data, config, targetPsf, types, mode);
  const viewAdjustments: Record<string, number> = {};
  (config.viewPricing || []).forEach(
    (v: any) => (viewAdjustments[v.view] = v.psfAdjustment)
  );
  const additionalCategoryAdjustments: Record<string, Record<string, number>> = {};
  (config.additionalCategoryPricing || []).forEach((c: any) => {
    additionalCategoryAdjustments[c.column] ??= {};
    additionalCategoryAdjustments[c.column][c.category] = c.psfAdjustment;
  });
  return {
    ...base,
    optimizedParams: {
      ...base.optimizedParams,
      viewAdjustments,
      additionalCategoryAdjustments,
    },
  };
};

/** Helpers to compute overall average PSF (unchanged) */
export const calculateOverallAveragePsf = (
  data: any[],
  config: any,
  mode: PricingMode = "apartment"
): number => {
  const priced = simulatePricing(data, config, mode);
  const valid  = priced.filter(u => parseFloat(u.sellArea) > 0 && u.finalTotalPrice > 0);
  if (!valid.length) return 0;
  const totalValue = valid.reduce((s, u) => s + u.finalTotalPrice, 0);
  const totalArea  =
    mode === "villa"
      ? valid.reduce((s, u) => s + parseFloat(u.acArea), 0)
      : valid.reduce((s, u) => s + parseFloat(u.sellArea), 0);
  return totalValue / totalArea;
};

export const calculateOverallAverageAcPsf = (
  data: any[],
  config: any,
  mode: PricingMode = "apartment"
): number => {
  const priced = simulatePricing(data, config, mode);
  const valid  = priced.filter(u => parseFloat(u.acArea) > 0 && u.finalTotalPrice > 0);
  if (!valid.length) return 0;
  const totalValue = valid.reduce((s, u) => s + u.finalTotalPrice, 0);
  const totalAc    = valid.reduce((s, u) => s + parseFloat(u.acArea), 0);
  return totalValue / totalAc;
};
