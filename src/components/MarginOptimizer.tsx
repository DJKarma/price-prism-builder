import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, TrendingUp, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatNumberWithCommas } from "./pricing-simulator/pricingUtils";

interface MarginOptimizerProps {
  pricingConfig: any;
  onConfigUpdate: (updatedConfig: any) => void;
  projectCost: number;
  costAcPsf: number;
  units: any[];
}

interface BedroomMarginTarget {
  type: string;
  targetMargin: number;
  currentBasePsf: number;
  optimizedBasePsf: number;
  achievedMargin: number;
  deltaPsf: number;
  status: "optimized" | "original" | "unachieved";
}

const MarginOptimizer: React.FC<MarginOptimizerProps> = ({
  pricingConfig,
  onConfigUpdate,
  projectCost,
  costAcPsf,
  units,
}) => {
  // Persist isOpen state in config to survive re-renders
  const [isOpen, setIsOpen] = useState(pricingConfig?.marginOptimizerOpen ?? false);
  const [showCostAlert, setShowCostAlert] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);

  // Sync isOpen with config
  useEffect(() => {
    if (pricingConfig?.marginOptimizerOpen !== undefined && pricingConfig.marginOptimizerOpen !== isOpen) {
      setIsOpen(pricingConfig.marginOptimizerOpen);
    }
  }, [pricingConfig?.marginOptimizerOpen]);
  
  // Get original base PSFs from config if stored, otherwise use current values
  const originalBasePsfs = pricingConfig?.originalBasePsfs || (() => {
    const original: Record<string, number> = {};
    if (pricingConfig?.bedroomTypePricing && Array.isArray(pricingConfig.bedroomTypePricing)) {
      pricingConfig.bedroomTypePricing.forEach((item: any) => {
        original[item.type] = Number(item.basePsf) || 0;
      });
    }
    return original;
  })();

  // Get bedroom types from pricing config (array structure)
  const bedroomTypes = useMemo(() => {
    if (!pricingConfig?.bedroomTypePricing || !Array.isArray(pricingConfig.bedroomTypePricing)) return [];
    return pricingConfig.bedroomTypePricing.map((item: any) => item.type);
  }, [pricingConfig]);

  // Create a lookup map for Base PSF by bedroom type
  const bedroomPsfMap = useMemo(() => {
    if (!pricingConfig?.bedroomTypePricing || !Array.isArray(pricingConfig.bedroomTypePricing)) return {};
    const map: Record<string, number> = {};
    pricingConfig.bedroomTypePricing.forEach((item: any) => {
      map[item.type] = Number(item.basePsf) || 0;
    });
    return map;
  }, [pricingConfig]);

  // Initialize target margins (default values)
  const [targetMargins, setTargetMargins] = useState<Record<string, number>>({});

  // Initialize target margins from config if available, or set defaults
  useEffect(() => {
    if (pricingConfig?.targetMargins && Object.keys(pricingConfig.targetMargins).length > 0) {
      setTargetMargins(pricingConfig.targetMargins);
    } else {
      // Set default margins
      const defaults: Record<string, number> = {};
      bedroomTypes.forEach((type, idx) => {
        // Default margins: decrease as bedroom count increases
        defaults[type] = Math.max(0, 25 - (idx * 3));
      });
      setTargetMargins(defaults);
    }
  }, [pricingConfig, bedroomTypes]);

  // Check if we're currently in optimized state
  useEffect(() => {
    if (pricingConfig?.originalBasePsfs && Object.keys(pricingConfig.originalBasePsfs).length > 0) {
      setIsOptimized(true);
    } else {
      setIsOptimized(false);
    }
  }, [pricingConfig]);

  // Calculate optimization results
  const optimizationResults = useMemo((): BedroomMarginTarget[] => {
    if (!pricingConfig?.bedroomTypePricing || costAcPsf === 0 || bedroomTypes.length === 0) return [];

    return bedroomTypes.map(type => {
      // Get Base PSF from the lookup map
      const currentBasePsf = bedroomPsfMap[type] || 0;
      const targetMargin = Number(targetMargins[type]) || 0;
      
      // Filter units of this bedroom type
      const typeUnits = units.filter(u => u.type === type);
      
      if (typeUnits.length === 0) {
        // Fallback if no units (shouldn't happen)
        const optimizedBasePsf = costAcPsf * (1 + targetMargin / 100);
        return {
          type,
          targetMargin: Number(targetMargin),
          currentBasePsf: Number(currentBasePsf),
          optimizedBasePsf: Number(optimizedBasePsf),
          achievedMargin: 0,
          deltaPsf: optimizedBasePsf - currentBasePsf,
          status: "original" as const,
        };
      }
      
      // Calculate averages for this bedroom type
      const avgAcArea = typeUnits.reduce((sum, u) => sum + (parseFloat(u.acArea) || 0), 0) / typeUnits.length;
      
      // Average premiums (view + floor + additional adjustments)
      const avgPremiumPsf = typeUnits.reduce((sum, u) => {
        const viewAdj = u.viewPsfAdjustment || 0;
        const floorAdj = u.floorAdjustment || 0;
        const addAdj = u.additionalAdjustment || 0;
        return sum + viewAdj + floorAdj + addAdj;
      }, 0) / typeUnits.length;
      
      // Average flat adders
      const avgFlatAdder = typeUnits.reduce((sum, u) => sum + (u.flatAddTotal || 0), 0) / typeUnits.length;
      
      // Percentage increase multiplier
      const pctMult = 1 + ((pricingConfig.percentageIncrease || 0) / 100);
      
      // Target revenue per unit to achieve target margin
      const targetRevenue = costAcPsf * avgAcArea * (1 + targetMargin / 100);
      
      // Solve for basePsf that achieves target revenue
      // Formula: (basePsf + avgPremiumPsf) * avgAcArea * pctMult + avgFlatAdder ≈ targetRevenue
      // Note: We ignore rounding (ceil to 1000) for calculation simplicity
      const optimizedBasePsf = Math.max(0, 
        (targetRevenue - avgFlatAdder) / (avgAcArea * pctMult) - avgPremiumPsf
      );
      
      // Calculate achieved margin with current PSF using actual average revenue
      const avgCurrentRevenue = typeUnits.reduce((sum, u) => sum + (u.finalTotalPrice || 0), 0) / typeUnits.length;
      const avgCurrentCost = costAcPsf * avgAcArea;
      const achievedMargin = avgCurrentCost > 0 
        ? ((avgCurrentRevenue - avgCurrentCost) / avgCurrentCost) * 100 
        : 0;
      
      const deltaPsf = optimizedBasePsf - currentBasePsf;
      
      // Determine status
      let status: "optimized" | "original" | "unachieved" = "original";
      if (isOptimized) {
        status = Math.abs(achievedMargin - targetMargin) < 1 ? "optimized" : "unachieved";
      }

      return {
        type,
        targetMargin: Number(targetMargin),
        currentBasePsf: Number(currentBasePsf),
        optimizedBasePsf: Number(optimizedBasePsf),
        achievedMargin: Number(achievedMargin),
        deltaPsf: Number(deltaPsf),
        status,
      };
    });
  }, [bedroomTypes, bedroomPsfMap, targetMargins, costAcPsf, isOptimized, units, pricingConfig]);

  const handleToggle = () => {
    if (!projectCost || projectCost === 0) {
      setShowCostAlert(true);
      return;
    }
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    // Persist in config
    onConfigUpdate({
      ...pricingConfig,
      marginOptimizerOpen: newIsOpen,
    });
  };

  const handleMarginChange = (type: string, value: number) => {
    setTargetMargins(prev => ({
      ...prev,
      [type]: value,
    }));
  };

  const handleOptimize = () => {
    if (!pricingConfig?.bedroomTypePricing || !Array.isArray(pricingConfig.bedroomTypePricing)) return;

    // Store original values in config if not already stored
    let originalValues = pricingConfig.originalBasePsfs;
    if (!originalValues || Object.keys(originalValues).length === 0) {
      originalValues = {};
      pricingConfig.bedroomTypePricing.forEach((item: any) => {
        originalValues[item.type] = Number(item.basePsf) || 0;
      });
    }

    // Apply optimized PSF directly to achieve exact target margins
    const updatedBedroomPricing = pricingConfig.bedroomTypePricing.map((item: any) => {
      const result = optimizationResults.find(r => r.type === item.type);
      if (!result) return item;

      // Use the optimized PSF directly (Cost AC PSF × (1 + Target Margin %))
      const optimizedValue = Number(result.optimizedBasePsf.toFixed(2));

      return {
        ...item,
        basePsf: optimizedValue,
      };
    });

    const updatedConfig = {
      ...pricingConfig,
      bedroomTypePricing: updatedBedroomPricing,
      targetMargins: { ...targetMargins }, // Save target margins to config
      originalBasePsfs: originalValues, // Save original PSFs to config
      marginOptimizerOpen: isOpen, // Preserve open state
    };

    // Update without triggering full page refresh
    onConfigUpdate(updatedConfig);
    setIsOptimized(true);
    toast.success("Base PSF values optimized for target margins");
  };

  const handleRevert = () => {
    if (!originalBasePsfs || Object.keys(originalBasePsfs).length === 0) {
      toast.error("No original values to revert to");
      return;
    }

    // Revert bedroom pricing array to original values
    const revertedBedroomPricing = pricingConfig.bedroomTypePricing.map((item: any) => ({
      ...item,
      basePsf: originalBasePsfs[item.type] || item.basePsf,
    }));

    const updatedConfig = {
      ...pricingConfig,
      bedroomTypePricing: revertedBedroomPricing,
      originalBasePsfs: undefined, // Clear original PSFs from config
      targetMargins: undefined, // Optionally clear target margins
      marginOptimizerOpen: isOpen, // Preserve open state
    };

    onConfigUpdate(updatedConfig);
    setIsOptimized(false);
    toast.success("Reverted to original Base PSF values");
  };

  // Calculate total metrics
  const totalCurrentRevenue = units.reduce((sum, u) => sum + (u.finalTotalPrice || 0), 0);
  const totalProfit = totalCurrentRevenue - projectCost;
  const totalMarginPercent = projectCost > 0 ? (totalProfit / projectCost) * 100 : 0;

  return (
    <>
      <Card className="w-full glass-card border-border/50 shadow-md hover-glow animate-slide-up">
        <Collapsible open={isOpen} onOpenChange={handleToggle}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-xl font-bold">
                    Profit/Margin Optimizer
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {projectCost === 0 
                      ? "Enter project cost to unlock optimizer"
                      : isOptimized 
                        ? "Optimized - Adjust targets and re-optimize or revert"
                        : "Optimize Base PSF by target margin per bedroom type"
                    }
                  </p>
                </div>
              </div>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={projectCost === 0 ? "opacity-50 cursor-not-allowed" : ""}
                  onClick={(e) => {
                    if (projectCost === 0) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Current Project Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Total Revenue</Label>
                  <div className="text-lg font-semibold text-foreground">
                    {formatNumberWithCommas(totalCurrentRevenue)}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Total Profit</Label>
                  <div className={`text-lg font-semibold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatNumberWithCommas(totalProfit)}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Overall Margin %</Label>
                  <div className={`text-lg font-semibold ${totalMarginPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalMarginPercent.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Target Margin Inputs */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Target Margins by Bedroom Type</Label>
                <div className="space-y-4">
                  {bedroomTypes.map(type => (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">{type}</Label>
                        <div className="flex items-center gap-4">
                          <Input
                            type="number"
                            value={targetMargins[type] || 0}
                            onChange={(e) => handleMarginChange(type, parseFloat(e.target.value) || 0)}
                            className="w-20 text-right"
                            step="0.5"
                            min="0"
                            max="100"
                          />
                          <span className="text-sm text-muted-foreground w-4">%</span>
                        </div>
                      </div>
                      <Slider
                        value={[targetMargins[type] || 0]}
                        onValueChange={(value) => handleMarginChange(type, value[0])}
                        min={0}
                        max={50}
                        step={0.5}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Optimization Results Table */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Optimization Analysis</Label>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bedroom Type</TableHead>
                        <TableHead className="text-right">Current Base PSF</TableHead>
                        <TableHead className="text-right">Optimized Base PSF</TableHead>
                        <TableHead className="text-right">Target Margin %</TableHead>
                        <TableHead className="text-right">Achieved Margin %</TableHead>
                        <TableHead className="text-right">Δ PSF</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {optimizationResults.map(result => (
                        <TableRow key={result.type} className={
                          result.status === "unachieved" ? "bg-amber-50 dark:bg-amber-950/20" : ""
                        }>
                          <TableCell className="font-medium">{result.type}</TableCell>
                          <TableCell className="text-right">
                            {result.currentBasePsf.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {result.optimizedBasePsf.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {result.targetMargin.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right">
                            {result.achievedMargin.toFixed(2)}%
                          </TableCell>
                          <TableCell className={`text-right font-medium ${
                            result.deltaPsf > 0 ? 'text-green-600' : 
                            result.deltaPsf < 0 ? 'text-red-600' : 
                            'text-muted-foreground'
                          }`}>
                            {result.deltaPsf > 0 ? '+' : ''}{result.deltaPsf.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                              result.status === "optimized" ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" :
                              result.status === "unachieved" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {result.status === "unachieved" && <AlertTriangle className="h-3 w-3" />}
                              {result.status === "optimized" ? "Optimized" : 
                               result.status === "unachieved" ? "Target Not Met" : 
                               "Original"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleOptimize();
                  }}
                  className="flex-1"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  {isOptimized ? "Re-Optimize Base PSF" : "Optimize Base PSF"}
                </Button>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRevert();
                  }}
                  variant="outline"
                  disabled={!isOptimized}
                  className="flex-1"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Revert to Original
                </Button>
              </div>

              <p className="text-xs text-muted-foreground italic">
                Note: Optimization calculates Base PSF for each bedroom type by accounting for average premiums (view, floor, additional categories), flat adders, and percentage increases to achieve target margins.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Cost Alert Dialog */}
      <AlertDialog open={showCostAlert} onOpenChange={setShowCostAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Project Cost Required</AlertDialogTitle>
            <AlertDialogDescription>
              Please enter the total project cost in the "Project Cost" section above before optimizing margins.
              The optimizer uses Cost AC PSF to calculate target Base PSF values.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowCostAlert(false)}>
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MarginOptimizer;
