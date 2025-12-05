import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Info, Sparkles, RotateCcw, Play, Zap } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import { MegaOptimizeProps } from "./types";
import { useOptimizer } from "./useOptimizer";
import PricingSummary from "@/components/PricingSummary";

import { simulatePricing } from "@/utils/psfOptimizer";

/* ────────────────── helpers ────────────────── */

const fmt = (n: number, d = 2) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

const SlotNumber: React.FC<{ v: number; anim?: boolean }> = ({ v, anim }) => {
  const [disp, setDisp] = useState(v);
  useEffect(() => {
    if (!anim || Math.abs(disp - v) < 0.01) return setDisp(v);
    let i = 0;
    const id = setInterval(() => {
      if (i === 6) {
        clearInterval(id);
        setDisp(v);
        return;
      }
      const p = i / 6;
      const eased = 1 - Math.pow(1 - p, 3);
      const mid = disp + (v - disp) * eased;
      setDisp(Number(mid.toFixed(2)));
      i++;
    }, 60);
    return () => clearInterval(id);
  }, [v, anim]);
  return (
    <span className={anim ? "transition-transform duration-300 scale-105" : ""}>
      {fmt(disp, 2)}
    </span>
  );
};

/* ────────────────── Calculate baseline average PSFs from data ────────────────── */
const calculateBaselineAverages = (
  data: any[],
  pricingConfig: any
): { saPsf: Record<string, number>; acPsf: Record<string, number> } => {
  const saPsf: Record<string, number> = {};
  const acPsf: Record<string, number> = {};
  
  if (!data.length || !pricingConfig?.bedroomTypePricing) {
    return { saPsf, acPsf };
  }
  
  // Simulate pricing with current config
  const priced = simulatePricing(data, pricingConfig);
  
  // Group by bedroom type
  const byType: Record<string, any[]> = {};
  priced.forEach((u) => {
    if (!byType[u.type]) byType[u.type] = [];
    byType[u.type].push(u);
  });
  
  // Calculate weighted average PSF per type
  Object.entries(byType).forEach(([type, units]) => {
    const totalSellArea = units.reduce((s, u) => s + (parseFloat(u.sellArea) || 0), 0);
    const totalAcArea = units.reduce((s, u) => s + (parseFloat(u.acArea) || 0), 0);
    const totalPrice = units.reduce((s, u) => s + (u.finalTotalPrice || 0), 0);
    
    saPsf[type] = totalSellArea > 0 ? Math.round(totalPrice / totalSellArea) : 0;
    acPsf[type] = totalAcArea > 0 ? Math.round(totalPrice / totalAcArea) : 0;
  });
  
  return { saPsf, acPsf };
};

/* ────────────────── component ────────────────── */

