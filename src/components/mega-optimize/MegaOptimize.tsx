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

/* ————————————————————————————————————————————— helpers ———————————————————— */

const sortBedroomTypes = (a: any, b: any) => {
  const aType = a.type || "";
  const bType = b.type || "";

  const aMatch = aType.match(/(\d+)/);
  const bMatch = bType.match(/(\d+)/);

  if (aMatch && bMatch) {
    return parseInt(aMatch[0], 10) - parseInt(bMatch[0], 10);
  }

  return aType.localeCompare(bType);
};

const formatNumber = (
  num: number,
  decimals = 2,
  formatAsCurrency = true
): string => {
  if (!isFinite(num) || num === 0) return "0";

  const formatWithCommas = (value: number, dp: number): string =>
    value.toLocaleString("en-US", {
      minimumFractionDigits: dp,
      maximumFractionDigits: dp,
    });

  if (formatAsCurrency) {
    if (num >= 1_000_000) return formatWithCommas(num / 1_000_000, decimals) + "M";
    if (num >= 1_000) return formatWithCommas(num / 1_000, 0) + "K";
  }
  return formatWithCommas(num, decimals);
};

/* Slot‑machine number animation */
const SlotMachineNumber = ({
  value,
  decimals = 2,
  isAnimating = false,
  formatAsCurrency = true,
}: {
  value: number;
  decimals?: number;
  isAnimating?: boolean;
  formatAsCurrency?: boolean;
}) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (isAnimating && Math.abs(value - displayValue) > 0.01) {
      let iterations = 0;
      const maxIterations = 5;
      const interval = setInterval(() => {
        if (iterations < maxIterations) {
          const progress = iterations / maxIterations;
          const easing = 1 - Math.pow(1 - progress, 3); // cubic‑ease‑out
          const intermediate = displayValue + (value - displayValue) * easing;

          const randomness = (1 - progress) * Math.abs(value - displayValue) * 0.15;
          const randomAdj = (Math.random() - 0.5) * randomness;

          setDisplayValue(
            parseFloat((intermediate + randomAdj).toFixed(decimals + 1))
          );
          iterations++;
        } else {
          clearInterval(interval);
          setDisplayValue(value);
        }
      }, 80);
      return () => clearInterval(interval);
    }
    setDisplayValue(value);
  }, [value, isAnimating]);

  const formatted = formatAsCurrency
    ? formatNumber(displayValue, decimals)
    : displayValue.toFixed(decimals);

  return (
    <span className={`transition-all duration-200 ${isAnimating ? "scale-105" : ""}`}>
      {formatted}
    </span>
  );
};

/* ——————————————————————————————— main component ————————————————————————— */

