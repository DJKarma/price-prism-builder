
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
  
  // Recalculate current PSF whenever pricingConfig changes
  useEffect(() => {
    setCurrentOverallPsf(calculateOverallAveragePsf(data, pricingConfig));
    setIsOptimized(!!pricingConfig.isOptimized);
  }, [data, pricingConfig]);
  
  // Calculate average PSF per bedroom type - using same method as PricingSummary
  const calculateBedroomTypesAvgPsf = (config: any) => {
    // Group data by bedroom type
    const typeGroups: Record<string, any[]> = {};
    data.forEach((unit: any) => {
      if (!typeGroups[unit.type]) {
        typeGroups[unit.type] = [];
      }
      typeGroups[unit.type].push(unit);
    });
    
    // For each bedroom type, calculate statistics including min/avg/max PSF
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
      
      // Initialize arrays to collect values for min/max/avg calculations
      const psfs: number[] = [];
      let totalArea = 0;
      
      // Calculate final PSF for each unit using same method as PricingSummary
      unitsOfType.forEach((unit: any) => {
        const area = parseFloat(unit.sellArea) || 0;
        totalArea += area;
        
        const floorNum = parseInt(unit.floor) || 0;
        const viewPremium = config.viewPricing.find((v: any) => v.view === unit.view)?.psfAdjustment || 0;
        
        // Calculate floor premium
        let floorPremium = 0;
        config.floorRiseRules.forEach((rule: any) => {
          const ruleEndFloor = rule.endFloor === null ? 999 : rule.endFloor;
          if (floorNum >= rule.startFloor && floorNum <= ruleEndFloor) {
            const floorsFromStart = floorNum - rule.startFloor;
            const baseFloorPremium = floorsFromStart * rule.psfIncrement;
            
            // Add jump premium if applicable
            let jumpPremium = 0;
            if (rule.jumpEveryFloor && rule.jumpIncrement) {
              const numJumps = Math.floor(floorsFromStart / rule.jumpEveryFloor);
              jumpPremium = numJumps * rule.jumpIncrement;
            }
            
            floorPremium = baseFloorPremium + jumpPremium;
          }
        });
        
        // Calculate the final PSF with all premiums
        const unitBasePsf = typeConfig.basePsf + floorPremium + viewPremium;
        
        // Calculate total price and apply ceiling to match PricingSummary
        const totalPrice = unitBasePsf * area;
        const finalPrice = Math.ceil(totalPrice / 1000) * 1000;
        
        // Calculate final PSF based on ceiled price (same as PricingSummary)
        const finalPsf = area > 0 ? finalPrice / area : 0;
        psfs.push(finalPsf);
      });
      
      // Calculate average PSF - exactly like PricingSummary does
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
      
      // Process floor rules to ensure endFloor is properly handled
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
        // Run standard bedroom PSF optimization - only for selected bedroom types
        result = megaOptimizePsf(data, configWithProcessedRules, targetPsf, selectedTypes);
        
        // Create optimized config with only selected bedroom type changes
        optimizedConfig = {
          ...pricingConfig,
          basePsf: pricingConfig.basePsf, // Keep original base PSF
          bedroomTypePricing: pricingConfig.bedroomTypePricing.map((type: any) => {
            // Only optimize selected types
            if (selectedTypes.includes(type.type)) {
              return {
                ...type,
                basePsf: result.optimizedParams.bedroomAdjustments[type.type] || type.basePsf,
                originalBasePsf: type.originalBasePsf || type.basePsf, // Store original value if not already stored
                targetAvgPsf: targetPsf, // Set target PSF from the optimization target
                isOptimized: true
              };
            }
            return {
              ...type,
              isOptimized: false
            }; // Keep type as is if not selected for optimization
          }),
          viewPricing: pricingConfig.viewPricing, // Keep the original view pricing
          floorRiseRules: pricingConfig.floorRiseRules, // Keep the original floor rules
          targetOverallPsf: targetPsf,
          isOptimized: true,
          optimizationMode: "basePsf",
          optimizedTypes: selectedTypes
        };
      } else {
        // Run full optimization including floor rules and view adjustments - only for selected bedroom types
        result = fullOptimizePsf(data, configWithProcessedRules, targetPsf, selectedTypes);
        
        // Create optimized config with all parameter changes but only for selected bedroom types
        optimizedConfig = {
          ...pricingConfig,
          basePsf: pricingConfig.basePsf, // Keep original base PSF
          bedroomTypePricing: pricingConfig.bedroomTypePricing.map((type: any) => {
            // Only optimize selected types
            if (selectedTypes.includes(type.type)) {
              return {
                ...type,
                basePsf: result.optimizedParams.bedroomAdjustments[type.type] || type.basePsf,
                originalBasePsf: type.originalBasePsf || type.basePsf, // Store original value if not already stored
                targetAvgPsf: targetPsf, // Set target PSF from the optimization target
                isOptimized: true
              };
            }
            return {
              ...type,
              isOptimized: false
            }; // Keep type as is if not selected for optimization
          }),
          viewPricing: pricingConfig.viewPricing.map((view: any) => {
            // Check if this view is used by any of the selected bedroom types
            const isViewUsed = data.some((unit: any) => 
              selectedTypes.includes(unit.type) && unit.view === view.view
            );
            
            if (isViewUsed && result.optimizedParams.viewAdjustments[view.view] !== undefined) {
              return {
                ...view,
                psfAdjustment: Math.max(0, result.optimizedParams.viewAdjustments[view.view]), // Prevent negative values
                originalPsfAdjustment: view.originalPsfAdjustment || view.psfAdjustment
              };
            }
            return view; // Keep view as is if not used by selected bedroom types
          }),
          floorRiseRules: pricingConfig.originalFloorRiseRules 
            ? pricingConfig.floorRiseRules
            : [...pricingConfig.floorRiseRules],
          originalFloorRiseRules: pricingConfig.originalFloorRiseRules || pricingConfig.floorRiseRules, // Store original floor rules
          targetOverallPsf: targetPsf,
          isOptimized: true,
          optimizationMode: "allParams",
          optimizedTypes: selectedTypes
        };
      }
      
      // Calculate average PSF and size values for each bedroom type after optimization
      // Using the consistent calculation method
      const avgDataByType = calculateBedroomTypesAvgPsf(optimizedConfig);
      
      // Add avgPsf and avgSize to bedroom types in the optimized config
      optimizedConfig.bedroomTypePricing = optimizedConfig.bedroomTypePricing.map((type: any) => {
        const typeData = avgDataByType[type.type] || { avgPsf: 0, avgSize: 0, unitCount: 0 };
        return {
          ...type,
          avgPsf: typeData.avgPsf,
          avgSize: typeData.avgSize,
          unitCount: typeData.unitCount
        };
      });
      
      // Update UI and recalculate current PSF
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
    // Get the list of previously optimized types
    const optimizedTypes = pricingConfig.optimizedTypes || 
      pricingConfig.bedroomTypePricing.filter((type: any) => type.isOptimized).map((type: any) => type.type);
    
    // Create reverted config
    const revertedConfig = {
      ...pricingConfig,
      bedroomTypePricing: pricingConfig.bedroomTypePricing.map((type: any) => ({
        ...type,
        basePsf: type.originalBasePsf || type.basePsf,
        isOptimized: false
      })),
      viewPricing: pricingConfig.viewPricing.map((view: any) => ({
        ...view,
        psfAdjustment: view.originalPsfAdjustment || view.psfAdjustment
      })),
      // Revert floor rise rules if they were optimized
      floorRiseRules: pricingConfig.originalFloorRiseRules || pricingConfig.floorRiseRules,
      isOptimized: false,
      optimizedTypes: []
    };
    
    // Calculate average PSF and size values for each bedroom type after reversion
    const avgDataByType = calculateBedroomTypesAvgPsf(revertedConfig);
    
    // Add avgPsf and avgSize to bedroom types in the reverted config
    revertedConfig.bedroomTypePricing = revertedConfig.bedroomTypePricing.map((type: any) => {
      const typeData = avgDataByType[type.type] || { avgPsf: 0, avgSize: 0, unitCount: 0 };
      return {
        ...type,
        avgPsf: typeData.avgPsf,
        avgSize: typeData.avgSize,
        unitCount: typeData.unitCount
      };
    });
    
    // Update UI and recalculate current PSF
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
