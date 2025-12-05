/*  src/components/mega-optimize/useOptimizer.ts
    Per-bedroom proportional optimizer with revert capability.
    Fixed: Direct PSF targeting and proper baseline revert.
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

  /* ------------- Calculate average premium for a bedroom type ------------- */
  const calculateAveragePremium = (
    type: string,
    psfType: "sellArea" | "acArea"
  ): number => {
    const pricedUnits = simulatePricing(data, pricingConfig);
    const targetUnits = pricedUnits.filter((u) => u.type === type);
    
    if (targetUnits.length === 0) return 0;
    
    const areaKey = psfType === "sellArea" ? "sellArea" : "acArea";
    
    // Calculate weighted average premium (view + floor + additional)
    let totalWeightedPremium = 0;
    let totalArea = 0;
    
    targetUnits.forEach((u) => {
      const area = parseFloat(u[areaKey]) || 0;
      if (area <= 0) return;
      
      const viewAdj = u.viewPsfAdjustment || 0;
      const floorAdj = u.floorAdjustment || 0;
      const addCatAdj = u.additionalAdjustment || 0;
      const premium = viewAdj + floorAdj + addCatAdj;
      
      totalWeightedPremium += premium * area;
      totalArea += area;
    });
    
    return totalArea > 0 ? totalWeightedPremium / totalArea : 0;
  };

  /* ------------- DIRECT SINGLE-BEDROOM OPTIMIZER ------------- */
  const optimizeSingleBedroom = (
    targetType: string,
    newTargetPsf: number,
    psfType: "sellArea" | "acArea" = "sellArea"
  ) => {
    setIsOptimizing(true);
    try {
      const bt = pricingConfig?.bedroomTypePricing?.find((b: any) => b.type === targetType);
      if (!bt) {
        toast.error(`Bedroom type ${targetType} not found`);
        setIsOptimizing(false);
        return;
      }
      
      // Calculate average premium for this type
      const avgPremium = calculateAveragePremium(targetType, psfType);
      
      // Direct calculation: required basePsf = target avg PSF - average premium
      const requiredBasePsf = Math.max(100, newTargetPsf - avgPremium);
      
      // Store original basePsf for revert if not already stored
      const originalBasePsf = bt.originalBasePsf ?? bt.basePsf;
      
      console.log("Single bedroom optimization (direct):", {
        targetType,
        newTargetPsf,
        avgPremium,
        requiredBasePsf,
        originalBasePsf,
      });
      
      // Build new config with direct basePsf adjustment
      const newConfig = {
        ...pricingConfig,
        bedroomTypePricing: pricingConfig.bedroomTypePricing.map((b: any) => {
          if (b.type === targetType) {
            return {
              ...b,
              originalBasePsf,
              basePsf: requiredBasePsf,
              targetAvgPsf: newTargetPsf,
            };
          }
          return b;
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

  /* ------------- REVERT SINGLE BEDROOM TO BASELINE ------------- */
  const revertSingleBedroom = (type: string) => {
    const bt = pricingConfig?.bedroomTypePricing?.find((b: any) => b.type === type);
    if (!bt) return;
    
    // Get baseline averages from config
    const baselineAverages = pricingConfig.baselineAverages;
    const psfType = pricingConfig.optimizePsfType || "sellArea";
    
    // Get the baseline average PSF for this type
    const baselineAvgPsf = psfType === "sellArea"
      ? baselineAverages?.saPsf?.[type]
      : baselineAverages?.acPsf?.[type];
    
    if (!baselineAvgPsf) {
      // Fallback to originalBasePsf if no baseline averages
      const fallbackBasePsf = bt.originalBasePsf ?? bt.basePsf;
      
      const newConfig = {
        ...pricingConfig,
        bedroomTypePricing: pricingConfig.bedroomTypePricing.map((b: any) => {
          if (b.type === type) {
            return {
              ...b,
              basePsf: fallbackBasePsf,
              originalBasePsf: undefined,
              targetAvgPsf: undefined,
            };
          }
          return b;
        }),
        optimizedTypes: (pricingConfig.optimizedTypes || []).filter((t: string) => t !== type),
      };
      
      const stillOptimized = newConfig.bedroomTypePricing.some(
        (b: any) => b.originalBasePsf !== undefined
      );
      newConfig.isOptimized = stillOptimized;
      
      onOptimized(newConfig);
      setCurrentOverallPsf(calculateOverallAveragePsf(data, newConfig));
      setCurrentOverallAcPsf(calculateOverallAverageAcPsf(data, newConfig));
      setIsOptimized(stillOptimized);
      return;
    }
    
    // Calculate average premium for this type to derive original basePsf
    const avgPremium = calculateAveragePremium(type, psfType);
    
    // Calculate what basePsf should be to achieve baseline average PSF
    const revertedBasePsf = Math.max(100, baselineAvgPsf - avgPremium);
    
    console.log("Revert to baseline:", {
      type,
      baselineAvgPsf,
      avgPremium,
      revertedBasePsf,
    });
    
    const newConfig = {
      ...pricingConfig,
      bedroomTypePricing: pricingConfig.bedroomTypePricing.map((b: any) => {
        if (b.type === type) {
          return {
            ...b,
            basePsf: revertedBasePsf,
            originalBasePsf: undefined,
            targetAvgPsf: undefined,
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
