import React, { useState, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, FileSpreadsheet, LineChart, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";

import CSVUploader       from "@/components/CSVUploader";
import ColumnMapper      from "@/components/ColumnMapper";
import PricingSimulator  from "@/components/PricingSimulator";

import { usePricingStore } from "@/store/pricingStore";

/* ------------------------------------------------------------- */

const Index = () => {
  /* local UI state */
  const [activeTab, setActiveTab] = useState<"upload" | "map" | "simulate">("upload");
  const [transitionDirection, setTransitionDirection] = useState<"forward" | "backward">("forward");
  const [tabChanging, setTabChanging] = useState(false);

  /* global store */
  const {
    csvData,
    csvHeaders,
    mappedData,
    pricingConfig,
    additionalCategories,
    setCsvData,
    setMappedData,
    setPricingConfig,
  } = usePricingStore();

  /* helpers */
  const maxFloor = useMemo(() => {
    if (!mappedData.length) return 50;
    const highest = Math.max(...mappedData.map(u => parseInt(u.floor as string) || 0), 0);
    return Math.max(highest + 5, 50);
  }, [mappedData]);

  const changeTab = (tab: "upload" | "map" | "simulate", dir: "forward" | "backward") => {
    setTransitionDirection(dir);
    setTabChanging(true);
    setTimeout(() => {
      setActiveTab(tab);
      setTabChanging(false);
    }, 300);
  };

  /* ---------------- step handlers ---------------- */
  const handleDataParsed = (rows: any[], headers: string[]) => {
    setCsvData(rows, headers);
    changeTab("map", "forward");
  };

  const handleMappingComplete = (
    mapping: Record<string, string>,
    rows: any[],
    categories: { column: string; categories: string[] }[],
  ) => {
    setMappedData(rows, categories);

    /* ------- build a quick default pricingConfig ------- */
    const BASE_PSF = 1_000;
    const uniqueTypes = [...new Set(rows.map(r => r.type).filter(Boolean))] as string[];
    const uniqueViews = [...new Set(rows.map(r => r.view).filter(Boolean))] as string[];

    const defaultConfig = {
      basePsf : BASE_PSF,
      bedroomTypePricing : uniqueTypes.map(t => ({ type: t, basePsf: BASE_PSF, targetAvgPsf: BASE_PSF })),
      viewPricing        : uniqueViews.map(v => ({ view: v, psfAdjustment: 0 })),
      floorRiseRules     : [{ startFloor: 1, endFloor: maxFloor, psfIncrement: 0, jumpEveryFloor: 0, jumpIncrement: 0 }],
      additionalCategoryPricing: categories.flatMap(cat =>
        cat.categories.map(val => ({ column: cat.column, category: val, psfAdjustment: 0 }))
      ),
      maxFloor,
    };

    setPricingConfig(defaultConfig);
    changeTab("simulate", "forward");
  };

  /* when user changes / applies a new configuration */
  const handleConfigUpdate = useCallback(
    (cfg: any) => {
      setPricingConfig(cfg);
    },
    [setPricingConfig],
  );

  /* manual tab clicks (guarding prerequisites) */
  const handleManualTab = (value: string) => {
    if (value !== "upload") {
      if (!csvData.length) {
        toast.error("Please upload a file first"); return;
      }
      if (value === "simulate" && !mappedData.length) {
        toast.error("Please map your columns first"); return;
      }
    }
    setTransitionDirection(value === "upload" ? "backward" : "forward");
    setTabChanging(true);
    setTimeout(() => {
      setActiveTab(value as any);
      setTabChanging(false);
    }, 300);
  };

  const getStepIcon = (step: string, active: boolean) => {
    const cls = `w-4 h-4 ${active ? "text-white" : "text-gray-600"}`;
    if (step === "upload")   return <Upload         className={cls} />;
    if (step === "map")      return <FileSpreadsheet className={cls} />;
    if (step === "simulate") return <LineChart      className={cls} />;
    return null;
  };

  const isTabDisabled = (t: string) =>
    (t === "map"      && !csvData.length)   ||
    (t === "simulate" && !mappedData.length);

  /* ----------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" closeButton richColors />

      {/* -------- header -------- */}
      <header className="gradient-bg py-8 text-white animate-fade-in">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3 mb-1">
            <PieChart className="w-8 h-8" />
            Price Prism Builder
          </h1>
          <p className="opacity-90">Dynamic real‑estate pricing simulation tool</p>
        </div>
      </header>

      {/* -------- main -------- */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={handleManualTab}>
          {/* step headers */}
          <TabsList className="grid grid-cols-3 w-full bg-gray-100 p-1 rounded-lg shadow-inner mb-8">
            {(["upload", "map", "simulate"] as const).map((step, i) => {
              const act  = activeTab === step;
              const past = (
                (step === "upload" && ["map","simulate"].includes(activeTab)) ||
                (step === "map"    &&  activeTab === "simulate")
              );
              return (
                <TabsTrigger
                  key={step}
                  value={step}
                  disabled={isTabDisabled(step)}
                  className={`
                    relative py-2 px-3 transition-all duration-300
                    ${act  ? "bg-indigo-600 text-white shadow-md" : ""}
                    ${past ? "bg-indigo-100 text-indigo-700"     : ""}
                    ${i===0 ? "rounded-l-md" : ""}
                    ${i===2 ? "rounded-r-md" : ""}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center
                      ${act ? "bg-indigo-500" : past ? "bg-indigo-200" : "bg-gray-200"}
                    `}>{i+1}</div>
                    <span className="hidden md:inline">
                      {step.charAt(0).toUpperCase() + step.slice(1)}
                    </span>
                    {getStepIcon(step, act)}
                  </div>
                  {i<2 && (
                    <div className="absolute -right-3 top-1/2 h-0.5 w-6 bg-gray-300 -translate-y-1/2 hidden md:block" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* -------- CONTENT -------- */}
          <div className={`transition-all duration-300 ${
            tabChanging
              ? transitionDirection === "forward"
                ? "opacity-0 translate-x-10"
                : "opacity-0 -translate-x-10"
              : "opacity-100 translate-x-0"
          }`}>

            {/* UPLOAD */}
            <TabsContent value="upload">
              <CSVUploader onDataParsed={handleDataParsed} />
            </TabsContent>

            {/* MAP */}
            <TabsContent value="map">
              {csvData.length && csvHeaders.length ? (
                <ColumnMapper
                  headers={csvHeaders}
                  data={csvData}
                  onMappingComplete={handleMappingComplete}
                  onBack={() => changeTab("upload", "backward")}
                />
              ) : null}
            </TabsContent>

            {/* SIMULATE */}
            <TabsContent value="simulate">
              {mappedData.length ? (
                <>
                  <div className="mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeTab("map", "backward")}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Map Columns
                    </Button>
                  </div>

                  {/* pricing config + table */}
                  <PricingSimulator
                    data={mappedData}
                    pricingConfig={pricingConfig}
                    onConfigUpdate={handleConfigUpdate}
                    additionalCategories={additionalCategories}
                    maxFloor={maxFloor}
                  />
                </>
              ) : null}
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* -------- footer -------- */}
      <footer className="bg-gray-800 text-white p-6 mt-10">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h2 className="font-bold text-xl flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Price Prism Builder
            </h2>
            <p className="text-sm opacity-75">Advanced real‑estate pricing simulation</p>
          </div>
          <div className="text-sm opacity-75">
            © {new Date().getFullYear()} Price Prism Builder. All rights reserved. <br />
            <span className="font-medium">Created by Dhananjay Shembe​kar</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
