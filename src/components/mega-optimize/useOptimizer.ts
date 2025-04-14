import { useState, useEffect } from "react";
import { megaOptimizePsf, calculateOverallAveragePsf, fullOptimizePsf } from "@/utils/psfOptimizer";
import { toast } from "sonner";

export const useOptimizer = (data: any[], pricingConfig: any, onOptimized: (optimizedConfig: any) => void) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  const [currentOverallPsf, setCurrentOverallPsf] = useState(calculateOverallAveragePsf(data, pricingConfig));
  const [targetPsf, setTargetPsf] = useState(
    pricingConfig.targetOverallPsf || 
    pricingConfig.bedroomTypePricing.reduce(
      (sum: number, type: any) => sum + type.targetAvgPsf, 
      0
    ) / pricingConfig.bedroomTypePricing.length
  );
  const [optimizationMode, setOptimizationMode] = useState<"basePsf" | "allParams">("basePsf");
  
  // Recalculate current overall PSF whenever pricingConfig changes
  useEffect(() => {
    setCurrentOverallPsf(calculateOverallAveragePsf(data, pricingConfig));
    setIsOptimized(!!pricingConfig.isOptimized);
  }, [data, pricingConfig]);
  
  // Calculate average PSF per bedroom type using finalPsf only
  const calculateBedroomTypesAvgPsf = (config: any) => {
    // Group data by bedroom type
    const typeGroups: Record<string, any[]> = {};
    data.forEach((unit: any) => {
      if (!typeGroups[unit.type]) {
        typeGroups[unit.type] = [];
      }
      typeGroups[unit.type].push(unit);
    });
    
    // For each bedroom type, calculate statistics based solely on finalPsf
    const bedroomAvgData: Record<string, { 
      avgPsf: number, 
      avgSize: number, 
      unitCount: number 
    }> = {};
    
    config.bedroomTypePricing.forEach((typeConfig: any) => {
      const unitsOfType = typeGroups[typeConfig.type] || [];
      if (unitsOfType.length === 0) {
        bedroomAvgData[typeConfig.type] = { avgPsf: 0, avgSize: 0, unitCount: 0 };
        return;
      }
      
      const psfs: number[] = [];
      let totalArea = 0;
      
      // Loop through units and calculate finalPsf using the PricingSimulator logic
      unitsOfType.forEach((unit: any) => {
        const area = parseFloat(unit.sellArea) || 0;
        totalArea += area;
        
        const floorNum = parseInt(unit.floor) || 0;
        // Retrieve the view premium adjustment from config
        const viewPremium = config.viewPricing.find((v: any) => v.view === unit.view)?.psfAdjustment || 0;
        
        // Calculate floor premium using the defined floor rise rules
        let floorPremium = 0;
        config.floorRiseRules.forEach((rule: any) => {
          const ruleEndFloor = rule.endFloor === null ? 999 : rule.endFloor;
          if (floorNum >= rule.startFloor && floorNum <= ruleEndFloor) {
            const floorsFromStart = floorNum - rule.startFloor;
            const baseFloorPremium = floorsFromStart * rule.psfIncrement;
            let jumpPremium = 0;
            if (rule.jumpEveryFloor && rule.jumpIncrement) {
              const numJumps = Math.floor(floorsFromStart / rule.jumpEveryFloor);
              jumpPremium = numJumps * rule.jumpIncrement;
            }
            floorPremium = baseFloorPremium + jumpPremium;
          }
        });
        
        // Check for additional category adjustments
        let additionalCategoryAdjustment = 0;
        if (config.additionalCategoryPricing && config.additionalCategoryPricing.length > 0) {
          config.additionalCategoryPricing.forEach((catPricing: any) => {
            if (unit[`${catPricing.column}_value`] === catPricing.category) {
              additionalCategoryAdjustment += catPricing.psfAdjustment;
            }
          });
        }
        
        // Compute unit's base PSF (before rounding)
        const unitBasePsf = typeConfig.basePsf + floorPremium + viewPremium + additionalCategoryAdjustment;
        // Calculate total price for the unit
        const totalPrice = unitBasePsf * area;
        // Apply ceiling to total price to mimic final pricing
        const finalPrice = Math.ceil(totalPrice / 1000) * 1000;
        // Calculate final PSF based on ceiled price
        const finalPsf = area > 0 ? finalPrice / area : 0;
        psfs.push(finalPsf);
      });
      
      const avgPsf = psfs.reduce((sum, psf) => sum + psf, 0) / psfs.length;
      const avgSize = totalArea / unitsOfType.length;
      
      bedroomAvgData[typeConfig.type] = { 
        avgPsf,
        avgSize,
        unitCount: unitsOfType.length
      };
    });
    
    return bedroomAvgData;
  };
  
  const runMegaOptimization = async (selectedTypes: string[] = []) => {
    if (selectedTypes.length === 0) {
      toast.warning("Please select at least one bedroom type to optimize");
      return;
    }
    
    setIsOptimizing(true);
    
    try {
      // Simulate delay for UX feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Process floor rules: Ensure endFloor is set (default to 99 if null)
      const processedFloorRules = pricingConfig.floorRiseRules.map((rule: any) => ({
        ...rule,
        endFloor: rule.endFloor === null ? 99 : rule.endFloor
      }));
      
      const configWithProcessedRules = {
        ...pricingConfig,
        floorRiseRules: processedFloorRules
      };
      
      let result;
      let optimizedConfig;
      
      if (optimizationMode === "basePsf") {
        // Run standard bedroom PSF optimization – only for selected bedroom types
        result = megaOptimizePsf(data, configWithProcessedRules, targetPsf, selectedTypes);
        
        optimizedConfig = {
          ...pricingConfig,
          basePsf: pricingConfig.basePsf,
          bedroomTypePricing: pricingConfig.bedroomTypePricing.map((type: any) => {
            if (selectedTypes.includes(type.type)) {
              return {
                ...type,
                basePsf: result.optimizedParams.bedroomAdjustments[type.type] || type.basePsf,
                originalBasePsf: type.originalBasePsf || type.basePsf,
                targetAvgPsf: targetPsf,
                isOptimized: true
              };
            }
            return { ...type, isOptimized: false };
          }),
          viewPricing: pricingConfig.viewPricing,
          floorRiseRules: pricingConfig.floorRiseRules,
          // Keep additional category pricing unchanged
          additionalCategoryPricing: pricingConfig.additionalCategoryPricing,
          targetOverallPsf: targetPsf,
          isOptimized: true,
          optimizationMode: "basePsf",
          optimizedTypes: selectedTypes
        };
      } else {
        // Run full optimization including floor, view, and additional category adjustments
        result = fullOptimizePsf(data, configWithProcessedRules, targetPsf, selectedTypes);
        
        optimizedConfig = {
          ...pricingConfig,
          basePsf: pricingConfig.basePsf,
          bedroomTypePricing: pricingConfig.bedroomTypePricing.map((type: any) => {
            if (selectedTypes.includes(type.type)) {
              return {
                ...type,
                basePsf: result.optimizedParams.bedroomAdjustments[type.type] || type.basePsf,
                originalBasePsf: type.originalBasePsf || type.basePsf,
                targetAvgPsf: targetPsf,
                isOptimized: true
              };
            }
            return { ...type, isOptimized: false };
          }),
          viewPricing: pricingConfig.viewPricing.map((view: any) => {
            const isViewUsed = data.some((unit: any) => selectedTypes.includes(unit.type) && unit.view === view.view);
            if (isViewUsed && result.optimizedParams.viewAdjustments[view.view] !== undefined) {
              return {
                ...view,
                psfAdjustment: Math.max(0, result.optimizedParams.viewAdjustments[view.view]),
                originalPsfAdjustment: view.originalPsfAdjustment || view.psfAdjustment
              };
            }
            return view;
          }),
          // Update additional category pricing if available
          additionalCategoryPricing: pricingConfig.additionalCategoryPricing && 
            result.optimizedParams.additionalCategoryAdjustments ?
            pricingConfig.additionalCategoryPricing.map((cat: any) => {
              const adjustment = result.optimizedParams.additionalCategoryAdjustments?.[cat.column]?.[cat.category];
              if (adjustment !== undefined) {
                return {
                  ...cat,
                  psfAdjustment: adjustment,
                  originalPsfAdjustment: cat.originalPsfAdjustment || cat.psfAdjustment
                };
              }
              return cat;
            }) : 
            pricingConfig.additionalCategoryPricing,
          floorRiseRules: pricingConfig.originalFloorRiseRules 
            ? pricingConfig.floorRiseRules
            : [...pricingConfig.floorRiseRules],
          originalFloorRiseRules: pricingConfig.originalFloorRiseRules || pricingConfig.floorRiseRules,
          targetOverallPsf: targetPsf,
          isOptimized: true,
          optimizationMode: "allParams",
          optimizedTypes: selectedTypes
        };
      }
      
      // Recalculate bedroom type averages using finalPsf only (consistent with PricingSimulator)
      const avgDataByType = calculateBedroomTypesAvgPsf(optimizedConfig);
      
      optimizedConfig.bedroomTypePricing = optimizedConfig.bedroomTypePricing.map((type: any) => {
        const typeData = avgDataByType[type.type] || { avgPsf: 0, avgSize: 0, unitCount: 0 };
        return {
          ...type,
          avgPsf: typeData.avgPsf,
          avgSize: typeData.avgSize,
          unitCount: typeData.unitCount
        };
      });
      
      // Update overall pricing values and UI
      onOptimized(optimizedConfig);
      setCurrentOverallPsf(calculateOverallAveragePsf(data, optimizedConfig));
      setIsOptimized(true);
      
      toast.success(`Optimization complete for ${selectedTypes.length} bedroom type(s)`, {
        description: `Optimized to target PSF of ${targetPsf.toFixed(2)}`
      });
    } catch (error) {
      console.error("Optimization error:", error);
      toast.error("Optimization Failed", {
        description: "There was an error during the optimization process."
      });
    } finally {
      setIsOptimizing(false);
    }
  };
  
  const revertOptimization = () => {
    // Determine which bedroom types were optimized
    const optimizedTypes = pricingConfig.optimizedTypes || 
      pricingConfig.bedroomTypePricing.filter((type: any) => type.isOptimized).map((type: any) => type.type);
    
    // Revert configuration to original values
    const revertedConfig = {
      ...pricingConfig,
      bedroomTypePricing: pricingConfig.bedroomTypePricing.map((type: any) => ({
        ...type,
        basePsf: type.originalBasePsf || type.basePsf,
        isOptimized: false
      })),
      viewPricing: pricingConfig.viewPricing.map((view: any) => ({
        ...view,
        // Ensure we properly revert to original value (which might be 0)
        psfAdjustment: view.originalPsfAdjustment !== undefined ? view.originalPsfAdjustment : view.psfAdjustment,
      })),
      // Revert additional category pricing if it exists
      additionalCategoryPricing: pricingConfig.additionalCategoryPricing ? 
        pricingConfig.additionalCategoryPricing.map((cat: any) => ({
          ...cat,
          psfAdjustment: cat.originalPsfAdjustment !== undefined ? cat.originalPsfAdjustment : cat.psfAdjustment,
        })) : 
        pricingConfig.additionalCategoryPricing,
      floorRiseRules: pricingConfig.originalFloorRiseRules || pricingConfig.floorRiseRules,
      isOptimized: false,
      optimizedTypes: []
    };
    
    // Recalculate averages based on finalPsf only
    const avgDataByType = calculateBedroomTypesAvgPsf(revertedConfig);
    
    revertedConfig.bedroomTypePricing = revertedConfig.bedroomTypePricing.map((type: any) => {
      const typeData = avgDataByType[type.type] || { avgPsf: 0, avgSize: 0, unitCount: 0 };
      return {
        ...type,
        avgPsf: typeData.avgPsf,
        avgSize: typeData.avgSize,
        unitCount: typeData.unitCount
      };
    });
    
    onOptimized(revertedConfig);
    setCurrentOverallPsf(calculateOverallAveragePsf(data, revertedConfig));
    setIsOptimized(false);
    
    toast.success("Optimization reverted", {
      description: "All premium values have been restored to their original settings."
    });
  };
  
  const handleTargetPsfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTargetPsf(parseFloat(e.target.value) || 0);
  };
  
  return {
    isOptimizing,
    isOptimized,
    targetPsf,
    optimizationMode,
    currentOverallPsf,
    setOptimizationMode,
    handleTargetPsfChange,
    runMegaOptimization,
    revertOptimization
  };
};
