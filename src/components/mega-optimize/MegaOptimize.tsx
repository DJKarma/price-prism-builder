import React, { useEffect, useState, useMemo } from "react";
import { Info, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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

/*─────────────────── helpers ───────────────────*/

const sortBedroomTypes = (a: any, b: any) => {
  const aT = a.type ?? "";
  const bT = b.type ?? "";
  const aN = aT.match(/\d+/);
  const bN = bT.match(/\d+/);
  if (aN && bN) return Number(aN[0]) - Number(bN[0]);
  return aT.localeCompare(bT);
};

const fmtNum = (n: number, d = 2, currencyLike = true) => {
  if (!isFinite(n) || n === 0) return "0";
  const fmt = (v: number, dp: number) =>
    v.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  if (currencyLike) {
    if (n >= 1_000_000) return fmt(n / 1_000_000, d) + "M";
    if (n >= 1_000)     return fmt(n / 1_000, 0) + "K";
  }
  return fmt(n, d);
};

const SlotNumber: React.FC<{
  value: number;
  decimals?: number;
  animate?: boolean;
  currencyLike?: boolean;
}> = ({ value, decimals = 2, animate = false, currencyLike = true }) => {
  const [disp, setDisp] = useState(value);
  useEffect(() => {
    if (!animate || Math.abs(disp - value) < 0.01) {
      setDisp(value);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      if (i >= 5) {
        clearInterval(id);
        setDisp(value);
        return;
      }
      const p = i / 5;
      const eased = 1 - Math.pow(1 - p, 3);
      const mid = disp + (value - disp) * eased;
      const rand = (Math.random() - 0.5) * (1 - p) * Math.abs(value - disp) * 0.15;
      setDisp(Number((mid + rand).toFixed(decimals + 1)));
      i++;
    }, 80);
    return () => clearInterval(id);
  }, [value, animate]);
  return (
    <span className={animate ? "transition-transform scale-105" : ""}>
      {currencyLike ? fmtNum(disp, decimals) : disp.toFixed(decimals)}
    </span>
  );
};

/*─────────────────── component ───────────────────*/

