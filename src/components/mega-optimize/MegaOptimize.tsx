import React, { useEffect, useMemo, useState, useRef } from "react";
import { Info, Sparkles, RotateCcw, Play } from "lucide-react";
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
    <span className={anim ? "transition-transform scale-105" : ""}>
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
  
  /* Store baseline averages (original PSFs from first load) */
  const baselineRef = useRef<{ saPsf: Record<string, number>; acPsf: Record<string, number> } | null>(null);
  const [baselineAverages, setBaselineAverages] = useState<{ saPsf: Record<string, number>; acPsf: Record<string, number> }>({ saPsf: {}, acPsf: {} });
  
  /* Current calculated averages (live) */
  const [currentAverages, setCurrentAverages] = useState<{ saPsf: Record<string, number>; acPsf: Record<string, number> }>({ saPsf: {}, acPsf: {} });

  /* optimiser hook */
  const {
    isOptimized,
    isOptimizing,
    currentOverallPsf,
    currentOverallAcPsf,
    optimizeSingleBedroom,
    revertSingleBedroom,
    getOriginalBasePsf,
  } = useOptimizer(data, pricingConfig, onOptimized);

  /* Initialize baseline averages from config or calculate from data */
  useEffect(() => {
    if (!data.length || !pricingConfig?.bedroomTypePricing) return;
    
    // Check if we have stored baselines in config (from import or previous session)
    const storedBaselines = pricingConfig.baselineAverages;
    if (storedBaselines?.saPsf && storedBaselines?.acPsf && Object.keys(storedBaselines.saPsf).length > 0) {
      // Use stored baselines - don't trigger onOptimized to prevent cascade
      baselineRef.current = storedBaselines;
      setBaselineAverages(storedBaselines);
    } else if (!baselineRef.current || Object.keys(baselineRef.current.saPsf).length === 0) {
      // Calculate initial baselines from data - only on first load
      const baselines = calculateBaselineAverages(data, pricingConfig);
      baselineRef.current = baselines;
      setBaselineAverages(baselines);
      // NOTE: We do NOT call onOptimized here to prevent panel collapse cascade
      // Baselines will be stored when user explicitly optimizes
    }
  }, [data.length, pricingConfig?.bedroomTypePricing?.length, pricingConfig?.baselineAverages]);

  /* Update current averages when config changes */
  useEffect(() => {
    if (!data.length || !pricingConfig) return;
    const current = calculateBaselineAverages(data, pricingConfig);
    setCurrentAverages(current);
  }, [data, pricingConfig]);

  /* Initialize per-bedroom targets from current averages based on metric */
  useEffect(() => {
    if (!pricingConfig?.bedroomTypePricing) return;
    
    const targets: Record<string, number> = {};
    const avgSource = metric === "sellArea" ? currentAverages.saPsf : currentAverages.acPsf;
    
    pricingConfig.bedroomTypePricing.forEach((bt: any) => {
      // Use current average PSF if available, otherwise use basePsf
      targets[bt.type] = avgSource[bt.type] || bt.basePsf || 0;
    });
    setPerBedroomTargets(targets);
  }, [pricingConfig?.bedroomTypePricing, metric, currentAverages]);

  /* Sync metric with config */
  useEffect(() => {
    if (pricingConfig?.optimizePsfType && pricingConfig.optimizePsfType !== metric) {
      setMetric(pricingConfig.optimizePsfType);
    }
  }, [pricingConfig?.optimizePsfType]);

  /* --------  PRE‑PROCESS UNITS (now via simulatePricing)  -------- */
  useEffect(() => {
    if (!data.length || !pricingConfig) return;
    setProcessed(simulatePricing(data, pricingConfig));
  }, [data, pricingConfig]);

  /* Handle metric change - update config */
  const handleMetricChange = (newMetric: "sellArea" | "acArea") => {
    setMetric(newMetric);
    onOptimized({
      ...pricingConfig,
      optimizePsfType: newMetric,
    });
  };

  /* Handle per-bedroom target change */
  const handlePerBedroomTargetChange = (type: string, value: number) => {
    setPerBedroomTargets(prev => ({ ...prev, [type]: value }));
  };

  /* Optimize single bedroom type */
  const handleOptimizeSingle = (type: string) => {
    const targetPsf = perBedroomTargets[type];
    if (!targetPsf || targetPsf <= 0) {
      toast.error(`Enter a valid target PSF for ${type}`);
      return;
    }
    
    setAnimateNums(true);
    setHighlightedTypes([type]);
    
    // Ensure baselines are stored in config when optimizing
    const configWithBaselines = baselineRef.current && Object.keys(baselineRef.current.saPsf).length > 0
      ? { ...pricingConfig, baselineAverages: baselineRef.current }
      : pricingConfig;
    
    // Update pricingConfig with baselines before optimizing (if not already there)
    if (!pricingConfig.baselineAverages && baselineRef.current) {
      // This is a one-time store of baselines
    }
    
    optimizeSingleBedroom(type, targetPsf, metric);
    toast.success(`${type} optimized!`);
    
    setTimeout(() => {
      setAnimateNums(false);
      setHighlightedTypes([]);
    }, 2000);
  };

  /* Revert single bedroom type to original baseline */
  const handleRevertSingle = (type: string) => {
    const baselineAvg = metric === "sellArea" 
      ? baselineAverages.saPsf[type] 
      : baselineAverages.acPsf[type];
    
    if (!baselineAvg) {
      toast.info(`No baseline found for ${type}`);
      return;
    }
    
    revertSingleBedroom(type);
    setPerBedroomTargets(prev => ({ ...prev, [type]: baselineAvg }));
    toast.success(`${type} reverted to original baseline`);
  };

  /* Check if type has been modified */
  const isTypeModified = (type: string) => {
    const config = pricingConfig?.bedroomTypePricing?.find((b: any) => b.type === type);
    if (!config) return false;
    return config.originalBasePsf !== undefined && config.originalBasePsf !== config.basePsf;
  };

  /* Get original baseline for display */
  const getBaselineForDisplay = (type: string): number => {
    const baseline = metric === "sellArea" 
      ? baselineAverages.saPsf[type] 
      : baselineAverages.acPsf[type];
    return baseline || 0;
  };

  /* helpers */
  const currentOverall =
    metric === "sellArea" ? currentOverallPsf : currentOverallAcPsf;

  /* ────────────────── render ────────────────── */
  return (
    <Card className="border-2 border-indigo-100 shadow-lg mb-6">
      {/* header */}
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-6 h-6 text-indigo-500" />
              Pricing Optimization &amp; Summary
            </CardTitle>
            <CardDescription className="text-indigo-700">
              Configure targets and view PSF breakdown
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="w-8 h-8 rounded-full">
                  <Info className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                Adjust individual bedroom type PSFs proportionally to hit your target while maintaining overall equilibrium.
              </TooltipContent>
            </Tooltip>
            {isOptimized && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                Optimized
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {/* content */}
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* LEFT column */}
          <div className="md:col-span-4 space-y-6">
            {/* current PSF */}
            <div className="rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 p-4 text-center shadow-md">
              <h3 className="text-indigo-700 text-lg font-medium">
                Current Overall PSF ({metric === "sellArea" ? "SA" : "AC"})
              </h3>
              <p className="text-3xl font-bold text-indigo-900 flex justify-center items-center">
                <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse mr-1" />
                <SlotNumber v={currentOverall} anim={animateNums} />
                <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse ml-1" />
              </p>
            </div>

            {/* PSF type selector */}
            <div className="rounded-lg border border-indigo-100 p-4 bg-white">
              <h3 className="text-sm font-medium text-indigo-700 mb-3">
                Select PSF Type to Optimize
              </h3>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  size="sm"
                  variant={metric === "sellArea" ? "default" : "outline"}
                  onClick={() => handleMetricChange("sellArea")}
                >
                  SA PSF (Sell Area)
                </Button>
                <Button
                  className="flex-1"
                  size="sm"
                  variant={metric === "acArea" ? "default" : "outline"}
                  onClick={() => handleMetricChange("acArea")}
                >
                  AC PSF (AC Area)
                </Button>
              </div>
            </div>

            {/* Per-bedroom PSF controls */}
            <div className="rounded-lg border border-indigo-100 p-4 bg-white">
              <h3 className="text-sm font-medium text-indigo-700 mb-3">
                Target PSF by Bedroom Type ({metric === "sellArea" ? "SA" : "AC"})
              </h3>
              <div className="space-y-3">
                {bedroomTypes.map((t) => {
                  const isModified = isTypeModified(t);
                  const baselineValue = getBaselineForDisplay(t);
                  const currentAvg = metric === "sellArea" 
                    ? currentAverages.saPsf[t] 
                    : currentAverages.acPsf[t];
                  
                  return (
                    <div
                      key={t}
                      className={`p-3 text-sm rounded-md border transition-colors ${
                        isModified
                          ? "bg-blue-50/50 border-blue-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-[60px]">
                          <span className="font-medium">{t}</span>
                          {currentAvg > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Avg: {fmt(currentAvg, 0)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <Input
                            type="number"
                            value={perBedroomTargets[t] || ""}
                            onChange={(e) => handlePerBedroomTargetChange(t, parseFloat(e.target.value) || 0)}
                            className="h-8 w-24 text-right border-slate-300 focus:border-indigo-400"
                            placeholder="PSF"
                          />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                                onClick={() => handleOptimizeSingle(t)}
                                disabled={isOptimizing}
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Optimize {t}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-8 px-2 ${isModified ? "text-blue-600 hover:bg-blue-100" : "text-slate-400 hover:bg-slate-100"}`}
                                onClick={() => handleRevertSingle(t)}
                                disabled={!baselineValue}
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Revert {t} to baseline ({fmt(baselineValue, 0)})</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      {baselineValue > 0 && (
                        <div className={`text-xs mt-1 ${isModified ? "text-blue-600" : "text-slate-500"}`}>
                          Original: {fmt(baselineValue, 0)} {metric === "sellArea" ? "SA" : "AC"} PSF
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT column */}
          <div className="md:col-span-8">
            <PricingSummary
              data={processed.length ? processed : data}
              showDollarSign={false}
              showAcPsf
              highlightedTypes={highlightedTypes}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 rounded-b text-sm text-muted-foreground">
        Base PSF optimization adjusts bedroom type PSF values proportionally to maintain overall equilibrium.
      </CardFooter>
    </Card>
  );
};

export default MegaOptimize;
