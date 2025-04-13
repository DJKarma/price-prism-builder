
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
  
  // Run optimization with selected types and update pricingConfig with optimizedTypes
  const handleRunOptimization = () => {
    if (selectedTypes.length === 0) {
      toast.error("Please select at least one bedroom type to optimize");
      return;
    }
    
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
  
  // Get available bedroom types from pricing config
  const bedroomTypes = pricingConfig.bedroomTypePricing.map((type: any) => type.type);
  
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
            <div className="mb-4">
              <div className="bg-purple-50 rounded-lg p-4 text-center mb-4">
                <h3 className="text-xl font-semibold text-purple-700">Target Overall PSF</h3>
                <p className="text-3xl font-bold text-purple-900">{targetPsf.toFixed(2)}</p>
                {isOptimized && (
                  <Badge className="mt-2 bg-green-100 text-green-800 hover:bg-green-200">
                    Optimized
                  </Badge>
                )}
              </div>
            </div>
            <PricingSummary data={data} showDollarSign={false} />
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
