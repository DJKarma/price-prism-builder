
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Info, Wand2, RotateCcw, TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import { megaOptimizePsf, calculateOverallAveragePsf, fullOptimizePsf } from "@/utils/psfOptimizer";
import { toast } from "@/components/ui/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface MegaOptimizeProps {
  data: any[];
  pricingConfig: any;
  onOptimized: (optimizedConfig: any) => void;
}

const MegaOptimize: React.FC<MegaOptimizeProps> = ({ 
  data, 
  pricingConfig, 
  onOptimized 
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  const [targetPsf, setTargetPsf] = useState(
    pricingConfig.targetOverallPsf || 
    pricingConfig.bedroomTypePricing.reduce(
      (sum: number, type: any) => sum + type.targetAvgPsf, 
      0
    ) / pricingConfig.bedroomTypePricing.length
  );
  const [optimizationMode, setOptimizationMode] = useState<"basePsf" | "allParams">("basePsf");
  
  // Update the isOptimized state when config changes
  useEffect(() => {
    setIsOptimized(!!pricingConfig.isOptimized);
  }, [pricingConfig]);
  
  const currentOverallPsf = calculateOverallAveragePsf(data, pricingConfig);
  
  const runMegaOptimization = async () => {
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
        // Run standard bedroom PSF optimization
        result = megaOptimizePsf(data, configWithProcessedRules, targetPsf);
        
        // Create optimized config with only bedroom type changes
        optimizedConfig = {
          ...pricingConfig,
          basePsf: pricingConfig.basePsf, // Keep original base PSF
          bedroomTypePricing: pricingConfig.bedroomTypePricing.map((type: any) => ({
            ...type,
            basePsf: result.optimizedParams.bedroomAdjustments[type.type] || type.basePsf,
            originalBasePsf: type.originalBasePsf || type.basePsf // Store original value if not already stored
          })),
          viewPricing: pricingConfig.viewPricing.map((view: any) => ({
            ...view,
            psfAdjustment: result.optimizedParams.viewAdjustments[view.view] || view.psfAdjustment,
            originalPsfAdjustment: view.originalPsfAdjustment || view.psfAdjustment // Store original value if not already stored
          })),
          floorRiseRules: pricingConfig.floorRiseRules, // Keep the original floor rules
          targetOverallPsf: targetPsf,
          isOptimized: true
        };
      } else {
        // Run full optimization including floor rules and view adjustments
        result = fullOptimizePsf(data, configWithProcessedRules, targetPsf);
        
        // Create optimized config with all parameter changes
        optimizedConfig = {
          ...pricingConfig,
          basePsf: pricingConfig.basePsf, // Keep original base PSF
          bedroomTypePricing: pricingConfig.bedroomTypePricing.map((type: any) => ({
            ...type,
            basePsf: result.optimizedParams.bedroomAdjustments[type.type] || type.basePsf,
            originalBasePsf: type.originalBasePsf || type.basePsf // Store original value if not already stored
          })),
          viewPricing: pricingConfig.viewPricing.map((view: any) => ({
            ...view,
            psfAdjustment: result.optimizedParams.viewAdjustments[view.view] || view.psfAdjustment,
            originalPsfAdjustment: view.originalPsfAdjustment || view.psfAdjustment // Store original value if not already stored
          })),
          floorRiseRules: result.optimizedParams.floorRules || pricingConfig.floorRiseRules,
          originalFloorRiseRules: pricingConfig.originalFloorRiseRules || pricingConfig.floorRiseRules, // Store original floor rules
          targetOverallPsf: targetPsf,
          isOptimized: true,
          optimizationMode: optimizationMode // Store which mode was used
        };
      }
      
      // Update UI
      onOptimized(optimizedConfig);
      setIsOptimized(true);
      
      toast({
        title: `${optimizationMode === "basePsf" ? "Base PSF" : "Full Parameter"} Optimization Complete`,
        description: `Optimized from ${result.initialAvgPsf.toFixed(2)} to ${result.finalAvgPsf.toFixed(2)} PSF in ${result.iterations} iterations.`,
      });
    } catch (error) {
      console.error("Optimization error:", error);
      toast({
        title: "Optimization Failed",
        description: "There was an error during the optimization process.",
        variant: "destructive"
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
    
    // Update UI
    onOptimized(revertedConfig);
    setIsOptimized(false);
    
    toast({
      title: "Optimization Reverted",
      description: "All premium values have been restored to their original settings.",
    });
  };
  
  const handleTargetPsfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTargetPsf(parseFloat(e.target.value) || 0);
  };
  
  return (
    <Card className="mb-6 border-2 border-indigo-100">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-6 w-6 text-indigo-500" />
              Mega Optimization
            </CardTitle>
            <CardDescription className="text-indigo-700">
              Optimize premium values to achieve your target overall PSF
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <TooltipProvider>
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
            </TooltipProvider>
            
            {isOptimized && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Optimized
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor="current-psf">Current Overall PSF</Label>
            <div className="flex items-center gap-2">
              <Input
                id="current-psf"
                value={currentOverallPsf.toFixed(2)}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="target-psf">Target Overall PSF</Label>
            <div className="flex items-center gap-2">
              <Input
                id="target-psf"
                type="number"
                min="0"
                step="0.01"
                value={targetPsf}
                onChange={handleTargetPsfChange}
              />
            </div>
          </div>
          
          <div className="flex items-end">
            <div className="flex gap-2 w-full">
              <Button
                onClick={runMegaOptimization}
                disabled={isOptimizing}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                {isOptimizing ? (
                  "Optimizing..."
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Mega Optimize Overall PSF
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={revertOptimization}
                disabled={!isOptimized}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Revert
              </Button>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <Label className="mb-2 block">Optimization Mode</Label>
          <div className="flex flex-col space-y-2">
            <ToggleGroup 
              type="single" 
              value={optimizationMode}
              onValueChange={(value) => {
                if (value) setOptimizationMode(value as "basePsf" | "allParams");
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="basePsf" className="flex-grow">
                Optimize Base PSF Only
              </ToggleGroupItem>
              <ToggleGroupItem value="allParams" className="flex-grow">
                Optimize All Parameters
              </ToggleGroupItem>
            </ToggleGroup>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-sm text-muted-foreground flex items-center mt-1">
                    <Info className="h-4 w-4 mr-1 inline-block" />
                    Learn more about optimization modes
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[350px] p-4 text-sm">
                  <p className="font-medium mb-2">Optimization Mode Comparison:</p>
                  <ul className="list-disc pl-4 space-y-2">
                    <li><span className="font-medium">Base PSF Only:</span> Adjusts only the bedroom type base PSF values to achieve target overall PSF.</li>
                    <li><span className="font-medium">All Parameters:</span> Optimizes bedroom base PSF, floor premium values, and view adjustments together. This mode preserves the cumulative nature of floor premiums while achieving the target PSF with minimal changes.</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {isOptimized && (
          <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
            <h4 className="font-medium mb-2 text-indigo-900">Optimization Impact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-medium mb-1 text-indigo-800">Bedroom Type Adjustments</h5>
                <ul className="space-y-1 bg-white p-2 rounded">
                  {pricingConfig.bedroomTypePricing.map((type: any) => {
                    const original = type.originalBasePsf || type.basePsf;
                    const current = type.basePsf;
                    const change = ((current - original) / original * 100).toFixed(1);
                    const isPositive = current > original;
                    
                    return (
                      <li key={type.type} className="text-sm flex items-center justify-between">
                        <span className="font-medium">{type.type}:</span>
                        <span className="flex items-center">
                          {original.toFixed(2)}
                          <ArrowRight className="mx-1 h-3 w-3" />
                          <span className={isPositive ? "text-green-600" : "text-amber-600"}>
                            {current.toFixed(2)} ({isPositive ? "+" : ""}{change}%)
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              
              <div>
                <h5 className="text-sm font-medium mb-1 text-indigo-800">View Adjustments</h5>
                <ul className="space-y-1 bg-white p-2 rounded">
                  {pricingConfig.viewPricing.map((view: any) => {
                    const original = view.originalPsfAdjustment || view.psfAdjustment;
                    const current = view.psfAdjustment;
                    const diff = current - original;
                    const isPositive = diff > 0;
                    
                    return (
                      <li key={view.view} className="text-sm flex items-center justify-between">
                        <span className="font-medium">{view.view}:</span>
                        <span className="flex items-center">
                          {original.toFixed(2)}
                          <ArrowRight className="mx-1 h-3 w-3" />
                          <span className={isPositive ? "text-green-600" : "text-amber-600"}>
                            {current.toFixed(2)} ({isPositive ? "+" : ""}{diff.toFixed(2)})
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            
            {/* Floor Rules Adjustments - Only shown when All Parameters mode was used */}
            {pricingConfig.optimizationMode === "allParams" && pricingConfig.originalFloorRiseRules && (
              <div className="mt-3">
                <h5 className="text-sm font-medium mb-1 text-indigo-800">Floor Premium Adjustments</h5>
                <ul className="space-y-1 bg-white p-2 rounded">
                  {pricingConfig.floorRiseRules.map((rule: any, index: number) => {
                    const originalRule = pricingConfig.originalFloorRiseRules[index];
                    if (!originalRule) return null;
                    
                    const origIncrement = originalRule.psfIncrement;
                    const currentIncrement = rule.psfIncrement;
                    const incrementChange = ((currentIncrement - origIncrement) / origIncrement * 100).toFixed(1);
                    const isIncrementPositive = currentIncrement > origIncrement;
                    
                    return (
                      <li key={`floor-${index}`} className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            Floors {rule.startFloor}-{rule.endFloor === null ? "max" : rule.endFloor}:
                          </span>
                        </div>
                        <div className="pl-4 mt-1 grid grid-cols-1 gap-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>Base Increment:</span>
                            <span className="flex items-center">
                              {origIncrement.toFixed(2)}
                              <ArrowRight className="mx-1 h-3 w-3" />
                              <span className={isIncrementPositive ? "text-green-600" : "text-amber-600"}>
                                {currentIncrement.toFixed(2)} ({isIncrementPositive ? "+" : ""}{incrementChange}%)
                              </span>
                            </span>
                          </div>
                          
                          {rule.jumpEveryFloor && originalRule.jumpEveryFloor && (
                            <div className="flex items-center justify-between text-xs">
                              <span>Jump Increment:</span>
                              <span className="flex items-center">
                                {originalRule.jumpIncrement?.toFixed(2) || "0.00"}
                                <ArrowRight className="mx-1 h-3 w-3" />
                                <span className={
                                  (rule.jumpIncrement || 0) > (originalRule.jumpIncrement || 0) 
                                    ? "text-green-600" 
                                    : "text-amber-600"
                                }>
                                  {rule.jumpIncrement?.toFixed(2) || "0.00"}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
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
