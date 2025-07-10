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
) =>
  metric === "sellArea"
    ? calculateOverallAveragePsf(data, config)
    : calculateOverallAverageAcPsf(data, config);

export const useOptimizer = (
  data: any[],
  pricingConfig: any,
  onOptimized: (cfg: any) => void
) => {
  /* ------------- state ------------- */
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);

  const [currentOverallPsf, setCurrentOverallPsf] = useState(
    calculateOverallAveragePsf(data, pricingConfig)
  );
  const [currentOverallAcPsf, setCurrentOverallAcPsf] = useState(
    calculateOverallAverageAcPsf(data, pricingConfig)
  );

  const defaultTarget =
    pricingConfig.targetOverallPsf ||
    pricingConfig.bedroomTypePricing.reduce(
      (s: number, t: any) => s + t.targetAvgPsf,
      0
    ) / pricingConfig.bedroomTypePricing.length;

  const [targetPsf, setTargetPsf] = useState(defaultTarget);
  const [optimizationMode, setOptimizationMode] = useState<
    "basePsf" | "allParams"
  >("basePsf");

  /* keep current numbers in sync with latest config */
  useEffect(() => {
    setCurrentOverallPsf(calculateOverallAveragePsf(data, pricingConfig));
    setCurrentOverallAcPsf(calculateOverallAverageAcPsf(data, pricingConfig));
    setIsOptimized(!!pricingConfig.isOptimized);
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

    setIsOptimizing(true);
    try {
      /* Determine if optimizing subset or all types */
      const allBedroomTypes = pricingConfig.bedroomTypePricing.map((bt: any) => bt.type);
      const isSubsetOptimization = selectedTypes.length < allBedroomTypes.length;
      
      let newConfig;
      
      if (isSubsetOptimization) {
        /* SUBSET OPTIMIZATION: Adjust only selected types so their average PSF meets target */
        
        /* Get current PSF for selected types */
        const selectedUnits = data.filter((u) => selectedTypes.includes(u.type));
        const selectedArea = selectedUnits.reduce((s, u) => s + Number(psfType === "sellArea" ? u.sellArea : u.acArea), 0);
        const selectedValue = selectedUnits.reduce((s, u) => s + u.finalTotalPrice, 0);
        
        if (!selectedArea) {
          toast.error("Selected bedroom types have zero area");
          return;
        }
        
        const currentSelectedPsf = selectedValue / selectedArea;
        const delta = targetPsf - currentSelectedPsf;
        
        newConfig = {
          ...pricingConfig,
          bedroomTypePricing: pricingConfig.bedroomTypePricing.map((bt: any) => {
            if (!selectedTypes.includes(bt.type)) return bt;
            return {
              ...bt,
              originalBasePsf: bt.originalBasePsf ?? bt.basePsf,
              basePsf: Math.max(0, bt.basePsf + delta),
              targetAvgPsf: targetPsf, // Update visual feedback
            };
          }),
          isOptimized: true,
          optimizedTypes: selectedTypes,
          targetOverallPsf: targetPsf,
          optimizePsfType: psfType,
          optimizationMode,
        };
        
      } else {
        /* ALL TYPES OPTIMIZATION: Use existing overall optimizer logic */
        
        const curOverall = overallAvg(data, pricingConfig, psfType);
        const delta = targetPsf - curOverall;
        
        if (optimizationMode === "basePsf") {
          /* Base PSF only */
          newConfig = {
            ...pricingConfig,
            bedroomTypePricing: pricingConfig.bedroomTypePricing.map((bt: any) => ({
              ...bt,
              originalBasePsf: bt.originalBasePsf ?? bt.basePsf,
              basePsf: Math.max(0, bt.basePsf + delta),
              targetAvgPsf: targetPsf, // Update visual feedback
            })),
            isOptimized: true,
            optimizedTypes: selectedTypes,
            targetOverallPsf: targetPsf,
            optimizePsfType: psfType,
            optimizationMode: "basePsf",
          };
        } else {
          /* All Parameters - proportional adjustment */
          const adjustmentFactor = targetPsf / curOverall;
          
          newConfig = {
            ...pricingConfig,
            bedroomTypePricing: pricingConfig.bedroomTypePricing.map((bt: any) => ({
              ...bt,
              originalBasePsf: bt.originalBasePsf ?? bt.basePsf,
              basePsf: Math.max(0, bt.basePsf + delta),
              targetAvgPsf: targetPsf, // Update visual feedback
            })),
            viewPricing: pricingConfig.viewPricing?.map((vp: any) => ({
              ...vp,
              originalPsfAdjustment: vp.originalPsfAdjustment ?? vp.psfAdjustment,
              psfAdjustment: vp.psfAdjustment * adjustmentFactor,
            })) || [],
            additionalCategoryPricing: pricingConfig.additionalCategoryPricing?.map((acp: any) => ({
              ...acp,
              originalPsfAdjustment: acp.originalPsfAdjustment ?? acp.psfAdjustment,
              psfAdjustment: acp.psfAdjustment * adjustmentFactor,
            })) || [],
            isOptimized: true,
            optimizedTypes: selectedTypes,
            targetOverallPsf: targetPsf,
            optimizePsfType: psfType,
            optimizationMode: "allParams",
          };
        }
      }

      /* push up */
      onOptimized(newConfig);
      setCurrentOverallPsf(calculateOverallAveragePsf(data, newConfig));
      setCurrentOverallAcPsf(calculateOverallAverageAcPsf(data, newConfig));
      setIsOptimized(true);

      toast.success(
        `Now at ${psfType === "sellArea" ? "SA" : "AC"} PSF ≈ ${targetPsf.toFixed(
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
    if (!pricingConfig.isOptimized) return;

    const reverted = {
      ...pricingConfig,
      bedroomTypePricing: pricingConfig.bedroomTypePricing.map((bt: any) => ({
        ...bt,
        basePsf: bt.originalBasePsf ?? bt.basePsf,
      })),
      /* Revert view pricing if it was modified in "All Parameters" mode */
      viewPricing: pricingConfig.viewPricing?.map((vp: any) => ({
        ...vp,
        psfAdjustment: vp.originalPsfAdjustment ?? vp.psfAdjustment,
      })) || pricingConfig.viewPricing,
      /* Revert additional category pricing if it was modified */
      additionalCategoryPricing: pricingConfig.additionalCategoryPricing?.map((acp: any) => ({
        ...acp,
        psfAdjustment: acp.originalPsfAdjustment ?? acp.psfAdjustment,
      })) || pricingConfig.additionalCategoryPricing,
      isOptimized: false,
      optimizedTypes: [],
      optimizationMode: undefined,
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
