/*  src/components/mega-optimize/useOptimizer.ts
    Per-bedroom optimizer with immutable baseline support.
    Fixed: Direct PSF targeting and proper baseline revert.
*/
import { useState, useEffect, useCallback } from "react";
import {
  calculateOverallAveragePsf,
  calculateOverallAverageAcPsf,
  simulatePricing,
} from "@/utils/psfOptimizer";
import { toast } from "sonner";

type Baselines = {
  saPsf: Record<string, number>;
  acPsf: Record<string, number>;
};

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

  /* ------------- Calculate average premium for a bedroom type ------------- */
  const calculateAveragePremium = useCallback((
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
  }, [data, pricingConfig]);

  /* ------------- DIRECT SINGLE-BEDROOM OPTIMIZER ------------- */
  const optimizeSingleBedroom = useCallback((
    targetType: string,
    newTargetPsf: number,
    psfType: "sellArea" | "acArea" = "sellArea",
    baselines?: Baselines
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
      // Include baselines if provided and not already in config
      const newConfig = {
        ...pricingConfig,
        baselineAverages: pricingConfig.baselineAverages || baselines,
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
  }, [pricingConfig, data, onOptimized, calculateAveragePremium]);

  /* ------------- REVERT SINGLE BEDROOM TO IMMUTABLE BASELINE ------------- */
  const revertSingleBedroom = useCallback((type: string, baselines: Baselines) => {
    const bt = pricingConfig?.bedroomTypePricing?.find((b: any) => b.type === type);
    if (!bt) return;
    
    const psfType = pricingConfig.optimizePsfType || "sellArea";
    
    // Get the IMMUTABLE baseline average PSF for this type
    const baselineAvgPsf = psfType === "sellArea"
      ? baselines.saPsf[type]
      : baselines.acPsf[type];
    
    if (!baselineAvgPsf) {
      console.warn("No baseline found for type:", type);
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
    
    console.log("Revert to immutable baseline:", {
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
  }, [pricingConfig, data, onOptimized, calculateAveragePremium]);

  return {
    isOptimizing,
    isOptimized,
    currentOverallPsf,
    currentOverallAcPsf,
    optimizeSingleBedroom,
    revertSingleBedroom,
  };
};
