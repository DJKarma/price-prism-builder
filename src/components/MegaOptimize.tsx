
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
import { Info, Wand2, RotateCcw, TrendingUp, ArrowRight } from "lucide-react";
import { megaOptimizePsf, calculateOverallAveragePsf } from "@/utils/psfOptimizer";
import { toast } from "@/components/ui/use-toast";

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
      
      // Run mega optimization
      const result = megaOptimizePsf(data, pricingConfig, targetPsf);
      
      // Create optimized config
      const optimizedConfig = {
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
        targetOverallPsf: targetPsf,
        isOptimized: true
      };
      
      // Update UI
      onOptimized(optimizedConfig);
      setIsOptimized(true);
      
      toast({
        title: "Mega Optimization Complete",
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
    <Card className="mb-6">
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Mega Optimization
            </CardTitle>
            <CardDescription>
              Optimize all premium values to achieve your target overall PSF
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
                    Mega Optimize uses advanced constrained gradient descent to adjust all 
                    premium values (bedroom types and views) to achieve your target PSF 
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
      
      <CardContent>
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
                className="flex-1"
              >
                {isOptimizing ? (
                  "Optimizing..."
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Mega Optimize
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
        
        {isOptimized && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Optimization Impact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-medium mb-1">Bedroom Type Adjustments</h5>
                <ul className="space-y-1">
                  {pricingConfig.bedroomTypePricing.map((type: any) => {
                    const original = type.originalBasePsf || type.basePsf;
                    const current = type.basePsf;
                    const change = ((current - original) / original * 100).toFixed(1);
                    const isPositive = current > original;
                    
                    return (
                      <li key={type.type} className="text-sm flex items-center justify-between">
                        <span>{type.type}:</span>
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
                <h5 className="text-sm font-medium mb-1">View Adjustments</h5>
                <ul className="space-y-1">
                  {pricingConfig.viewPricing.map((view: any) => {
                    const original = view.originalPsfAdjustment || view.psfAdjustment;
                    const current = view.psfAdjustment;
                    const diff = current - original;
                    const isPositive = diff > 0;
                    
                    return (
                      <li key={view.view} className="text-sm flex items-center justify-between">
                        <span>{view.view}:</span>
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
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col items-start text-sm text-muted-foreground">
        <p>
          Mega Optimize uses advanced constrained gradient descent to find the optimal 
          premium values while minimizing changes from your original settings.
        </p>
      </CardFooter>
    </Card>
  );
};

export default MegaOptimize;