const MegaOptimize: React.FC<MegaOptimizeProps> = ({
  data,
  pricingConfig,
  onOptimized,
}) => {
  /* bedroom‑type list */
  const bedroomTypes = useMemo(() => {
    if (!pricingConfig?.bedroomTypePricing) return [];
    return [...pricingConfig.bedroomTypePricing].sort(sortBedroomTypes).map((t: any) => t.type);
  }, [pricingConfig]);

  /* local UI state */
  const [selectedTypes, setSelectedTypes] = useState<string[]>(bedroomTypes);
  const [highlighted, setHighlighted]   = useState<string[]>([]);
  const [animateNums, setAnimateNums]   = useState(false);
  const [metric, setMetric] = useState<"sellArea" | "acArea">("sellArea");
  const [processed, setProcessed] = useState<any[]>([]);

  /* optimiser hook */
  const {
    isOptimizing,
    isOptimized,
    targetPsf,
    optimizationMode,
    currentOverallPsf,
    currentOverallAcPsf,
    setOptimizationMode,
    handleTargetPsfChange,
    runMegaOptimization,
    revertOptimization,
  } = useOptimizer(data, pricingConfig, onOptimized);

  /* preprocess every time */
  useEffect(() => {
    if (!data.length || !pricingConfig) return;
    const calc = data.map((u) => {
      const bed = pricingConfig.bedroomTypePricing.find((b: any) => b.type === u.type);
      const base = bed?.basePsf ?? pricingConfig.basePsf;

      /* floor premiums (cumulative) */
      let floorAdj = 0;
      const lvl = Number(u.floor) || 1;
      [...pricingConfig.floorRiseRules]
        .sort((a: any, b: any) => a.startFloor - b.startFloor)
        .forEach((r: any) => {
          const end = r.endFloor ?? 999;
          if (lvl < r.startFloor) return;
          const stop = Math.min(end, lvl);
          for (let f = r.startFloor; f <= stop; f++) {
            floorAdj += r.psfIncrement;
            if (r.jumpEveryFloor && r.jumpIncrement) {
              if ((f - r.startFloor + 1) % r.jumpEveryFloor === 0)
                floorAdj += r.jumpIncrement;
            }
          }
        });

      const viewAdj =
        pricingConfig.viewPricing.find((v: any) => v.view === u.view)?.psfAdjustment ??
        0;

      let extraAdj = 0;
      pricingConfig.additionalCategoryPricing?.forEach((c: any) => {
        if (u[`${c.column}_value`] === c.category) extraAdj += c.psfAdjustment;
      });

      const sa = Number(u.sellArea) || 0;
      const ac = Number(u.acArea) || 0;
      const psf = base + floorAdj + viewAdj + extraAdj;
      const tot = Math.ceil((psf * sa) / 1000) * 1000;

      return {
        ...u,
        basePsf: base,
        floorAdjustment: floorAdj,
        viewPsfAdjustment: viewAdj,
        additionalAdjustment: extraAdj,
        totalPrice: psf * sa,
        finalTotalPrice: tot,
        finalPsf: sa ? tot / sa : 0,
        finalAcPsf: ac ? tot / ac : 0,
        sellArea: Number(sa.toFixed(2)),
        acArea: Number(ac.toFixed(2)),
      };
    });
    setProcessed(calc);
  }, [data, pricingConfig]);

  /* handlers */
  const optimise = () => {
    if (!selectedTypes.length) {
      toast.error("Select at least one bedroom type");
      return;
    }
    setAnimateNums(true);
    toast.promise(
      new Promise((res) => {
        runMegaOptimization(selectedTypes, metric);
        setHighlighted(selectedTypes);
        setTimeout(() => {
          setHighlighted([]);
          setAnimateNums(false);
        }, 3000);
        setTimeout(res, 800);
      }),
      {
        loading: "Optimizing...",
        success: "Optimization complete",
        error: "Optimization failed",
      }
    );
  };

  const revert = () => {
    revertOptimization();
    toast.success("Optimization reverted");
  };

  const getTargetByType = (t: string) =>
    pricingConfig.bedroomTypePricing.find((b: any) => b.type === t)?.targetAvgPsf ??
    0;

  /*─────────────────── JSX ───────────────────*/
  return (
    <Card className="w-full mb-6 border-2 border-indigo-100 shadow-lg">
      {/* header */}
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-500" />
              Pricing Optimization &amp; Summary
            </CardTitle>
            <CardDescription className="text-indigo-700">
              Configure optimization targets and view bedroom‑type breakdown
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="w-8 h-8 rounded-full">
                  <Info className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px]">
                Mega Optimize adjusts premiums via constrained gradient descent
                to hit your target PSF with minimal deviation from baseline.
              </TooltipContent>
            </Tooltip>
            {isOptimized && (
              <Badge
                variant="outline"
                className="border-green-200 bg-green-50 text-green-700"
              >
                Optimized
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {/* content */}
      <CardContent className="pt-6">
        {/* 12‑column grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* LEFT COLUMN (4/12) */}
          <div className="md:col-span-4 space-y-6">
            {/* Current PSF */}
            <div className="p-4 text-center rounded-lg shadow-md bg-gradient-to-br from-indigo-100 to-purple-100 hover:scale-[1.02] transition-transform">
              <h3 className="text-lg font-medium text-indigo-700">
                Current Overall PSF ({metric === "sellArea" ? "SA" : "AC"})
              </h3>
              <p className="text-3xl font-bold text-indigo-900 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse mr-1" />
                <SlotNumber
                  value={metric === "sellArea" ? currentOverallPsf : currentOverallAcPsf}
                  animate={animateNums}
                  currencyLike={false}
                />
                <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse ml-1" />
              </p>
            </div>

            {/* Target PSF by type */}
            <div className="p-4 rounded-lg bg-white border border-indigo-100">
              <h3 className="text-sm font-medium text-indigo-700 mb-3">
                Target PSF by Bedroom Type
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {bedroomTypes.map((t) => (
                  <div
                    key={t}
                    className={`flex justify-between items-center p-2 rounded-md text-sm ${
                      selectedTypes.includes(t)
                        ? "bg-indigo-50 border border-indigo-200"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <span>{t}</span>
                    <span className="font-bold">
                      <SlotNumber
                        value={getTargetByType(t)}
                        animate={animateNums && selectedTypes.includes(t)}
                        currencyLike={false}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* bedroom selector */}
            <BedroomTypeSelector
              bedroomTypes={bedroomTypes}
              selectedTypes={selectedTypes}
              setSelectedTypes={setSelectedTypes}
            />

            {/* select PSF metric */}
            <div className="p-4 rounded-lg bg-white border border-indigo-100">
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
          </div>

          {/* RIGHT COLUMN (8/12) */}
          <div className="md:col-span-8">
            <PricingSummary
              data={processed.length ? processed : data}
              showDollarSign={false}
              highlightedTypes={highlighted}
              showAcPsf
            />
          </div>

          {/* SLIDER + BUTTONS (row 2, 4/12) */}
          <div className="md:col-span-4">
            <OptimizationControls
              currentOverallPsf={
                metric === "sellArea" ? currentOverallPsf : currentOverallAcPsf
              }
              targetPsf={targetPsf}
              isOptimizing={isOptimizing}
              isOptimized={isOptimized}
              onTargetPsfChange={handleTargetPsfChange}
              onOptimize={optimise}
              onRevert={revert}
              psfTypeLabel={metric === "sellArea" ? "SA" : "AC"}
            />
          </div>

          {/* MODE SELECTOR (row 2, 4/12) */}
          <div className="md:col-span-4">
            <OptimizationModeSelector
              optimizationMode={optimizationMode}
              onModeChange={setOptimizationMode}
            />
          </div>
        </div>
      </CardContent>

      {/* footer */}
      <CardFooter className="bg-gradient-to-r from-indigo-50/50 to-blue-50/50 p-4 rounded-b text-sm text-muted-foreground flex flex-col items-start">
        <p>
          {optimizationMode === "basePsf"
            ? "Base PSF optimisation adjusts only bedroom‑type PSF values."
            : optimizationMode === "allParams" &&
              pricingConfig.additionalCategoryPricing?.length
            ? "All‑parameter optimisation adjusts bedroom PSF, floor premiums, view and extra‑category adjustments."
            : "All‑parameter optimisation adjusts bedroom PSF, floor premiums, and view adjustments."}
        </p>
      </CardFooter>
    </Card>
  );
};

export default MegaOptimize;
