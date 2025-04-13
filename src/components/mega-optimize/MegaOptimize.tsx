
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
import PricingSummary from "@/components/PricingSummary";
import BedroomTypeSelector from "./BedroomTypeSelector";

const MegaOptimize: React.FC<MegaOptimizeProps> = ({ 
  data, 
  pricingConfig, 
  onOptimized 
}) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    pricingConfig.bedroomTypePricing.map((type: any) => type.type)
  );
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [highlightedTypes, setHighlightedTypes] = useState<string[]>([]);

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
  
  // Process data to ensure all units have finalPsf and finalTotalPrice
  useEffect(() => {
    if (!data || !data.length || !pricingConfig) return;
    
    const processed = data.map((unit) => {
      // Find the bedroom type config for this unit
      const bedroomType = pricingConfig.bedroomTypePricing.find(
        (b: any) => b.type === unit.type
      );
      
      // Find view adjustment for this unit
      const viewAdjustment = pricingConfig.viewPricing.find(
        (v: any) => v.view === unit.view
      );
      
      const basePsf = bedroomType?.basePsf || pricingConfig.basePsf;
      const viewPsfAdjustment = viewAdjustment?.psfAdjustment || 0;
      
      // Calculate floor adjustment based on rules
      let floorAdjustment = 0;
      const floorLevel = parseInt(unit.floor) || 1;
      
      const sortedFloorRules = [...pricingConfig.floorRiseRules].sort(
        (a: any, b: any) => a.startFloor - b.startFloor
      );
      
      let cumulativeAdjustment = 0;
      for (const rule of sortedFloorRules) {
        const ruleEnd = rule.endFloor === null ? 999 : rule.endFloor;
        if (floorLevel > ruleEnd) {
          for (let floor = Math.max(rule.startFloor, 1); floor <= ruleEnd; floor++) {
            cumulativeAdjustment += rule.psfIncrement;
            if (rule.jumpEveryFloor && rule.jumpIncrement) {
              if ((floor - rule.startFloor + 1) % rule.jumpEveryFloor === 0) {
                cumulativeAdjustment += rule.jumpIncrement;
              }
            }
          }
        } else if (floorLevel >= rule.startFloor) {
          for (let floor = Math.max(rule.startFloor, 1); floor <= floorLevel; floor++) {
            cumulativeAdjustment += rule.psfIncrement;
            if (rule.jumpEveryFloor && rule.jumpIncrement) {
              if ((floor - rule.startFloor + 1) % rule.jumpEveryFloor === 0) {
                cumulativeAdjustment += rule.jumpIncrement;
              }
            }
          }
          break;
        }
      }
      
      floorAdjustment = cumulativeAdjustment;
      
      // Calculate base PSF with all adjustments
      const basePsfWithAdjustments = basePsf + floorAdjustment + viewPsfAdjustment;
      
      const sellArea = parseFloat(unit.sellArea) || 0;
      
      // Calculate total price and final PSF
      const totalPrice = basePsfWithAdjustments * sellArea;
      const finalTotalPrice = Math.ceil(totalPrice / 1000) * 1000;
      const finalPsf = sellArea > 0 ? finalTotalPrice / sellArea : 0;
      
      // Create a processed unit with all required fields
      const processedUnit = {
        ...unit,
        basePsf,
        floorAdjustment,
        viewPsfAdjustment,
        totalPrice,
        finalTotalPrice,
        finalPsf
      };
      
      return processedUnit;
    });
    
    // Log a sample of processed data for debugging
    if (processed.length > 0) {
      console.log("Sample processed unit data:", {
        name: processed[0].name,
        type: processed[0].type,
        sellArea: processed[0].sellArea,
        basePsf: processed[0].basePsf,
        floorAdjustment: processed[0].floorAdjustment,
        viewPsfAdjustment: processed[0].viewPsfAdjustment,
        totalPrice: processed[0].totalPrice,
        finalTotalPrice: processed[0].finalTotalPrice,
        finalPsf: processed[0].finalPsf
      });
    }
    
    setProcessedData(processed);
  }, [data, pricingConfig]);

  // Run optimization with selected types and update pricingConfig with optimizedTypes
  const handleRunOptimization = () => {
    if (selectedTypes.length === 0) {
      toast.error("Please select at least one bedroom type to optimize");
      return;
    }
    
    toast.promise(
      new Promise(resolve => {
        runMegaOptimization(selectedTypes);
        // Highlight the selected types for 4 seconds (increased from 2)
        setHighlightedTypes([...selectedTypes]);
        setTimeout(() => {
          setHighlightedTypes([]);
        }, 4000); // Changed from 2000 to 4000 for 4 seconds
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
  
  // Get available bedroom types from pricing config
  const bedroomTypes = pricingConfig.bedroomTypePricing.map((type: any) => type.type);
  
  // Get target PSF by bedroom type
  const getTargetPsfByType = (type: string) => {
    const bedroomConfig = pricingConfig.bedroomTypePricing.find((t: any) => t.type === type);
    return bedroomConfig?.targetAvgPsf || 0;
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
            {/* Display Current Overall PSF in an eye-catching way */}
            <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg p-4 text-center mb-4 transform transition-transform hover:scale-105 shadow-md">
              <h3 className="text-lg font-medium text-indigo-700">Current Overall PSF</h3>
              <p className="text-3xl font-bold text-indigo-900 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-yellow-500 mr-2 animate-pulse" />
                {currentOverallPsf.toFixed(2)}
                <Sparkles className="h-5 w-5 text-yellow-500 ml-2 animate-pulse" />
              </p>
              {isOptimized && (
                <Badge className="mt-2 bg-green-100 text-green-800 hover:bg-green-200">
                  Optimized
                </Badge>
              )}
            </div>
            
            {/* Target PSF by Bedroom Type */}
            <div className="bg-white rounded-lg border border-indigo-100 p-4">
              <h3 className="text-sm font-medium mb-3 text-indigo-700">Target PSF by Bedroom Type</h3>
              <div className="grid grid-cols-2 gap-2">
                {bedroomTypes.map(type => (
                  <div 
                    key={type} 
                    className={`p-2 rounded-md flex justify-between items-center ${
                      selectedTypes.includes(type) 
                        ? 'bg-indigo-50 border border-indigo-200' 
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <span className="font-medium text-sm">{type}</span>
                    <span className="font-bold text-sm">{getTargetPsfByType(type).toFixed(2) || "0.00"}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Bedroom Type Selector */}
            <BedroomTypeSelector 
              bedroomTypes={bedroomTypes}
              selectedTypes={selectedTypes}
              setSelectedTypes={setSelectedTypes}
            />
            
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
          
          {/* Right column: Pricing Summary */}
          <div className="lg:col-span-8">
            {/* Use the processed data for PricingSummary instead of raw data */}
            <PricingSummary 
              data={processedData.length > 0 ? processedData : data} 
              showDollarSign={false} 
              highlightedTypes={highlightedTypes}
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
