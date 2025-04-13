
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
  
  const runMegaOptimization = async (selectedTypes: string[] = []) => {
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
      
      // Filter bedroom types if specific types are selected
      if (selectedTypes.length === 0) {
        // If no types are selected, default to all types
        selectedTypes = pricingConfig.bedroomTypePricing.map((type: any) => type.type);
      }
      
      let result;
      let optimizedConfig;
      
      if (optimizationMode === "basePsf") {
        // Run standard bedroom PSF optimization
        result = megaOptimizePsf(data, configWithProcessedRules, targetPsf, selectedTypes);
        
        // Create optimized config with only bedroom type changes
        optimizedConfig = {
          ...pricingConfig,
          basePsf: pricingConfig.basePsf, // Keep original base PSF
          bedroomTypePricing: pricingConfig.bedroomTypePricing.map((type: any) => {
            // Only optimize selected types
            if (selectedTypes.includes(type.type)) {
              return {
                ...type,
                basePsf: result.optimizedParams.bedroomAdjustments[type.type] || type.basePsf,
                originalBasePsf: type.originalBasePsf || type.basePsf // Store original value if not already stored
              };
            }
            return type; // Keep type as is if not selected for optimization
          }),
          viewPricing: pricingConfig.viewPricing, // Keep the original view pricing
          floorRiseRules: pricingConfig.floorRiseRules, // Keep the original floor rules
          targetOverallPsf: targetPsf,
          isOptimized: true,
          optimizationMode: "basePsf"
        };
      } else {
        // Run full optimization including floor rules and view adjustments
        result = fullOptimizePsf(data, configWithProcessedRules, targetPsf, selectedTypes);
        
        // Create optimized config with all parameter changes
        optimizedConfig = {
          ...pricingConfig,
          basePsf: pricingConfig.basePsf, // Keep original base PSF
          bedroomTypePricing: pricingConfig.bedroomTypePricing.map((type: any) => {
            // Only optimize selected types
            if (selectedTypes.includes(type.type)) {
              return {
                ...type,
                basePsf: result.optimizedParams.bedroomAdjustments[type.type] || type.basePsf,
                originalBasePsf: type.originalBasePsf || type.basePsf // Store original value if not already stored
              };
            }
            return type; // Keep type as is if not selected for optimization
          }),
          viewPricing: pricingConfig.viewPricing.map((view: any) => {
            // Check if this view is used by any of the selected bedroom types
            const isViewUsed = data.some((unit: any) => 
              selectedTypes.includes(unit.type) && unit.view === view.view
            );
            
            if (isViewUsed && result.optimizedParams.viewAdjustments[view.view] !== undefined) {
              return {
                ...view,
                psfAdjustment: result.optimizedParams.viewAdjustments[view.view],
                originalPsfAdjustment: view.originalPsfAdjustment || view.psfAdjustment
              };
            }
            return view; // Keep view as is if not used by selected bedroom types
          }),
          floorRiseRules: result.optimizedParams.floorRules || pricingConfig.floorRiseRules,
          originalFloorRiseRules: pricingConfig.originalFloorRiseRules || pricingConfig.floorRiseRules, // Store original floor rules
          targetOverallPsf: targetPsf,
          isOptimized: true,
          optimizationMode: "allParams"
        };
      }
      
      // Update UI and recalculate current PSF
      onOptimized(optimizedConfig);
      setCurrentOverallPsf(calculateOverallAveragePsf(data, optimizedConfig));
      setIsOptimized(true);
      
      // Determine optimization type message
      const optimizationTypeMsg = selectedTypes.length > 0 
        ? `for ${selectedTypes.length} bedroom types` 
        : "for all bedroom types";
      
      toast.success(`Optimization complete ${optimizationTypeMsg}`, {
        description: `Optimized from ${result.initialAvgPsf.toFixed(2)} to ${result.finalAvgPsf.toFixed(2)} PSF`
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
    // Create reverted config
    const revertedConfig = {
      ...pricingConfig,
      bedroomTypePricing: pricingConfig.bedroomTypePricing.map((type: any) => ({
        ...type,
        basePsf: type.originalBasePsf || type.basePsf
      })),
      viewPricing: pricingConfig.viewPricing.map((view: any) => ({
        ...view,
        psfAdjustment: view.originalPsfAdjustment || view.psfAdjustment
      })),
      // Revert floor rise rules if they were optimized
      floorRiseRules: pricingConfig.originalFloorRiseRules || pricingConfig.floorRiseRules,
      isOptimized: false
    };
    
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
