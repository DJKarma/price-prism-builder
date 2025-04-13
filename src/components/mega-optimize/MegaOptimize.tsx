
import React, { useEffect } from "react";
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

import { MegaOptimizeProps } from "./types";
import { useOptimizer } from "./useOptimizer";
import OptimizationControls from "./OptimizationControls";
import OptimizationModeSelector from "./OptimizationModeSelector";
import OptimizationImpact from "./OptimizationImpact";
import BedroomTypeSummary from "./BedroomTypeSummary";

const MegaOptimize: React.FC<MegaOptimizeProps> = ({ 
  data, 
  pricingConfig, 
  onOptimized 
}) => {
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
  
  // Effect to immediately recalculate values whenever pricingConfig changes
  useEffect(() => {
    // The useOptimizer hook now handles this automatically
  }, [pricingConfig]);
  
  return (
    <Card className="mb-6 border-2 border-indigo-100">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Optimization controls */}
          <div className="lg:col-span-1 space-y-6">
            <OptimizationControls
              currentOverallPsf={currentOverallPsf}
              targetPsf={targetPsf}
              isOptimizing={isOptimizing}
              isOptimized={isOptimized}
              onTargetPsfChange={handleTargetPsfChange}
              onOptimize={runMegaOptimization}
              onRevert={revertOptimization}
            />
            
            <OptimizationModeSelector
              optimizationMode={optimizationMode}
              onModeChange={setOptimizationMode}
            />
            
            <OptimizationImpact pricingConfig={pricingConfig} />
          </div>
          
          {/* Right column: Bedroom Type Summary */}
          <div className="lg:col-span-2">
            <BedroomTypeSummary 
              bedroomTypes={pricingConfig.bedroomTypePricing}
              isOptimized={isOptimized}
            />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col items-start text-sm text-muted-foreground bg-gradient-to-r from-indigo-50/50 to-blue-50/50 rounded-b">
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
