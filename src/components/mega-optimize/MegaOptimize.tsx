import React, { useEffect, useState } from "react";
import { Info, Sparkles } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { MegaOptimizeProps } from "./types";
import { useOptimizer } from "./useOptimizer";
import OptimizationControls from "./OptimizationControls";
import OptimizationModeSelector from "./OptimizationModeSelector";
import BedroomTypeSummary from "./BedroomTypeSummary";

const MegaOptimize: React.FC<MegaOptimizeProps> = ({ 
  data, 
  pricingConfig, 
  onOptimized 
}) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    pricingConfig.bedroomTypePricing.map((type: any) => type.type)
  );

  const {
    isOptimizing,
    isOptimized,
    targetPsf,
    optimizationMode,
    currentOverallPsf,
    setOptimizationMode,
    handleTargetPsfChange,
    runMegaOptimization,
    revertOptimization
  } = useOptimizer(data, pricingConfig, onOptimized);

  // Calculate bedroom type average PSF values for display
  const bedroomTypeData = React.useMemo(() => {
    console.log("Calculating bedroomTypeData in MegaOptimize");
    
    // Group data by bedroom type
    const typeGroups: Record<string, any[]> = {};
    data.forEach(unit => {
      if (!typeGroups[unit.type]) {
        typeGroups[unit.type] = [];
      }
      typeGroups[unit.type].push(unit);
    });
    
    // Calculate metrics for each bedroom type
    return pricingConfig.bedroomTypePricing.map((type: any) => {
      const unitsOfType = typeGroups[type.type] || [];
      const unitCount = unitsOfType.length;
      
      // Calculate average size using the correct property
      const totalArea = unitsOfType.reduce((sum: number, unit: any) => {
        const area = parseFloat(unit.sellArea) || 0;
        console.log(`Unit ${unit.name} type ${unit.type} has sellArea: ${area}`);
        return sum + area;
      }, 0);
      
      const avgSize = unitCount > 0 ? totalArea / unitCount : 0;
      console.log(`Bedroom type ${type.type}: unitCount=${unitCount}, totalArea=${totalArea}, avgSize=${avgSize}`);
      
      // Calculate current average PSF
      let totalPsf = 0;
      unitsOfType.forEach((unit: any) => {
        const floorNum = parseInt(unit.floor) || 0;
        const viewPremium = pricingConfig.viewPricing.find((v: any) => v.view === unit.view)?.psfAdjustment || 0;
        
        // Calculate floor premium
        let floorPremium = 0;
        pricingConfig.floorRiseRules.forEach((rule: any) => {
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
        
        // Calculate total PSF for this unit
        const unitPsf = type.basePsf + floorPremium + viewPremium;
        totalPsf += unitPsf;
      });
      
      const avgPsf = unitCount > 0 ? totalPsf / unitCount : 0;
      
      // Return the result with explicit values to aid debugging
      const result = {
        ...type,
        unitCount,
        avgSize,
        avgPsf
      };
      
      console.log(`Final bedroom type data for ${type.type}:`, result);
      return result;
    });
  }, [data, pricingConfig]);

  // Handle selected types changes from BedroomTypeSummary
  const handleTypesChange = (types: string[]) => {
    setSelectedTypes(types);
    toast.info(`Selected ${types.length} bedroom types for optimization`);
  };
  
  // Run optimization with selected types
  const handleRunOptimization = () => {
    toast.promise(
      new Promise(resolve => {
        runMegaOptimization(selectedTypes);
        // Simulate promise for toast
        setTimeout(resolve, 1000);
      }),
      {
        loading: "Optimizing pricing...",
        success: `Optimization complete for ${selectedTypes.length} bedroom types`,
        error: "Optimization failed"
      }
    );
  };

  // Handle revert with toast
  const handleRevert = () => {
    revertOptimization();
    toast.success("Optimization reverted successfully");
  };
  
  return (
    <Card className="mb-6 border-2 border-indigo-100 w-full">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-6 w-6 text-indigo-500" />
              Pricing Optimization & Summary
            </CardTitle>
            <CardDescription className="text-indigo-700">
              Configure optimization targets and view property type breakdown
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full h-8 w-8"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px]">
                <p>
                  Mega Optimize uses advanced constrained gradient descent to adjust 
                  premium values to achieve your target PSF 
                  while minimizing changes from the original values.
                </p>
              </TooltipContent>
            </Tooltip>
            
            {isOptimized && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Optimized
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column: Optimization controls */}
          <div className="lg:col-span-4 space-y-6">
            <OptimizationControls
              currentOverallPsf={currentOverallPsf}
              targetPsf={targetPsf}
              isOptimizing={isOptimizing}
              isOptimized={isOptimized}
              onTargetPsfChange={handleTargetPsfChange}
              onOptimize={handleRunOptimization}
              onRevert={handleRevert}
            />
            
            <OptimizationModeSelector
              optimizationMode={optimizationMode}
              onModeChange={setOptimizationMode}
            />
          </div>
          
          {/* Right column: Bedroom Type Summary */}
          <div className="lg:col-span-8">
            <BedroomTypeSummary 
              bedroomTypes={bedroomTypeData}
              isOptimized={isOptimized}
              onSelectedTypesChange={handleTypesChange}
            />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col items-start text-sm text-muted-foreground bg-gradient-to-r from-indigo-50/50 to-blue-50/50 rounded-b p-4">
        <p>
          {optimizationMode === "basePsf" 
            ? "Base PSF Optimization adjusts only bedroom type PSF values to achieve target overall PSF."
            : "Full Parameter Optimization fine-tunes bedroom PSF, floor premiums, and view adjustments while preserving the cumulative nature of floor premiums."
          }
        </p>
      </CardFooter>
    </Card>
  );
};

export default MegaOptimize;