const MegaOptimize: React.FC<MegaOptimizeProps> = ({
  data,
  pricingConfig,
  onOptimized,
}) => {
  /* ---------------- derived lists ---------------- */
  const sortedBedroomTypes = useMemo(() => {
    if (!pricingConfig?.bedroomTypePricing) return [];
    return [...pricingConfig.bedroomTypePricing].sort(sortBedroomTypes);
  }, [pricingConfig]);

  const bedroomTypes = useMemo(() => {
    if (!pricingConfig?.bedroomTypePricing) return [];
    return [...pricingConfig.bedroomTypePricing]
      .sort(sortBedroomTypes)
      .map((t: any) => t.type);
  }, [pricingConfig]);

  /* ---------------- local UI state ---------------- */
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    sortedBedroomTypes.map((t: any) => t.type)
  );
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [highlightedTypes, setHighlightedTypes] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [optimizePsfType, setOptimizePsfType] =
    useState<"sellArea" | "acArea">("sellArea");

  /* ---------------- optimizer hook ---------------- */
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

  /* ---------------- preprocess data ---------------- */
  useEffect(() => {
    if (!data?.length || !pricingConfig) return;

    const processed = data.map((unit) => {
      /* bedroom base */
      const bedCfg = pricingConfig.bedroomTypePricing.find(
        (b: any) => b.type === unit.type
      );
      const basePsf = bedCfg?.basePsf || pricingConfig.basePsf;

      /* floor premium */
      let floorAdj = 0;
      const floorLevel = parseInt(unit.floor) || 1;
      const sortedFloorRules = [...pricingConfig.floorRiseRules].sort(
        (a: any, b: any) => a.startFloor - b.startFloor
      );

      let cumulative = 0;
      for (const rule of sortedFloorRules) {
        const ruleEnd = rule.endFloor ?? 999;
        const iterateTo = Math.min(ruleEnd, floorLevel);
        for (
          let lvl = Math.max(rule.startFloor, 1);
          lvl <= iterateTo;
          lvl++
        ) {
          cumulative += rule.psfIncrement;
          if (rule.jumpEveryFloor && rule.jumpIncrement) {
            if ((lvl - rule.startFloor + 1) % rule.jumpEveryFloor === 0) {
              cumulative += rule.jumpIncrement;
            }
          }
        }
        if (floorLevel <= ruleEnd) break;
      }
      floorAdj = cumulative;

      /* view adj */
      const viewAdj =
        pricingConfig.viewPricing.find((v: any) => v.view === unit.view)
          ?.psfAdjustment || 0;

      /* additional categories */
      let addAdj = 0;
      pricingConfig.additionalCategoryPricing?.forEach((cat: any) => {
        if (unit[`${cat.column}_value`] === cat.category)
          addAdj += cat.psfAdjustment;
      });

      const sellArea = parseFloat(unit.sellArea) || 0;
      const acArea = parseFloat(unit.acArea) || 0;
      const psfWithAdj = basePsf + floorAdj + viewAdj + addAdj;
      const totPrice = psfWithAdj * sellArea;
      const finalTot = Math.ceil(totPrice / 1000) * 1000;
      const finalPsf = sellArea ? finalTot / sellArea : 0;
      const finalAcPsf = acArea ? finalTot / acArea : 0;

      return {
        ...unit,
        basePsf,
        floorAdjustment: floorAdj,
        viewPsfAdjustment: viewAdj,
        additionalAdjustment: addAdj,
        totalPrice: totPrice,
        finalTotalPrice: finalTot,
        finalPsf,
        finalAcPsf,
        sellArea: Number(sellArea.toFixed(2)),
        acArea: Number(acArea.toFixed(2)),
      };
    });

    setProcessedData(processed);
  }, [data, pricingConfig]);

  /* ---------------- handlers ---------------- */
  const handleRunOptimization = () => {
    if (!selectedTypes.length) {
      toast.error("Please select at least one bedroom type to optimize");
      return;
    }
    setIsAnimating(true);
    toast.promise(
      new Promise((resolve) => {
        runMegaOptimization(selectedTypes, optimizePsfType);
        setHighlightedTypes(selectedTypes);
        setTimeout(() => {
          setHighlightedTypes([]);
          setIsAnimating(false);
        }, 3000);
        setTimeout(resolve, 1000);
      }),
      {
        loading: "Optimizing pricing...",
        success: `Optimization complete for ${selectedTypes.length} bedroom type${
          selectedTypes.length > 1 ? "s" : ""
        }`,
        error: "Optimization failed",
      }
    );
  };

  const handleRevert = () => {
    revertOptimization();
    toast.success("Optimization reverted successfully");
  };

  const getTargetPsfByType = (type: string) =>
    pricingConfig.bedroomTypePricing.find((t: any) => t.type === type)
      ?.targetAvgPsf || 0;

  /* ———————————————————————— render ———————————————————————— */

  return (
    <Card className="mb-6 w-full border-2 border-indigo-100 shadow-lg">
      {/* =========================== HEADER =========================== */}
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          {/* title */}
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-6 h-6 text-indigo-500" />
              Pricing Optimization &amp; Summary
            </CardTitle>
            <CardDescription className="text-indigo-700">
              Configure optimization targets and view property‑type breakdown
            </CardDescription>
          </div>

          {/* info button + status */}
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                  <Info className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px]">
                <p>
                  Mega Optimize uses constrained gradient descent to adjust&nbsp;
                  premiums and hit a target PSF while minimizing deviation from
                  current values.
                </p>
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

      {/* =========================== CONTENT ========================= */}
      <CardContent className="pt-6">
        {/* 12‑column responsive grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* --------------- LEFT: controls (4/12) --------------- */}
          <div className="md:col-span-4 space-y-6">

            {/* Current overall PSF */}
            <div className="rounded-lg p-4 text-center bg-gradient-to-r from-indigo-100 to-purple-100 shadow-md transform transition-transform hover:scale-105">
              <h3 className="text-lg font-medium text-indigo-700">
                Current Overall PSF (
                {optimizePsfType === "sellArea" ? "SA" : "AC"})
              </h3>
              <p className="text-3xl font-bold text-indigo-900 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-yellow-500 mr-2 animate-pulse" />
                <SlotMachineNumber
                  value={
                    optimizePsfType === "sellArea"
                      ? currentOverallPsf
                      : currentOverallAcPsf
                  }
                  isAnimating={isAnimating}
                  formatAsCurrency={false}
                />
                <Sparkles className="w-5 h-5 text-yellow-500 ml-2 animate-pulse" />
              </p>
              {isOptimized && (
                <Badge className="mt-2 bg-green-100 text-green-800 hover:bg-green-200">
                  Optimized
                </Badge>
              )}
            </div>

            {/* Target PSF by bedroom type */}
            <div className="border border-indigo-100 bg-white rounded-lg p-4">
              <h3 className="mb-3 text-sm font-medium text-indigo-700">
                Target PSF by Bedroom Type
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {bedroomTypes.map((type) => (
                  <div
                    key={type}
                    className={`flex items-center justify-between rounded-md p-2 text-sm ${
                      selectedTypes.includes(type)
                        ? "bg-indigo-50 border border-indigo-200"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <span className="font-medium">{type}</span>
                    <span className="font-bold">
                      <SlotMachineNumber
                        value={getTargetPsfByType(type)}
                        isAnimating={isAnimating && selectedTypes.includes(type)}
                        formatAsCurrency={false}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bedroom‑type multi‑select */}
            <BedroomTypeSelector
              bedroomTypes={bedroomTypes}
              selectedTypes={selectedTypes}
              setSelectedTypes={setSelectedTypes}
            />

            {/* PSF metric toggle */}
            <div className="p-4 mb-4 border border-indigo-100 bg-white rounded-lg">
              <h3 className="mb-3 text-sm font-medium text-indigo-700">
                Select PSF Type to Optimize
              </h3>
              <div className="flex gap-2">
                <Button
                  variant={optimizePsfType === "sellArea" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setOptimizePsfType("sellArea")}
                >
                  SA PSF (Sell Area)
                </Button>
                <Button
                  variant={optimizePsfType === "acArea" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setOptimizePsfType("acArea")}
                >
                  AC PSF (AC Area)
                </Button>
              </div>
            </div>

            {/* Target slider & optimise/revert buttons */}
            <OptimizationControls
              currentOverallPsf={
                optimizePsfType === "sellArea"
                  ? currentOverallPsf
                  : currentOverallAcPsf
              }
              targetPsf={targetPsf}
              isOptimizing={isOptimizing}
              isOptimized={isOptimized}
              onTargetPsfChange={handleTargetPsfChange}
              onOptimize={handleRunOptimization}
              onRevert={handleRevert}
              psfTypeLabel={optimizePsfType === "sellArea" ? "SA" : "AC"}
            />

            {/* Optimisation‑mode selector */}
            <OptimizationModeSelector
              optimizationMode={optimizationMode}
              onModeChange={setOptimizationMode}
            />
          </div>

          {/* --------------- RIGHT: summary (8/12) --------------- */}
          <div className="md:col-span-8">
            <PricingSummary
              data={processedData.length ? processedData : data}
              showDollarSign={false}
              highlightedTypes={highlightedTypes}
              showAcPsf
            />
          </div>
        </div>
      </CardContent>

      {/* =========================== FOOTER ========================== */}
      <CardFooter className="bg-gradient-to-r from-indigo-50/50 to-blue-50/50 rounded-b p-4 text-sm text-muted-foreground flex flex-col items-start">
        <p>
          {optimizationMode === "basePsf"
            ? "Base PSF optimisation adjusts only bedroom‑type PSF values to reach target overall PSF."
            : optimizationMode === "allParams" &&
              pricingConfig.additionalCategoryPricing?.length > 0
            ? "Full‑parameter optimisation fine‑tunes bedroom PSF, floor premiums, view adjustments, and additional category adjustments."
            : "Full‑parameter optimisation fine‑tunes bedroom PSF, floor premiums, and view adjustments while preserving the cumulative nature of floor premiums."}
        </p>
      </CardFooter>
    </Card>
  );
};

export default MegaOptimize;
