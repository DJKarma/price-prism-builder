
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
  
  // Calculate average PSF per bedroom type - using EXACTLY same method as PricingSummary
  const calculateBedroomTypesAvgPsf = (data: any[], config: any) => {
    // Group by bedroom type
    const typeMap: Record<string, any[]> = {};
    
    data.forEach((unit) => {
      if (!unit.type) return;
      
      if (!typeMap[unit.type]) {
        typeMap[unit.type] = [];
      }
      
      typeMap[unit.type].push(unit);
    });
    
    // Calculate statistics for each bedroom type using finalPsf values only
    const bedroomStats: Record<string, any> = {};
    
    Object.entries(typeMap).forEach(([type, units]) => {
      // Extract values for calculations - use only finalPsf for PSF calculations
      const psfs = units.map((unit) => unit.finalPsf || 0).filter(Boolean);
      const sizes = units.map((unit) => parseFloat(unit.sellArea) || 0).filter(Boolean);
      
      // Calculate stats - same method as PricingSummary
      bedroomStats[type] = {
        avgPsf: psfs.length > 0 ? psfs.reduce((sum, psf) => sum + psf, 0) / psfs.length : 0,
        avgSize: sizes.length > 0 ? sizes.reduce((sum, size) => sum + size, 0) / sizes.length : 0,
        unitCount: units.length
      };
    });
    
    return bedroomStats;
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
                targetAvgPsf: targetPsf, // Set target PSF from the optimization target for selected types
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
                targetAvgPsf: targetPsf, // Set target PSF from the optimization target for selected types
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
      
      // Calculate average PSF values for each bedroom type using the PricingSummary method
      const bedroomStats = calculateBedroomTypesAvgPsf(data, optimizedConfig);
      
      // Add these values to the bedroom types in the config
      optimizedConfig.bedroomTypePricing = optimizedConfig.bedroomTypePricing.map((type: any) => {
        const stats = bedroomStats[type.type] || { avgPsf: 0, avgSize: 0, unitCount: 0 };
        return {
          ...type,
          avgPsf: stats.avgPsf,
          avgSize: stats.avgSize,
          unitCount: stats.unitCount
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
    
    // Calculate average PSF values for each bedroom type using the PricingSummary method
    const bedroomStats = calculateBedroomTypesAvgPsf(data, revertedConfig);
    
    // Add these values to the bedroom types in the config
    revertedConfig.bedroomTypePricing = revertedConfig.bedroomTypePricing.map((type: any) => {
      const stats = bedroomStats[type.type] || { avgPsf: 0, avgSize: 0, unitCount: 0 };
      return {
        ...type,
        avgPsf: stats.avgPsf,
        avgSize: stats.avgSize,
        unitCount: stats.unitCount
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
