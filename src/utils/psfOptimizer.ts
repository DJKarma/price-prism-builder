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
    const bedroomType      = config.bedroomTypePricing.find((b: any) => b.type === unit.type);
    const viewAdjustment   = config.viewPricing.find((v: any) => v.view === unit.view);

    const basePsf          = bedroomType?.basePsf ?? config.basePsf;
    const viewPsfAdjustment = viewAdjustment?.psfAdjustment ?? 0;

    /* ───────── 2. floor premium ───────── */
    const floorLevel   = parseInt(unit.floor) || 1;
    const floorAdjustment = calculateFloorPremium(floorLevel, config.floorRiseRules ?? []);

    /* ───────── 3. additional‑category premiums ───────── */
    let additionalAdjustment = 0;
    const additionalCategoryPriceComponents: Record<string, number> = {};

    if (config.additionalCategoryPricing) {
      config.additionalCategoryPricing.forEach((cat: any) => {
        const colKey   = `${cat.column}_value`;
        const matches  = unit[colKey] === cat.category;
        const premium  = matches ? cat.psfAdjustment : 0;

        additionalAdjustment += premium;
        additionalCategoryPriceComponents[`${cat.column}: ${cat.category}`] = premium;

        // expose per‑column premium (used by dynamic table column)
        unit[`${cat.column}_premium`] = (unit[`${cat.column}_premium`] || 0) + premium;
      });
    }

    /* ───────── 4. balcony maths ───────── */
    const sellArea = parseFloat(unit.sellArea) || 0;
    const acArea   = parseFloat(unit.acArea)   || 0;

    // derive balcony if not supplied
    let balconyArea = parseFloat(unit.balcony) || 0;
    if (!balconyArea && sellArea && acArea) {
      balconyArea = Math.max(0, sellArea - acArea);
    }

    const { fullAreaPct = 0, remainderRate = 0 } = config.balconyPricing ?? {};
    const fullPct    = fullAreaPct   / 100;
    const remRatePct = remainderRate / 100;

    const balconyPricedArea =
      balconyArea * fullPct + balconyArea * (1 - fullPct) * remRatePct;

    /* ───────── 5. combine premiums ───────── */
    const basePsfWithAdjustments =
      basePsf + floorAdjustment + viewPsfAdjustment + additionalAdjustment;

    const psfAfterAllAdjustments = basePsfWithAdjustments;

    const effectiveArea   = acArea + balconyPricedArea;
    const balconyPrice    = basePsfWithAdjustments * balconyPricedArea;
    const acAreaPrice     = basePsfWithAdjustments * acArea;

    const totalPriceRaw   = basePsfWithAdjustments * effectiveArea;
    const finalTotalPrice = Math.ceil(totalPriceRaw / 1000) * 1000;

    const finalPsf   = sellArea ? finalTotalPrice / sellArea : 0;
    const finalAcPsf = acArea   ? finalTotalPrice / acArea  : 0;

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
  const rules = [...floorRules].sort((a, b) => a.startFloor - b.startFloor);

  for (const rule of rules) {
    const end = rule.endFloor ?? 999;

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
  // *** placeholder optimisation just scales base PSF proportionally ***
  const optimizedParams: Record<string, number> = {};

  selectedTypes.forEach((t) => {
    const bt = config.bedroomTypePricing.find((b: any) => b.type === t);
    if (!bt) return;

    // crude proportional factor
    const factor = targetPsf / Math.max(bt.basePsf, 1);
    const newBase = Math.max(0, bt.basePsf * factor);

    optimizedParams[t] = newBase;
  });

  return {
    success: true,
    optimizedParams: { bedroomAdjustments: optimizedParams },
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
  // call mega first
  const base = megaOptimizePsf(data, config, targetPsf, selectedTypes, psfType);

  // placeholder: copy view / additional premiums unchanged
  const viewAdjustments: Record<string, number> = {};
  config.viewPricing.forEach((v: any) => (viewAdjustments[v.view] = v.psfAdjustment));

  const addAdj: Record<string, Record<string, number>> = {};
  (config.additionalCategoryPricing || []).forEach((c: any) => {
    addAdj[c.column] = addAdj[c.column] || {};
    addAdj[c.column][c.category] = c.psfAdjustment;
  });

  return {
    ...base,
    optimizedParams: {
      ...base.optimizedParams,
      viewAdjustments,
      additionalCategoryAdjustments: addAdj,
    },
  };
};

/* ───────────────── overall PSF metrics ─────────────────────── */

export const calculateOverallAveragePsf = (data: any[], config: any) => {
  const priced = simulatePricing(data, config);

  const valid = priced.filter(
    (u) => parseFloat(u.sellArea) > 0 && u.finalTotalPrice > 0
  );
  if (!valid.length) return 0;

  const totalValue   = valid.reduce((s, u) => s + u.finalTotalPrice, 0);
  const totalSell    = valid.reduce((s, u) => s + parseFloat(u.sellArea), 0);
  return totalValue / totalSell;
};

export const calculateOverallAverageAcPsf = (data: any[], config: any) => {
  const priced = simulatePricing(data, config);

  const valid = priced.filter(
    (u) => parseFloat(u.acArea) > 0 && u.finalTotalPrice > 0
  );
  if (!valid.length) return 0;

  const totalValue = valid.reduce((s, u) => s + u.finalTotalPrice, 0);
  const totalAc    = valid.reduce((s, u) => s + parseFloat(u.acArea), 0);
  return totalValue / totalAc;
};
