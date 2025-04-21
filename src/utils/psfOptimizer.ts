/*****************************************************************
 *  Price‑Prism ‑ PSF Optimiser  (single source of truth)        *
 *  ------------------------------------------------------------ *
 *  ‑ simulatePricing()            : enriches every unit with    *
 *      detailed premiums + balcony logic + final prices.        *
 *  ‑ calculateFloorPremium()      : helper reused elsewhere.    *
 *  ‑ megaOptimizePsf()            : bedroom‑only optimisation.  *
 *  ‑ fullOptimizePsf()            : all‑parameter optimisation. *
 *  ‑ calculateOverallAveragePsf() : weighted SA PSF.            *
 *  ‑ calculateOverallAverageAcPsf(): weighted AC PSF.           *
 *****************************************************************/

export const simulatePricing = (data: any[], config: any) => {
  return data.map((unit) => {
    /* ───────── 1. base PSF + view premium ───────── */
    const bedroomType       = config.bedroomTypePricing.find((b: any) => b.type === unit.type);
    const viewAdjustment    = config.viewPricing.find((v: any) => v.view === unit.view);

    const basePsf           = bedroomType?.basePsf ?? config.basePsf;
    const viewPsfAdjustment = viewAdjustment?.psfAdjustment ?? 0;

    /* ───────── 2. floor premium ───────── */
    const floorLevel      = parseInt(unit.floor, 10) || 1;
    const floorAdjustment = calculateFloorPremium(floorLevel, config.floorRiseRules ?? []);

    /* ───────── 3. additional‑category premiums ───────── */
    let additionalAdjustment = 0;
    const additionalCategoryPriceComponents: Record<string, number> = {};

    if (Array.isArray(config.additionalCategoryPricing)) {
      for (const cat of config.additionalCategoryPricing) {
        const colKey  = `${cat.column}_value`;
        const matches = unit[colKey] === cat.category;
        const premium = matches ? cat.psfAdjustment : 0;
        additionalAdjustment += premium;
        additionalCategoryPriceComponents[`${cat.column}: ${cat.category}`] = premium;
        // expose per‑column premium for dynamic column toggling
        unit[`${cat.column}_premium`] = (unit[`${cat.column}_premium`] || 0) + premium;
      }
    }

    /* ───────── 4. balcony maths ───────── */
    const sellArea = parseFloat(unit.sellArea) || 0;
    const acArea   = parseFloat(unit.acArea)   || 0;
    let balconyArea = parseFloat(unit.balcony) || 0;

    if (!balconyArea && sellArea && acArea) {
      balconyArea = Math.max(0, sellArea - acArea);
    }

    const { fullAreaPct = 0, remainderRate = 0 } = config.balconyPricing ?? {};
    const fullPct    = fullAreaPct   / 100;
    const remPct     = remainderRate / 100;
    const balconyPricedArea =
      balconyArea * fullPct + balconyArea * (1 - fullPct) * remPct;

    /* ───────── 5. combine premiums ───────── */
    const basePsfWithAdjustments =
      basePsf + floorAdjustment + viewPsfAdjustment + additionalAdjustment;

    const psfAfterAllAdjustments = basePsfWithAdjustments;

    const effectiveArea = acArea + balconyPricedArea;
    const balconyPrice  = basePsfWithAdjustments * balconyPricedArea;
    const acAreaPrice   = basePsfWithAdjustments * acArea;

    const totalPriceRaw   = basePsfWithAdjustments * effectiveArea;
    const finalTotalPrice = Math.ceil(totalPriceRaw / 1000) * 1000;

    const finalPsf   = sellArea ? finalTotalPrice / sellArea : 0;
    const finalAcPsf = acArea   ? finalTotalPrice / acArea   : 0;

    /* ───────── return enriched unit ───────── */
    return {
      ...unit,

      // component values
      basePsf,
      floorAdjustment,
      viewPsfAdjustment,
      additionalAdjustment,
      psfAfterAllAdjustments,

      // balcony & AC details
      balconyArea,
      balconyPercentage: sellArea ? (balconyArea / sellArea) * 100 : 0,
      balconyPrice,
      acAreaPrice,

      // totals
      totalPrice: totalPriceRaw,
      totalPriceRaw,
      finalTotalPrice,
      finalPsf,
      finalAcPsf,

      // breakdown map
      additionalCategoryPriceComponents,

      effectiveArea,
      isOptimized: false,
    };
  });
};

