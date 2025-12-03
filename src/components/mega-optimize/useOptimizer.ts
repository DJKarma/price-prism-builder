/*  src/components/mega-optimize/useOptimizer.ts
    Per-bedroom proportional optimizer with revert capability.
*/
import { useState, useEffect } from "react";
import {
  calculateOverallAveragePsf,
  calculateOverallAverageAcPsf,
  simulatePricing,
} from "@/utils/psfOptimizer";
import { toast } from "sonner";

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

  /* keep current numbers in sync with latest config */
  useEffect(() => {
    setCurrentOverallPsf(calculateOverallAveragePsf(data, pricingConfig));
    setCurrentOverallAcPsf(calculateOverallAverageAcPsf(data, pricingConfig));
    setIsOptimized(!!pricingConfig.isOptimized);
  }, [data, pricingConfig]);

  /* ------------- Get original base PSF ------------- */
  const getOriginalBasePsf = (type: string): number | null => {
    const bt = pricingConfig?.bedroomTypePricing?.find((b: any) => b.type === type);
    if (!bt) return null;
    if (bt.originalBasePsf !== undefined && bt.originalBasePsf !== bt.basePsf) {
      return bt.originalBasePsf;
    }
    return null;
  };

  /* ------------- PROPORTIONAL SINGLE-BEDROOM OPTIMIZER ------------- */
  const optimizeSingleBedroom = (
    targetType: string,
    newTargetPsf: number,
    psfType: "sellArea" | "acArea" = "sellArea"
  ) => {
    setIsOptimizing(true);
    try {
      // Get current simulated prices
      const currentPricedUnits = simulatePricing(data, pricingConfig);
      
      // Calculate current weighted PSF for the target type
      const targetUnits = currentPricedUnits.filter((u) => u.type === targetType);
      const areaKey = psfType === "sellArea" ? "sellArea" : "acArea";
      
      const targetArea = targetUnits.reduce((s, u) => s + Number(u[areaKey] || 0), 0);
      const targetValue = targetUnits.reduce((s, u) => s + u.finalTotalPrice, 0);
      
      if (!targetArea || targetArea === 0) {
        toast.error(`${targetType} has zero area`);
        setIsOptimizing(false);
        return;
      }
      
      const currentTargetPsf = targetValue / targetArea;
      
      // Calculate proportional adjustment factor for this type
      const adjustmentFactor = newTargetPsf / currentTargetPsf;
      
      // Calculate current overall PSF
      const currentOverall = psfType === "sellArea" 
        ? calculateOverallAveragePsf(data, pricingConfig)
        : calculateOverallAverageAcPsf(data, pricingConfig);
      
      // Calculate target type's weight in overall PSF
      const allUnits = currentPricedUnits.filter(u => Number(u[areaKey]) > 0 && u.finalTotalPrice > 0);
      const totalArea = allUnits.reduce((s, u) => s + Number(u[areaKey]), 0);
      const targetWeight = targetArea / totalArea;
      
      // Calculate what overall PSF would be after changing only target type
      const newTargetValue = targetArea * newTargetPsf;
      const otherValue = allUnits
        .filter(u => u.type !== targetType)
        .reduce((s, u) => s + u.finalTotalPrice, 0);
      const otherArea = totalArea - targetArea;
      
      // New overall if only target changed
      const projectedOverall = (newTargetValue + otherValue) / totalArea;
      
      // Calculate compensation factor for OTHER types to maintain equilibrium
      const targetDelta = newTargetValue - targetValue;
      const compensationNeeded = -targetDelta; // Need to offset this from other types
      
      // Calculate compensation factor for other types
      let otherCompensationFactor = 1;
      if (otherValue > 0 && Math.abs(compensationNeeded) > 0.01) {
        otherCompensationFactor = (otherValue + compensationNeeded) / otherValue;
        // Clamp to reasonable range
        otherCompensationFactor = Math.max(0.5, Math.min(1.5, otherCompensationFactor));
      }
      
      console.log("Single bedroom optimization:", {
        targetType,
        currentTargetPsf,
        newTargetPsf,
        adjustmentFactor,
        currentOverall,
        projectedOverall,
        targetWeight,
        otherCompensationFactor
      });
      
      // Build new config with proportional adjustments
      const newConfig = {
        ...pricingConfig,
        bedroomTypePricing: pricingConfig.bedroomTypePricing.map((bt: any) => {
          const originalBasePsf = bt.originalBasePsf ?? bt.basePsf;
          
          if (bt.type === targetType) {
            // Apply direct adjustment to target type
            return {
              ...bt,
              originalBasePsf,
              basePsf: Math.max(100, bt.basePsf * adjustmentFactor),
              targetAvgPsf: newTargetPsf,
            };
          } else {
            // Apply compensation to other types to maintain overall equilibrium
            return {
              ...bt,
              originalBasePsf,
              basePsf: Math.max(100, bt.basePsf * otherCompensationFactor),
            };
          }
        }),
        isOptimized: true,
        optimizedTypes: [...(pricingConfig.optimizedTypes || []), targetType].filter(
          (v, i, a) => a.indexOf(v) === i
        ),
        optimizePsfType: psfType,
      };
      
      // Push update
      onOptimized(newConfig);
      setCurrentOverallPsf(calculateOverallAveragePsf(data, newConfig));
      setCurrentOverallAcPsf(calculateOverallAverageAcPsf(data, newConfig));
      setIsOptimized(true);
      
    } catch (err) {
      console.error(err);
      toast.error("Optimization failed");
    } finally {
      setIsOptimizing(false);
    }
  };

  /* ------------- REVERT SINGLE BEDROOM ------------- */
  const revertSingleBedroom = (type: string) => {
    const bt = pricingConfig?.bedroomTypePricing?.find((b: any) => b.type === type);
    if (!bt || bt.originalBasePsf === undefined) return;
    
    const newConfig = {
      ...pricingConfig,
      bedroomTypePricing: pricingConfig.bedroomTypePricing.map((b: any) => {
        if (b.type === type) {
          return {
            ...b,
            basePsf: b.originalBasePsf,
            originalBasePsf: undefined,
            targetAvgPsf: b.originalBasePsf,
          };
        }
        return b;
      }),
      optimizedTypes: (pricingConfig.optimizedTypes || []).filter((t: string) => t !== type),
    };
    
    // Check if any types are still optimized
    const stillOptimized = newConfig.bedroomTypePricing.some(
      (b: any) => b.originalBasePsf !== undefined
    );
    newConfig.isOptimized = stillOptimized;
    
    onOptimized(newConfig);
    setCurrentOverallPsf(calculateOverallAveragePsf(data, newConfig));
    setCurrentOverallAcPsf(calculateOverallAverageAcPsf(data, newConfig));
    setIsOptimized(stillOptimized);
  };

  return {
    isOptimizing,
    isOptimized,
    currentOverallPsf,
    currentOverallAcPsf,
    optimizeSingleBedroom,
    revertSingleBedroom,
    getOriginalBasePsf,
  };
};
