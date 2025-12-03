import React, { useEffect, useMemo, useState } from "react";
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
  const [metric, setMetric] = useState<"sellArea" | "acArea">("sellArea");
  const [processed, setProcessed] = useState<any[]>([]);
  const [highlightedTypes, setHighlightedTypes] = useState<string[]>([]);
  
  /* Per-bedroom target PSF inputs */
  const [perBedroomTargets, setPerBedroomTargets] = useState<Record<string, number>>({});

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

  /* Initialize per-bedroom targets from config */
  useEffect(() => {
    if (!pricingConfig?.bedroomTypePricing) return;
    const targets: Record<string, number> = {};
    pricingConfig.bedroomTypePricing.forEach((bt: any) => {
      targets[bt.type] = bt.basePsf || 0;
    });
    setPerBedroomTargets(targets);
  }, [pricingConfig]);

  /* --------  PRE‑PROCESS UNITS (now via simulatePricing)  -------- */
  useEffect(() => {
    if (!data.length || !pricingConfig) return;
    setProcessed(simulatePricing(data, pricingConfig));
  }, [data, pricingConfig]);

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
    
    optimizeSingleBedroom(type, targetPsf, metric);
    toast.success(`${type} optimized!`);
    
    setTimeout(() => {
      setAnimateNums(false);
      setHighlightedTypes([]);
    }, 2000);
  };

  /* Revert single bedroom type */
  const handleRevertSingle = (type: string) => {
    const originalPsf = getOriginalBasePsf(type);
    if (originalPsf === null) {
      toast.info(`${type} is already at original value`);
      return;
    }
    
    revertSingleBedroom(type);
    setPerBedroomTargets(prev => ({ ...prev, [type]: originalPsf }));
    toast.success(`${type} reverted to original`);
  };

  /* Check if type has been modified */
  const isTypeModified = (type: string) => {
    const config = pricingConfig?.bedroomTypePricing?.find((b: any) => b.type === type);
    if (!config) return false;
    return config.originalBasePsf !== undefined && config.originalBasePsf !== config.basePsf;
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
                  onClick={() => setMetric("sellArea")}
                >
                  SA PSF (Sell Area)
                </Button>
                <Button
                  className="flex-1"
                  size="sm"
                  variant={metric === "acArea" ? "default" : "outline"}
                  onClick={() => setMetric("acArea")}
                >
                  AC PSF (AC Area)
                </Button>
              </div>
            </div>

            {/* Per-bedroom PSF controls */}
            <div className="rounded-lg border border-indigo-100 p-4 bg-white">
              <h3 className="text-sm font-medium text-indigo-700 mb-3">
                Base PSF by Bedroom Type
              </h3>
              <div className="space-y-3">
                {bedroomTypes.map((t) => {
                  const config = pricingConfig.bedroomTypePricing.find((b: any) => b.type === t);
                  const isModified = isTypeModified(t);
                  
                  return (
                    <div
                      key={t}
                      className={`p-3 text-sm rounded-md border ${
                        isModified
                          ? "bg-amber-50 border-amber-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium min-w-[50px]">{t}</span>
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="number"
                            value={perBedroomTargets[t] || ""}
                            onChange={(e) => handlePerBedroomTargetChange(t, parseFloat(e.target.value) || 0)}
                            className="h-8 w-24 text-right border-indigo-200"
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
                                className={`h-8 px-2 ${isModified ? "text-amber-600 hover:bg-amber-100" : "text-gray-400"}`}
                                onClick={() => handleRevertSingle(t)}
                                disabled={!isModified}
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Revert {t} to original</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      {isModified && config?.originalBasePsf && (
                        <div className="text-xs text-amber-600 mt-1">
                          Original: {fmt(config.originalBasePsf)}
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