/* ──────────────────────────────────────────────────────────── */

export const calculateFloorPremium = (floor: number, floorRules: any[]) => {
  let premium = 0;
  const rules  = [...floorRules].sort((a, b) => a.startFloor - b.startFloor);

  for (const rule of rules) {
    const end = rule.endFloor ?? Infinity;
    if (floor < rule.startFloor) continue;

    const floorsInRange = Math.min(floor, end) - rule.startFloor + 1;
    premium += floorsInRange * rule.psfIncrement;

    if (rule.jumpEveryFloor && rule.jumpIncrement) {
      const jumps = Math.floor(floorsInRange / rule.jumpEveryFloor);
      premium += jumps * rule.jumpIncrement;
    }

    if (floor <= end) break;
  }

  return premium;
};

/* ───────────────── optimisation algorithms (simple placeholders) ───────── */

export const megaOptimizePsf = (
  data: any[],
  config: any,
  targetPsf: number,
  selectedTypes: string[] = [],
  psfType: "sellArea" | "acArea" = "sellArea"
) => {
  const bedroomAdjustments: Record<string, number> = {};

  for (const t of selectedTypes) {
    const bt = config.bedroomTypePricing.find((b: any) => b.type === t);
    if (!bt) continue;
    const factor = targetPsf / Math.max(bt.basePsf, 1);
    bedroomAdjustments[t] = Math.max(0, bt.basePsf * factor);
  }

  return {
    success: true,
    optimizedParams: { bedroomAdjustments },
    message: "Simple mega optimisation applied",
  };
};

export const fullOptimizePsf = (
  data: any[],
  config: any,
  targetPsf: number,
  selectedTypes: string[] = [],
  psfType: "sellArea" | "acArea" = "sellArea"
) => {
  const baseResult = megaOptimizePsf(data, config, targetPsf, selectedTypes, psfType);

  const viewAdjustments: Record<string, number> = {};
  for (const v of config.viewPricing ?? []) {
    viewAdjustments[v.view] = v.psfAdjustment;
  }

  const additionalCategoryAdjustments: Record<string, Record<string, number>> = {};
  for (const c of config.additionalCategoryPricing ?? []) {
    additionalCategoryAdjustments[c.column] =
      additionalCategoryAdjustments[c.column] || {};
    additionalCategoryAdjustments[c.column][c.category] = c.psfAdjustment;
  }

  return {
    ...baseResult,
    optimizedParams: {
      ...baseResult.optimizedParams,
      viewAdjustments,
      additionalCategoryAdjustments,
    },
  };
};

/* ───────────────── overall PSF metrics ─────────────────────── */

export const calculateOverallAveragePsf = (data: any[], config: any) => {
  const priced = simulatePricing(data, config);
  const valid  = priced.filter((u) => parseFloat(u.sellArea) > 0 && u.finalTotalPrice > 0);
  if (!valid.length) return 0;
  const totalValue = valid.reduce((sum, u) => sum + u.finalTotalPrice, 0);
  const totalArea  = valid.reduce((sum, u) => sum + parseFloat(u.sellArea), 0);
  return totalValue / totalArea;
};

export const calculateOverallAverageAcPsf = (data: any[], config: any) => {
  const priced = simulatePricing(data, config);
  const valid  = priced.filter((u) => parseFloat(u.acArea) > 0 && u.finalTotalPrice > 0);
  if (!valid.length) return 0;
  const totalValue = valid.reduce((sum, u) => sum + u.finalTotalPrice, 0);
  const totalAc    = valid.reduce((sum, u) => sum + parseFloat(u.acArea), 0);
  return totalValue / totalAc;
};
