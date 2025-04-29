
/*  src/components/mega-optimize/useOptimizer.ts
    One‑shot optimiser that hits target SA‑ or AC‑PSF exactly.
*/
import { useState, useEffect } from "react";
import {
  calculateOverallAveragePsf,
  calculateOverallAverageAcPsf,
} from "@/utils/psfOptimizer";
import { toast } from "sonner";

/* helper to get overall current PSF */
const overallAvg = (
  data: any[],
  config: any,
  metric: "sellArea" | "acArea"
) => {
  if (!data?.length || !config) return 0;
  
  return metric === "sellArea"
    ? calculateOverallAveragePsf(data, config)
    : calculateOverallAverageAcPsf(data, config);
};

export const useOptimizer = (
  data: any[],
  pricingConfig: any,
  onOptimized: (cfg: any) => void
) => {
  /* ------------- state ------------- */
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);

  const [currentOverallPsf, setCurrentOverallPsf] = useState(0);
  const [currentOverallAcPsf, setCurrentOverallAcPsf] = useState(0);

  const defaultTarget = pricingConfig?.targetOverallPsf ||
    (pricingConfig?.bedroomTypePricing?.reduce(
      (s: number, t: any) => s + t.targetAvgPsf,
      0
    ) / (pricingConfig?.bedroomTypePricing?.length || 1)) || 1000;

  const [targetPsf, setTargetPsf] = useState(defaultTarget);
  const [optimizationMode, setOptimizationMode] = useState<
    "basePsf" | "allParams"
  >("basePsf");

  /* keep current numbers in sync with latest config */
  useEffect(() => {
    if (data?.length && pricingConfig) {
      setCurrentOverallPsf(calculateOverallAveragePsf(data, pricingConfig));
      setCurrentOverallAcPsf(calculateOverallAverageAcPsf(data, pricingConfig));
      setIsOptimized(!!pricingConfig.isOptimized);
    }
  }, [data, pricingConfig]);

  /* ------------- ONE‑STEP optimiser ------------- */
  const runMegaOptimization = async (
    selectedTypes: string[],
    psfType: "sellArea" | "acArea" = "sellArea"
  ) => {
    if (!selectedTypes.length) {
      toast.warning("Select at least one bedroom type");
      return;
    }

    if (!data?.length || !pricingConfig) {
      toast.error("No data or pricing configuration available");
      return;
    }

    setIsOptimizing(true);
    try {
      /* Current overall */
      const curOverall = overallAvg(data, pricingConfig, psfType);

      /* Areas */
      const totalSellArea = data.reduce((s, u) => s + Number(u.sellArea), 0);
      const totalAcArea = data.reduce((s, u) => s + Number(u.acArea), 0);

      const selectedSellArea = data
        .filter((u) => selectedTypes.includes(u.type))
        .reduce((s, u) => s + Number(u.sellArea), 0);

      if (!selectedSellArea) {
        toast.error("Selected bedroom types have zero sell area");
        return;
      }

      /* choose denominator for overall PSF */
      const totalDenominatorArea =
        psfType === "sellArea" ? totalSellArea : totalAcArea;

      /* delta that takes us exactly to target */
      const delta =
        (targetPsf - curOverall) * (totalDenominatorArea / selectedSellArea);

      /* build new config */
      const newConfig = {
        ...pricingConfig,
        bedroomTypePricing: (pricingConfig.bedroomTypePricing || []).map((bt: any) => {
          if (!selectedTypes.includes(bt.type)) return bt;
          return {
            ...bt,
            originalBasePsf: bt.originalBasePsf ?? bt.basePsf,
            basePsf: Math.max(0, bt.basePsf + delta),
          };
        }),
        isOptimized: true,
        optimizedTypes: selectedTypes,
        targetOverallPsf: targetPsf,
        optimizePsfType: psfType,
      };

      /* push up */
      onOptimized(newConfig);
      setCurrentOverallPsf(calculateOverallAveragePsf(data, newConfig));
      setCurrentOverallAcPsf(calculateOverallAverageAcPsf(data, newConfig));
      setIsOptimized(true);

      toast.success(
        `Now at ${psfType === "sellArea" ? "SA" : "AC"} PSF ≈ ${targetPsf.toFixed(
          2
        )}`
      );
    } catch (err) {
      console.error(err);
      toast.error("Optimisation failed");
    } finally {
      setIsOptimizing(false);
    }
  };

  /* ------------- revert ------------- */
  const revertOptimization = () => {
    if (!pricingConfig?.isOptimized) return;

    const reverted = {
      ...pricingConfig,
      bedroomTypePricing: (pricingConfig.bedroomTypePricing || []).map((bt: any) => ({
        ...bt,
        basePsf: bt.originalBasePsf ?? bt.basePsf,
      })),
      isOptimized: false,
      optimizedTypes: [],
    };

    onOptimized(reverted);
    setCurrentOverallPsf(calculateOverallAveragePsf(data, reverted));
    setCurrentOverallAcPsf(calculateOverallAverageAcPsf(data, reverted));
    setIsOptimized(false);
    toast.success("Reverted to original pricing");
  };

  /* ------------- handlers ------------- */
  const handleTargetPsfChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setTargetPsf(parseFloat(e.target.value) || 0);

  return {
    isOptimizing,
    isOptimized,
    targetPsf,
    optimizationMode,
    currentOverallPsf,
    currentOverallAcPsf,
    setOptimizationMode,
    handleTargetPsfChange,
    runMegaOptimization,
    revertOptimization,
  };
};
