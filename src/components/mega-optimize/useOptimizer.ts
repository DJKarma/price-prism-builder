
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
  if (!data || !Array.isArray(data) || data.length === 0 || !config) {
    return 0;
  }
  
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

  // Check if data and pricingConfig are valid before calculating
  const initialPsf = Array.isArray(data) && data.length > 0 && pricingConfig
    ? calculateOverallAveragePsf(data, pricingConfig)
    : 0;
    
  const initialAcPsf = Array.isArray(data) && data.length > 0 && pricingConfig
    ? calculateOverallAverageAcPsf(data, pricingConfig)
    : 0;

  const [currentOverallPsf, setCurrentOverallPsf] = useState(initialPsf);
  const [currentOverallAcPsf, setCurrentOverallAcPsf] = useState(initialAcPsf);

  const defaultTarget = pricingConfig?.targetOverallPsf ||
    (pricingConfig?.bedroomTypePricing && Array.isArray(pricingConfig.bedroomTypePricing)
      ? pricingConfig.bedroomTypePricing.reduce(
          (s: number, t: any) => s + (t?.targetAvgPsf || 0),
          0
        ) / Math.max(pricingConfig.bedroomTypePricing.length, 1)
      : 0);

  const [targetPsf, setTargetPsf] = useState(defaultTarget || 1000);
  const [optimizationMode, setOptimizationMode] = useState<
    "basePsf" | "allParams"
  >("basePsf");

  /* keep current numbers in sync with latest config */
  useEffect(() => {
    if (Array.isArray(data) && data.length > 0 && pricingConfig) {
      setCurrentOverallPsf(calculateOverallAveragePsf(data, pricingConfig));
      setCurrentOverallAcPsf(calculateOverallAverageAcPsf(data, pricingConfig));
      setIsOptimized(!!pricingConfig.isOptimized);
    } else {
      setCurrentOverallPsf(0);
      setCurrentOverallAcPsf(0);
      setIsOptimized(false);
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
    
    if (!Array.isArray(data) || data.length === 0 || !pricingConfig || !pricingConfig.bedroomTypePricing) {
      toast.error("Invalid data or pricing configuration");
      return;
    }

    setIsOptimizing(true);
    try {
      /* Current overall */
      const curOverall = overallAvg(data, pricingConfig, psfType);

      /* Areas */
      const totalSellArea = data.reduce((s, u) => s + Number(u.sellArea || 0), 0);
      const totalAcArea = data.reduce((s, u) => s + Number(u.acArea || 0), 0);

      const selectedSellArea = data
        .filter((u) => selectedTypes.includes(u.type))
        .reduce((s, u) => s + Number(u.sellArea || 0), 0);

      if (!selectedSellArea) {
        toast.error("Selected bedroom types have zero sell area");
        setIsOptimizing(false);
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
        bedroomTypePricing: pricingConfig.bedroomTypePricing.map((bt: any) => {
          if (!bt || !selectedTypes.includes(bt.type)) return bt;
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
    if (!pricingConfig || !pricingConfig.isOptimized) return;

    const reverted = {
      ...pricingConfig,
      bedroomTypePricing: (pricingConfig.bedroomTypePricing || []).map((bt: any) => {
        if (!bt) return bt;
        return {
          ...bt,
          basePsf: bt.originalBasePsf ?? bt.basePsf,
        };
      }),
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
