import React, { useEffect, useMemo, useState } from "react";
import { Info, Sparkles } from "lucide-react";
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
import { toast } from "sonner";

import { MegaOptimizeProps } from "./types";
import { useOptimizer } from "./useOptimizer";
import BedroomTypeSelector from "./BedroomTypeSelector";
import OptimizationControls from "./OptimizationControls";
import OptimizationModeSelector from "./OptimizationModeSelector";
import PricingSummary from "@/components/PricingSummary";

/* ────────── helpers (unchanged) ────────── */

const sortTypes = (a: any, b: any) => {
  const aM = (a.type ?? "").match(/\d+/);
  const bM = (b.type ?? "").match(/\d+/);
  if (aM && bM) return Number(aM[0]) - Number(bM[0]);
  return (a.type ?? "").localeCompare(b.type ?? "");
};

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
      if (i === 6) return clearInterval(id);
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

/* ────────── component ────────── */

const MegaOptimize: React.FC<MegaOptimizeProps> = ({
  data,
  pricingConfig,
  onOptimized,
}) => {
  /* lists */
  const bedroomTypes = useMemo(
    () =>
      [...(pricingConfig?.bedroomTypePricing ?? [])]
        .sort(sortTypes)
        .map((t: any) => t.type),
    [pricingConfig]
  );

  /* local UI */
  const [selectedTypes, setSelectedTypes] = useState<string[]>(bedroomTypes);
  const [animate, setAnimate] = useState(false);
  const [metric, setMetric] = useState<"sellArea" | "acArea">("sellArea");
  const [processed, setProcessed] = useState<any[]>([]);

  /* optimizer hook */
  const {
    isOptimized,
    isOptimizing,
    targetPsf,
    optimizationMode,
    currentOverallPsf,
    currentOverallAcPsf,
    setOptimizationMode,
    handleTargetPsfChange,
    runMegaOptimization,
    revertOptimization,
  } = useOptimizer(data, pricingConfig, onOptimized);

  /* preprocess units (unchanged logic) */
  useEffect(() => {
    if (!data.length || !pricingConfig) return;
    const out = data.map((u) => {
      const bed = pricingConfig.bedroomTypePricing.find((b: any) => b.type === u.type);
      const base = bed?.basePsf ?? pricingConfig.basePsf;
      const sa = Number(u.sellArea) || 0;
      const psf = base;
      const total = Math.ceil((psf * sa) / 1000) * 1000;
      return { ...u, finalPsf: sa ? total / sa : 0, finalTotalPrice: total };
    });
    setProcessed(out);
  }, [data, pricingConfig]);

  /* handlers */
  const optimise = () => {
    if (!selectedTypes.length) return toast.error("Select bedroom types");
    setAnimate(true);
    toast.promise(
      new Promise((res) => {
        runMegaOptimization(selectedTypes, metric);
        setTimeout(() => setAnimate(false), 1500);
        setTimeout(res, 700);
      }),
      { loading: "Optimizing…", success: "Done!", error: "Failed" }
    );
  };

  /* helpers */
  const currentOverall =
    metric === "sellArea" ? currentOverallPsf : currentOverallAcPsf;

  /* ────────── render ────────── */
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
                Mega Optimize tweaks premiums with constrained gradient descent to
                hit your target PSF.
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

      {/* content */}
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* LEFT (setup) */}
          <div className="md:col-span-4 space-y-6">
            {/* Current PSF */}
            <div className="rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 p-4 text-center shadow-md">
              <h3 className="text-indigo-700 text-lg font-medium">
                Current Overall PSF ({metric === "sellArea" ? "SA" : "AC"})
              </h3>
              <p className="text-3xl font-bold text-indigo-900 flex justify-center items-center">
                <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse mr-1" />
                <SlotNumber v={currentOverall} anim={animate} />
                <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse ml-1" />
              </p>
            </div>

            {/* Target PSF by type */}
            <div className="rounded-lg border border-indigo-100 p-4 bg-white">
              <h3 className="text-sm font-medium text-indigo-700 mb-3">
                Target PSF by Bedroom Type
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {bedroomTypes.map((t) => (
                  <div
                    key={t}
                    className={`p-2 text-sm rounded-md flex justify-between ${
                      selectedTypes.includes(t)
                        ? "bg-indigo-50 border border-indigo-200"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <span>{t}</span>
                    <span className="font-bold">
                      {pricingConfig.bedroomTypePricing.find((b: any) => b.type === t)
                        ?.targetAvgPsf ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bedroom selector */}
            <BedroomTypeSelector
              bedroomTypes={bedroomTypes}
              selectedTypes={selectedTypes}
              setSelectedTypes={setSelectedTypes}
            />
          </div>

          {/* RIGHT (summary) */}
          <div className="md:col-span-8">
            <PricingSummary
              data={processed.length ? processed : data}
              showDollarSign={false}
              showAcPsf
            />
          </div>

          {/* ───── second row: 3 items in‑line ───── */}
          <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Select PSF metric */}
            <div className="md:col-span-4 rounded-lg border border-indigo-100 p-4 bg-white">
              <h3 className="text-sm font-medium text-indigo-700 mb-3">
                Select PSF Type to Optimize
              </h3>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  size="sm"
                  variant={metric === "sellArea" ? "default" : "outline"}
                  onClick={() => setMetric("sellArea")}
                >
                  SA PSF (Sell Area)
                </Button>
                <Button
                  className="flex-1"
                  size="sm"
                  variant={metric === "acArea" ? "default" : "outline"}
                  onClick={() => setMetric("acArea")}
                >
                  AC PSF (AC Area)
                </Button>
              </div>
            </div>

            {/* Target slider & buttons */}
            <div className="md:col-span-4">
              <OptimizationControls
                currentOverallPsf={currentOverall}
                targetPsf={targetPsf}
                isOptimizing={isOptimizing}
                isOptimized={isOptimized}
                onTargetPsfChange={handleTargetPsfChange}
                onOptimize={optimise}
                onRevert={revertOptimization}
                psfTypeLabel={metric === "sellArea" ? "SA" : "AC"}
              />
            </div>

            {/* Mode selector */}
            <div className="md:col-span-4">
              <OptimizationModeSelector
                optimizationMode={optimizationMode}
                onModeChange={setOptimizationMode}
              />
            </div>
          </div>
        </div>
      </CardContent>

      {/* footer */}
      <CardFooter className="p-4 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 rounded-b text-sm text-muted-foreground">
        {optimizationMode === "basePsf"
          ? "Base PSF optimisation adjusts only bedroom‑type PSF values."
          : "All‑parameter optimisation adjusts bedroom PSF, floor premiums, and view adjustments."}
      </CardFooter>
    </Card>
  );
};

export default MegaOptimize;
