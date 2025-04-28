/* ────────────────────────────────────────────────────────────────
   PSF OPTIMIZER – full implementation
   (pricing simulation, floor-premium math, optimisers, helpers)
   Added 2025-04-28:
     • activeFilters param so flat-price adders only hit scoped units
────────────────────────────────────────────────────────────────── */

export type PricingMode = "villa" | "apartment";

/* ---------- support types ---------- */
export interface FlatPriceAdder {
  units?: string[];                      // exact unit IDs
  columns?: Record<string, string[]>;    // column → allowed values
  amount: number;                        // flat AED (+/-)
}

/* ───────────────────────────────────────────────────────────────
   MAIN SIMULATOR
──────────────────────────────────────────────────────────────── */
export const simulatePricing = (
  data: any[],
  config: {
    bedroomTypePricing: Array<{ type: string; basePsf: number }>;
    viewPricing: Array<{ view: string; psfAdjustment: number }>;
    floorRiseRules?: Array<{
      startFloor: number;
      endFloor: number | null;
      psfIncrement: number;
      jumpEveryFloor?: number;
      jumpIncrement?: number;
    }>;
    additionalCategoryPricing?: Array<{
      column: string;
      category: string;
      psfAdjustment: number;
    }>;
    balconyPricing?: { fullAreaPct: number; remainderRate: number };
    flatPriceAdders?: FlatPriceAdder[];
  },
  mode: PricingMode = "apartment",
  /* ✨ NEW: pass active UI filters so adders are scoped */
  activeFilters?: {
    types?: string[];
    views?: string[];
    floors?: string[];
    additional?: Record<string, string[]>;
  }
) => {
  return data.map((unit) => {
    /* ----------  base inputs ---------- */
    const sellArea = parseFloat(unit.sellArea) || 0;
    const acArea   = parseFloat(unit.acArea)   || 0;

    /* ---------- 1) base PSF + view ---------- */
    const bt = config.bedroomTypePricing.find((b) => b.type === unit.type);
    const vp = config.viewPricing.find((v) => v.view === unit.view);
    const basePsf           = bt?.basePsf       ?? 0;
    const viewPsfAdjustment = vp?.psfAdjustment ?? 0;

    /* ---------- 2) floor premium ---------- */
    const floorAdjustment =
      mode === "apartment"
        ? calculateFloorPremium(
            parseInt(unit.floor) || 1,
            config.floorRiseRules || []
          )
        : 0;

    /* ---------- 3) additional-category premiums ---------- */
    let additionalAdjustment = 0;
    (config.additionalCategoryPricing || []).forEach((cat) => {
      if (unit[`${cat.column}_value`] === cat.category) {
        additionalAdjustment += cat.psfAdjustment;
      }
    });

    /* ---------- 4) balcony logic (apartments) ---------- */
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

    /* ---------- 5) PSF after all adjustments ---------- */
    const psfAfterAllAdjustments =
      basePsf + viewPsfAdjustment + floorAdjustment + additionalAdjustment;

    /* ---------- 6) effective area ---------- */
    const effectiveArea =
      mode === "villa"
        ? acArea
        : acArea + balconyPricedArea;

    /* ---------- 7) raw price ---------- */
    const totalPriceRaw = psfAfterAllAdjustments * effectiveArea;

    /* ---------- 8) flat-price adders (respect activeFilters) ---------- */
    let flatAddTotal = 0;
    (config.flatPriceAdders || []).forEach((adder) => {
      const matchUnit = adder.units?.includes(unit.name) ?? false;
      const matchCols = adder.columns
        ? Object.entries(adder.columns).every(
            ([col, vals]) => vals.includes(unit[`${col}_value`])
          )
        : false;

      const passesActive =
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

      if (passesActive && (matchUnit || matchCols)) {
        flatAddTotal += adder.amount;
      }
    });
    const priceWithFlat = totalPriceRaw + flatAddTotal;

    /* ---------- 9) round up to 1 000 ---------- */
    const finalTotalPrice = Math.ceil(priceWithFlat / 1000) * 1000;

    /* ---------- 10) PSF outputs ---------- */
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
    };
  });
};

/* ───────────────────────────────────────────────────────────────
   FLOOR PREMIUM HELPER
──────────────────────────────────────────────────────────────── */
export const calculateFloorPremium = (
  floor: number,
  rules: Array<{
    startFloor:     number;
    endFloor?:      number | null;
    psfIncrement:   number;
    jumpEveryFloor?: number;
    jumpIncrement?:  number;
  }>
) => {
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

/* ─────────────────────────────────────────
   Optimisers + overall PSF helpers
   (unchanged from your original)
──────────────────────────────────────── */
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

export const calculateOverallAveragePsf = (
  data: any[],
  config: any,
  mode: PricingMode = "apartment"
) => {
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
) => {
  const priced = simulatePricing(data, config, mode);
  const valid = priced.filter(
    (u) => parseFloat(u.acArea) > 0 && u.finalTotalPrice > 0
  );
  if (!valid.length) return 0;
  const totalValue = valid.reduce((s, u) => s + u.finalTotalPrice, 0);
  const totalAc = valid.reduce((s, u) => s + parseFloat(u.acArea), 0);
  return totalValue / totalAc;
};