const MegaOptimize: React.FC<MegaOptimizeProps> = ({
  data,
  pricingConfig,
  onOptimized,
}) => {
  /* bedroom‑type list */
  const bedroomTypes = useMemo(
    () =>
      (pricingConfig?.bedroomTypePricing || [])
        .map((b: any) => b.type)
        .sort((a, b) => {
          const aM = a.match(/\d+/);
          const bM = b.match(/\d+/);
          if (aM && bM) return Number(aM[0]) - Number(bM[0]);
          return a.localeCompare(b);
        }),
    [pricingConfig]
  );

  /* local UI */
  const [animateNums, setAnimateNums] = useState(false);
  const [metric, setMetric] = useState<"sellArea" | "acArea">(
    pricingConfig?.optimizePsfType || "sellArea"
  );
  const [processed, setProcessed] = useState<any[]>([]);
  const [highlightedTypes, setHighlightedTypes] = useState<string[]>([]);
  
  /* Per-bedroom target PSF inputs */
  const [perBedroomTargets, setPerBedroomTargets] = useState<Record<string, number>>({});
  
  /* IMMUTABLE BASELINE - only set once on initial load or import */
  const baselineRef = useRef<{ saPsf: Record<string, number>; acPsf: Record<string, number> } | null>(null);
  const [baselineAverages, setBaselineAverages] = useState<{ saPsf: Record<string, number>; acPsf: Record<string, number> }>({ saPsf: {}, acPsf: {} });
  const hasInitializedRef = useRef(false);
  
  /* Track metric changes to know when to reset targets */
  const prevMetricRef = useRef<"sellArea" | "acArea">(metric);

  /* optimiser hook - pass baselines */
  const {
    isOptimized,
    isOptimizing,
    currentOverallPsf,
    currentOverallAcPsf,
    optimizeSingleBedroom,
    revertSingleBedroom,
  } = useOptimizer(data, pricingConfig, onOptimized);

  /* CURRENT AVERAGES - calculated live from latest config (matches PricingSummary) */
  const currentAverages = useMemo(() => {
    if (!data.length || !pricingConfig) return { saPsf: {}, acPsf: {} };
    
    const priced = simulatePricing(data, pricingConfig);
    const byType: Record<string, any[]> = {};
    priced.forEach((u) => {
      if (!byType[u.type]) byType[u.type] = [];
      byType[u.type].push(u);
    });
    
    const saPsf: Record<string, number> = {};
    const acPsf: Record<string, number> = {};
    
    Object.entries(byType).forEach(([type, units]) => {
      const totalSellArea = units.reduce((s, u) => s + (parseFloat(u.sellArea) || 0), 0);
      const totalAcArea = units.reduce((s, u) => s + (parseFloat(u.acArea) || 0), 0);
      const totalPrice = units.reduce((s, u) => s + (u.finalTotalPrice || 0), 0);
      
      saPsf[type] = totalSellArea > 0 ? Math.round(totalPrice / totalSellArea) : 0;
      acPsf[type] = totalAcArea > 0 ? Math.round(totalPrice / totalAcArea) : 0;
    });
    
    return { saPsf, acPsf };
  }, [data, pricingConfig]);

  /* Initialize IMMUTABLE baseline - ONLY ONCE on first load or from import */
  useEffect(() => {
    if (!data.length || !pricingConfig?.bedroomTypePricing) return;
    
    // Check if we already have valid baselines locked
    if (hasInitializedRef.current && baselineRef.current && Object.keys(baselineRef.current.saPsf).length > 0) {
      return; // LOCKED - don't recalculate
    }
    
    // Priority 1: Use stored baselines from config (from import)
    const storedBaselines = pricingConfig.baselineAverages;
    if (storedBaselines?.saPsf && Object.keys(storedBaselines.saPsf).length > 0) {
      baselineRef.current = storedBaselines;
      setBaselineAverages(storedBaselines);
      hasInitializedRef.current = true;
      return;
    }
    
    // Priority 2: Calculate from data (first load only)
    const baselines = calculateBaselineAverages(data, pricingConfig);
    if (Object.keys(baselines.saPsf).length > 0) {
      baselineRef.current = baselines;
      setBaselineAverages(baselines);
      hasInitializedRef.current = true;
    }
  }, [data.length, pricingConfig?.bedroomTypePricing?.length, pricingConfig?.baselineAverages]);

  /* Initialize targets ONLY on metric change or first load - NOT on every config change */
  useEffect(() => {
    if (!pricingConfig?.bedroomTypePricing) return;
    
    const metricChanged = metric !== prevMetricRef.current;
    const noTargetsYet = Object.keys(perBedroomTargets).length === 0;
    
    if (metricChanged || noTargetsYet) {
      const targets: Record<string, number> = {};
      const avgSource = metric === "sellArea" ? currentAverages.saPsf : currentAverages.acPsf;
      
      pricingConfig.bedroomTypePricing.forEach((bt: any) => {
        targets[bt.type] = avgSource[bt.type] || bt.basePsf || 0;
      });
      setPerBedroomTargets(targets);
      prevMetricRef.current = metric;
    }
  }, [metric, pricingConfig?.bedroomTypePricing?.length]);

  /* Sync metric with config */
  useEffect(() => {
    if (pricingConfig?.optimizePsfType && pricingConfig.optimizePsfType !== metric) {
      setMetric(pricingConfig.optimizePsfType);
    }
  }, [pricingConfig?.optimizePsfType]);

  /* PRE-PROCESS UNITS */
  useEffect(() => {
    if (!data.length || !pricingConfig) return;
    setProcessed(simulatePricing(data, pricingConfig));
  }, [data, pricingConfig]);

  /* Handle metric change */
  const handleMetricChange = useCallback((newMetric: "sellArea" | "acArea") => {
    setMetric(newMetric);
    onOptimized({
      ...pricingConfig,
      optimizePsfType: newMetric,
    });
  }, [pricingConfig, onOptimized]);

  /* Handle per-bedroom target change - user controls input */
  const handlePerBedroomTargetChange = useCallback((type: string, value: number) => {
    setPerBedroomTargets(prev => ({ ...prev, [type]: value }));
  }, []);

  /* Optimize single bedroom type */
  const handleOptimizeSingle = useCallback((type: string) => {
    const targetPsf = perBedroomTargets[type];
    if (!targetPsf || targetPsf <= 0) {
      toast.error(`Enter a valid target PSF for ${type}`);
      return;
    }
    
    setAnimateNums(true);
    setHighlightedTypes([type]);
    
    // Pass immutable baselines to optimizer (will store in config on first optimize)
    optimizeSingleBedroom(type, targetPsf, metric, baselineRef.current || undefined);
    toast.success(`${type} optimized to ${fmt(targetPsf, 0)} PSF`);
    
    setTimeout(() => {
      setAnimateNums(false);
      setHighlightedTypes([]);
    }, 2000);
  }, [perBedroomTargets, metric, optimizeSingleBedroom]);

  /* Revert single bedroom type to IMMUTABLE baseline */
  const handleRevertSingle = useCallback((type: string) => {
    if (!baselineRef.current) {
      toast.info(`No baseline found for ${type}`);
      return;
    }
    
    const baselineAvg = metric === "sellArea" 
      ? baselineRef.current.saPsf[type] 
      : baselineRef.current.acPsf[type];
    
    if (!baselineAvg) {
      toast.info(`No baseline PSF for ${type}`);
      return;
    }
    
    // Pass immutable baselines to revert function
    revertSingleBedroom(type, baselineRef.current);
    setPerBedroomTargets(prev => ({ ...prev, [type]: baselineAvg }));
    toast.success(`${type} reverted to ${fmt(baselineAvg, 0)} PSF`);
  }, [metric, revertSingleBedroom]);

  /* Check if type has been modified from baseline */
  const isTypeModified = useCallback((type: string) => {
    if (!baselineRef.current) return false;
    const currentAvg = metric === "sellArea" ? currentAverages.saPsf[type] : currentAverages.acPsf[type];
    const baselineAvg = metric === "sellArea" ? baselineRef.current.saPsf[type] : baselineRef.current.acPsf[type];
    return Math.abs(currentAvg - baselineAvg) > 1; // Allow 1 PSF tolerance
  }, [metric, currentAverages]);

  /* Get original baseline for display */
  const getBaselineForDisplay = useCallback((type: string): number => {
    if (!baselineRef.current) return 0;
    return metric === "sellArea" 
      ? baselineRef.current.saPsf[type] || 0
      : baselineRef.current.acPsf[type] || 0;
  }, [metric]);

  /* helpers */
  const currentOverall = metric === "sellArea" ? currentOverallPsf : currentOverallAcPsf;

  /* ────────────────── render ────────────────── */
  return (
    <Card className="border-0 shadow-xl mb-6 overflow-hidden animate-fade-in bg-gradient-to-br from-background via-background to-muted/30">
      {/* Decorative gradient bar */}
      <div className="h-1 bg-gradient-to-r from-primary via-purple-500 to-primary" />
      
      {/* header */}
      <CardHeader className="bg-gradient-to-r from-primary/5 via-purple-500/5 to-primary/5 border-b border-border/50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-purple-600 text-primary-foreground shadow-lg shadow-primary/25">
                <Sparkles className="w-5 h-5" />
              </div>
              Pricing Optimization
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Configure target PSF and view live breakdown
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-primary/10">
                  <Info className="w-4 h-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                Set target PSF for each bedroom type. The system adjusts Base PSF to achieve your target average.
              </TooltipContent>
            </Tooltip>
            {isOptimized && (
              <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 shadow-md shadow-emerald-500/25 animate-scale-in">
                <Zap className="w-3 h-3 mr-1" />
                Optimized
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {/* content */}
      <CardContent className="pt-6 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT column */}
          <div className="lg:col-span-4 space-y-5">
            {/* current PSF display */}
            <div className="relative rounded-xl bg-gradient-to-br from-primary/10 via-purple-500/10 to-primary/5 p-5 text-center shadow-inner overflow-hidden group hover-scale">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <h3 className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                Overall {metric === "sellArea" ? "SA" : "AC"} PSF
              </h3>
              <p className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent flex justify-center items-center gap-2">
                <SlotNumber v={currentOverall} anim={animateNums} />
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                Weighted average across all units
              </div>
            </div>

            {/* PSF type selector */}
            <div className="rounded-xl border border-border/50 p-4 bg-card/50 backdrop-blur-sm shadow-sm">
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                PSF Metric
              </h3>
              <div className="flex gap-2">
                <Button
                  className={`flex-1 transition-all duration-200 ${
                    metric === "sellArea" 
                      ? "bg-gradient-to-r from-primary to-purple-600 text-primary-foreground shadow-md shadow-primary/25" 
                      : "hover:bg-muted"
                  }`}
                  size="sm"
                  variant={metric === "sellArea" ? "default" : "outline"}
                  onClick={() => handleMetricChange("sellArea")}
                >
                  SA PSF
                </Button>
                <Button
                  className={`flex-1 transition-all duration-200 ${
                    metric === "acArea" 
                      ? "bg-gradient-to-r from-primary to-purple-600 text-primary-foreground shadow-md shadow-primary/25" 
                      : "hover:bg-muted"
                  }`}
                  size="sm"
                  variant={metric === "acArea" ? "default" : "outline"}
                  onClick={() => handleMetricChange("acArea")}
                >
                  AC PSF
                </Button>
              </div>
            </div>

            {/* Per-bedroom PSF controls */}
            <div className="rounded-xl border border-border/50 p-4 bg-card/50 backdrop-blur-sm shadow-sm">
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Target by Bedroom ({metric === "sellArea" ? "SA" : "AC"})
              </h3>
              <div className="space-y-2.5">
                {bedroomTypes.map((t, idx) => {
                  const modified = isTypeModified(t);
                  const baselineValue = getBaselineForDisplay(t);
                  const currentAvg = metric === "sellArea" 
                    ? currentAverages.saPsf[t] 
                    : currentAverages.acPsf[t];
                  
                  return (
                    <div
                      key={t}
                      className={`p-3 rounded-lg border transition-all duration-300 animate-slide-up ${
                        modified
                          ? "bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/30 shadow-sm"
                          : "bg-muted/30 border-border/50 hover:border-border"
                      }`}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-[70px]">
                          <span className={`font-semibold text-sm ${modified ? "text-primary" : "text-foreground"}`}>
                            {t}
                          </span>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Avg: <span className={`font-medium ${modified ? "text-primary" : ""}`}>{fmt(currentAvg, 0)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-1 justify-end">
                          <Input
                            type="number"
                            value={perBedroomTargets[t] || ""}
                            onChange={(e) => handlePerBedroomTargetChange(t, parseFloat(e.target.value) || 0)}
                            className="h-9 w-24 text-right font-medium border-border/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                            placeholder="PSF"
                          />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                className="h-9 w-9 p-0 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30"
                                onClick={() => handleOptimizeSingle(t)}
                                disabled={isOptimizing}
                              >
                                <Play className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Apply target PSF for {t}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-9 w-9 p-0 transition-all duration-200 ${
                                  modified 
                                    ? "text-primary hover:bg-primary/10 hover:text-primary" 
                                    : "text-muted-foreground hover:bg-muted"
                                }`}
                                onClick={() => handleRevertSingle(t)}
                                disabled={!baselineValue}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Revert to baseline ({fmt(baselineValue, 0)})</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      {baselineValue > 0 && (
                        <div className={`text-xs mt-2 pt-2 border-t border-border/30 ${
                          modified ? "text-primary/70" : "text-muted-foreground"
                        }`}>
                          Original: {fmt(baselineValue, 0)} • {modified && (
                            <span className="font-medium">
                              Δ {currentAvg > baselineValue ? "+" : ""}{fmt(currentAvg - baselineValue, 0)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT column */}
          <div className="lg:col-span-8">
            <div className="rounded-xl border border-border/50 overflow-hidden shadow-sm">
              <PricingSummary
                data={processed.length ? processed : data}
                showDollarSign={false}
                showAcPsf
                highlightedTypes={highlightedTypes}
              />
            </div>
          </div>
        </div>
      </CardContent>

      {/* footer */}
      <CardFooter className="bg-muted/30 border-t border-border/50 py-3">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">How it works:</span> Set your target PSF, click <Play className="w-3 h-3 inline mx-0.5" /> to apply. 
          The system adjusts Base PSF to achieve your target average. Use <RotateCcw className="w-3 h-3 inline mx-0.5" /> to revert to original.
        </p>
      </CardFooter>
    </Card>
  );
};

export { MegaOptimize };
