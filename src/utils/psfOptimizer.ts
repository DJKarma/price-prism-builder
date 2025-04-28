// src/utils/psfOptimizer.ts

export type PricingMode = "villa" | "apartment";

/** Flat-price adder rule */
export interface FlatPriceAdder {
  units?: string[];                   // exact unit names
  columns?: Record<string, string[]>; // category filters
  amount: number;                     // AED to add
}

/**
 * Simulate pricing for each unit, applying PSF adjustments,
 * balcony logic, flat-price adders (scoped by activeFilters), and rounding.
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
  activeFilters?: {
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

    // 3) Additional-category PSF premiums (sum + breakdown)
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
    const balconyPricedArea =
      mode === "apartment"
        ? balconyArea * fullPct + balconyArea * (1 - fullPct) * remPct
        : 0;

    // 5) PSF after adjustments
    const psfAfterAllAdjustments =
      basePsf + viewPsfAdjustment + floorAdjustment + additionalAdjustment;

    // 6) Effective area
    const effectiveArea =
      mode === "villa"
        ? acArea
        : acArea + balconyPricedArea;

    // 7) Raw price
    const totalPriceRaw = psfAfterAllAdjustments * effectiveArea;

    // 8) Flat-price adders, scoped by activeFilters
    let flatAddTotal = 0;
    (config.flatPriceAdders || []).forEach((adder) => {
      const hasUnitFilters = Array.isArray(adder.units) && adder.units.length > 0;
      const hasColFilters  = adder.columns && Object.keys(adder.columns).length > 0;

      //  → skip any adder that has _no_ filters at all
      if (!hasUnitFilters && !hasColFilters) return;

      // check unit-name match (if any)
      const matchUnit = hasUnitFilters && adder.units!.includes(unit.name);

      // check column-filters match (if any)
      const matchCols = hasColFilters && Object.entries(adder.columns!).every(
        ([col, vals]) => vals.includes(unit[`${col}_value`])
      );

      // combine:
      // • if both filters present → require _both_ to be true
      // • else if only one kind → require that one
      let matchAll = false;
      if (hasUnitFilters && hasColFilters) {
        matchAll = matchUnit && matchCols;
      } else if (hasUnitFilters) {
        matchAll = matchUnit;
      } else /* hasColFilters */ {
        matchAll = matchCols;
      }

      // respect the activeFilters panel as well
      const passesFilters =
        !activeFilters ||
        (
          (!activeFilters.types      || activeFilters.types.includes(unit.type))  &&
          (!activeFilters.views      || activeFilters.views.includes(unit.view))  &&
          (!activeFilters.floors     || activeFilters.floors.includes(unit.floor)) &&
          (!activeFilters.additional ||
            Object.entries(activeFilters.additional).every(
              ([col, vals]) => vals.includes(unit[`${col}_value`])
            ))
        );

      if (passesFilters && matchAll) {
        flatAddTotal += adder.amount;
      }
    });
    const priceWithFlat = totalPriceRaw + flatAddTotal;

    // 9) Round up to nearest 1,000 AED
    const finalTotalPrice = Math.ceil(priceWithFlat / 1000) * 1000;

    // 10) Final PSF metrics
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
      additionalCategoryPriceComponents, // breakdown map
    };
  });
};

/**
 * Calculate floor-based PSF premium using defined rules.
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

/** Simple bedroom-only optimizer (unchanged) */
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
  const additionalCategoryAdjustments: Record<
    string,
    Record<string, number>
  > = {};
  (config.additionalCategoryPricing || []).forEach((c: any) => {
    additionalCategoryAdjustments[c.column] =
      additionalCategoryAdjustments[c.column] || {};
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
  const valid = priced.filter(
    (u) => parseFloat(u.sellArea) > 0 && u.finalTotalPrice > 0
  );
  if (!valid.length) return 0;
  const totalValue = valid.reduce((s, u) => s + u.finalTotalPrice, 0);
  const totalArea =
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
  const valid = priced.filter(
    (u) => parseFloat(u.acArea) > 0 && u.finalTotalPrice > 0
  );
  if (!valid.length) return 0;
  const totalValue = valid.reduce((s, u) => s + u.finalTotalPrice, 0);
  const totalAc = valid.reduce((s, u) => s + parseFloat(u.acArea), 0);
  return totalValue / totalAc;
};
