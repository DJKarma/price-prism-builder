/*  src/components/mega-optimize/useOptimizer.ts
 *  One‑shot optimiser for SA‑ or AC‑PSF
 */
import { useState, useEffect } from "react";
import {
  calculateOverallAveragePsf,
  calculateOverallAverageAcPsf,
} from "@/utils/psfOptimizer";
import { toast } from "sonner";

/* ---------------- helper to compute overall avg for either metric ---------------- */
const overallAvg = (
  data: any[],
  config: any,
  metric: "sellArea" | "acArea"
) =>
  metric === "sellArea"
    ? calculateOverallAveragePsf(data, config)
    : calculateOverallAverageAcPsf(data, config);

/* ---------------- hook ---------------- */
export const useOptimizer = (
  data: any[],
  pricingConfig: any,
  onOptimized: (optimized: any) => void
) => {
  /* state */
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);

  const [currentOverallPsf, setCurrentOverallPsf] = useState(
    calculateOverallAveragePsf(data, pricingConfig)
  );
  const [currentOverallAcPsf, setCurrentOverallAcPsf] = useState(
    calculateOverallAverageAcPsf(data, pricingConfig)
  );

  const initialTarget =
    pricingConfig.targetOverallPsf ||
    pricingConfig.bedroomTypePricing.reduce(
      (s: number, t: any) => s + t.targetAvgPsf,
      0
    ) / pricingConfig.bedroomTypePricing.length;

  const [targetPsf, setTargetPsf] = useState(initialTarget);
  const [optimizationMode, setOptimizationMode] = useState<
    "basePsf" | "allParams"
  >("basePsf");

  /* keep current PSFs in sync with upstream config */
  useEffect(() => {
    setCurrentOverallPsf(calculateOverallAveragePsf(data, pricingConfig));
    setCurrentOverallAcPsf(calculateOverallAverageAcPsf(data, pricingConfig));
    setIsOptimized(!!pricingConfig.isOptimized);
  }, [data, pricingConfig]);

  /* ---------- SIMPLE, CLOSED‑FORM OPTIMISER ---------- */
  const runMegaOptimization = async (
    selectedTypes: string[],
    psfType: "sellArea" | "acArea" = "sellArea"
  ) => {
    if (!selectedTypes.length) {
      toast.warning("Please select at least one bedroom type");
      return;
    }

    setIsOptimizing(true);
    try {
      /* 1. compute current overall & weighted area shares */
      const curOverall = overallAvg(data, pricingConfig, psfType);

      const totalArea = data.reduce(
        (s, u) => s + Number(u[psfType]),
        0
      );

      const selectedArea = data
        .filter((u) => selectedTypes.includes(u.type))
        .reduce((s, u) => s + Number(u[psfType]), 0);

      if (!totalArea || !selectedArea) {
        toast.error("Area data missing – optimisation aborted");
        return;
      }

      /* 2. delta that hits the target in ONE step */
      const delta = (targetPsf - curOverall) * (totalArea / selectedArea);

      /* 3. build new config */
      const newConfig = {
        ...pricingConfig,
        bedroomTypePricing: pricingConfig.bedroomTypePricing.map(
          (bt: any) => {
            if (!selectedTypes.includes(bt.type)) return bt;
            return {
              ...bt,
              originalBasePsf: bt.originalBasePsf ?? bt.basePsf,
              basePsf: Math.max(0, bt.basePsf + delta),
            };
          }
        ),
        isOptimized: true,
        optimizedTypes: selectedTypes,
        targetOverallPsf: targetPsf,
        optimizePsfType: psfType,
      };

      /* 4. update upstream (UI + store) */
      onOptimized(newConfig);
      setCurrentOverallPsf(calculateOverallAveragePsf(data, newConfig));
      setCurrentOverallAcPsf(calculateOverallAverageAcPsf(data, newConfig));
      setIsOptimized(true);

      toast.success(
        `Optimised to ${psfType === "sellArea" ? "SA" : "AC"} PSF ≈ ${targetPsf.toFixed(
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

  /* ---------- revert ---------- */
  const revertOptimization = () => {
    if (!pricingConfig.isOptimized) return;

    const reverted = {
      ...pricingConfig,
      bedroomTypePricing: pricingConfig.bedroomTypePricing.map((bt: any) => ({
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

  /* ---------- handlers ---------- */
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
