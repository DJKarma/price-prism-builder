import React, { useState, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CSVUploader from "@/components/CSVUploader";
import ColumnMapper from "@/components/ColumnMapper";
import PricingSimulator from "@/components/PricingSimulator";
import MegaOptimize from "@/components/MegaOptimize";
import CollapsibleConfigPanel from "@/components/pricing-simulator/CollapsibleConfigPanel";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, FileSpreadsheet, LineChart, PieChart } from "lucide-react";
import { usePricingStore } from "@/store/pricingStore";

const Index = () => {
  /* ---------------- local UI state ---------------- */
  const [activeTab, setActiveTab] = useState<"upload" | "map" | "simulate">("upload");
  const [transitionDirection, setTransitionDirection] = useState<"forward" | "backward">("forward");
  const [tabChanging, setTabChanging] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  /* ---------------- global store ---------------- */
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

  /* -------------- helpers ---------------- */
  const maxFloor = useMemo(() => {
    if (!mappedData.length) return 50;
    const highest = Math.max(
      ...mappedData.map((u) => parseInt(u.floor as string) || 0),
      0
    );
    return Math.max(highest + 5, 50);
  }, [mappedData]);

  const changeTab = (
    tab: "upload" | "map" | "simulate",
    dir: "forward" | "backward"
  ) => {
    setTransitionDirection(dir);
    setTabChanging(true);
    setTimeout(() => {
      setActiveTab(tab);
      setTabChanging(false);
    }, 300);
  };

  /* ---------------- step handlers ---------------- */
  const handleDataParsed = (data: any[], headers: string[]) => {
    setCsvData(data, headers);
    changeTab("map", "forward");
  };

  const handleMappingComplete = (
    mapping: Record<string, string>,
    data: any[],
    categories: { column: string; categories: string[] }[]
  ) => {
    setMappedData(data, categories);

    const BASE_PSF = 1000;
    const uniqueTypes = Array.from(
      new Set(data.map((u) => u.type).filter((t: string) => t?.trim()))
    ) as string[];
    const bedroomTypePricing = uniqueTypes.map((t) => ({
      type: t,
      basePsf: BASE_PSF,
      targetAvgPsf: BASE_PSF,
    }));

    const uniqueViews = Array.from(
      new Set(data.map((u) => u.view).filter((v: string) => v?.trim()))
    ) as string[];
    const viewPricing = uniqueViews.map((v) => ({
      view: v,
      psfAdjustment: 0,
    }));

    const additionalCategoryPricing = categories.flatMap((cat) =>
      cat.categories.map((value) => ({
        column: cat.column,
        category: value,
        psfAdjustment: 0,
      }))
    );

    const defaultConfig = {
      basePsf: BASE_PSF,
      bedroomTypePricing,
      viewPricing,
      floorRiseRules: [
        {
          startFloor: 1,
          endFloor: maxFloor,
          psfIncrement: 0,
          jumpEveryFloor: 0,
          jumpIncrement: 0,
        },
      ],
      additionalCategoryPricing,
      maxFloor,
    };

    setPricingConfig(defaultConfig);
    changeTab("simulate", "forward");
  };

  /* when user clicks “Apply configuration” later */
  const handleConfigUpdate = useCallback(
    (updated: any) => {
      setPricingConfig(updated);
      setForceUpdate((p) => p + 1);
    },
    [setPricingConfig]
  );

  /* ---------------- manual tab clicks ---------------- */
  const handleManualTabChange = (value: string) => {
    if (value !== "upload") {
      if (!csvData.length) {
        toast.error("Please upload a file first");
        return;
      }
      if (value === "simulate" && !mappedData.length) {
        toast.error("Please map your columns first");
        return;
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
    const cls = `h-4 w-4 ${active ? "text-white" : "text-gray-600"}`;
    if (step === "upload") return <Upload className={cls} />;
    if (step === "map") return <FileSpreadsheet className={cls} />;
    if (step === "simulate") return <LineChart className={cls} />;
    return null;
  };

  const isTabDisabled = (tab: string) =>
    (tab === "map" && !csvData.length) ||
    (tab === "simulate" && !mappedData.length);

  /* ---------------- JSX ---------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" closeButton richColors />

      {/* header */}
      <header className="gradient-bg text-white py-8 animate-fade-in">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center">
            <PieChart className="h-8 w-8 mr-3" />
            Price Prism Builder
          </h1>
          <p className="text-lg opacity-90">
            Dynamic real estate pricing simulation tool
          </p>
        </div>
      </header>

      {/* main */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={handleManualTabChange}>
          {/* step headers */}
          <TabsList className="grid w-full grid-cols-3 mb-8 p-1 bg-gray-100 rounded-lg shadow-inner">
            {(["upload", "map", "simulate"] as const).map((step, idx) => {
              const active = activeTab === step;
              const past =
                (step === "upload" && ["map", "simulate"].includes(activeTab)) ||
                (step === "map" && activeTab === "simulate");

              return (
                <TabsTrigger
                  key={step}
                  value={step}
                  disabled={isTabDisabled(step)}
                  className={`
                    relative py-2 px-3 transition-all duration-300
                    ${active ? "bg-indigo-600 text-white shadow-md" : ""}
                    ${past ? "bg-indigo-100 text-indigo-700" : ""}
                    ${idx === 0 ? "rounded-l-md" : ""}
                    ${idx === 2 ? "rounded-r-md" : ""}
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className={`
                        flex items-center justify-center rounded-full w-6 h-6
                        ${
                          active
                            ? "bg-indigo-500"
                            : past
                            ? "bg-indigo-200"
                            : "bg-gray-200"
                        }
                      `}
                    >
                      {idx + 1}
                    </div>
                    <span className="hidden md:inline">
                      {step.charAt(0).toUpperCase() + step.slice(1)}
                    </span>
                    {getStepIcon(step, active)}
                  </div>
                  {idx < 2 && (
                    <div className="absolute top-1/2 -right-3 w-6 h-0.5 bg-gray-300 transform -translate-y-1/2 z-0 hidden md:block" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* step content */}
          <div
            className={`transition-all duration-300 ${
              tabChanging
                ? transitionDirection === "forward"
                  ? "opacity-0 translate-x-10"
                  : "opacity-0 -translate-x-10"
                : "opacity-100 translate-x-0"
            }`}
          >
            {/* UPLOAD */}
            <TabsContent value="upload" className="mt-0 animate-fade-in">
              <CSVUploader onDataParsed={handleDataParsed} />
            </TabsContent>

            {/* MAP */}
            <TabsContent value="map" className="mt-0 animate-fade-in">
              {csvData.length > 0 && csvHeaders.length > 0 && (
                <ColumnMapper
                  headers={csvHeaders}
                  data={csvData}
                  onMappingComplete={handleMappingComplete}
                  onBack={() => changeTab("upload", "backward")}
                />
              )}
            </TabsContent>

            {/* SIMULATE */}
            <TabsContent value="simulate" className="mt-0 animate-fade-in">
              {mappedData.length > 0 && (
                <>
                  <div className="mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeTab("map", "backward")}
                      className="hover-scale"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Map Columns
                    </Button>
                  </div>

                  {/* 2‑column grid: summary + config */}
                  <div className="grid grid-cols-12 gap-6 mb-6">
                    <div className="col-span-8">
                      <MegaOptimize
                        data={mappedData}
                        pricingConfig={pricingConfig}
                        onOptimized={handleConfigUpdate}
                      />
                    </div>
                    <div className="col-span-4">
                      <div className="hover:shadow-lg transition-all duration-300 rounded-lg hover:shadow-indigo-100/50">
                        <CollapsibleConfigPanel
                          data={mappedData}
                          pricingConfig={pricingConfig}
                          onConfigUpdate={handleConfigUpdate}
                          additionalCategories={additionalCategories}
                          maxFloor={maxFloor}
                        />
                      </div>
                    </div>
                  </div>

                  {/* below: full‑width table without duplicating config */}
                  <PricingSimulator
                    data={mappedData}
                    pricingConfig={pricingConfig}
                    onConfigUpdate={handleConfigUpdate}
                    additionalCategories={additionalCategories}
                    maxFloor={maxFloor}
                    hideConfigPanel
                    key={`simulator-${forceUpdate}`}
                  />
                </>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* footer */}
      <footer className="bg-gray-800 text-white p-6 mt-10">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0 animate-fade-in">
            <h2 className="text-xl font-bold flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Price Prism Builder
            </h2>
            <p className="text-sm opacity-75">
              Advanced real estate pricing simulation
            </p>
          </div>
          <div className="text-sm opacity-75 animate-fade-in">
            &copy; {new Date().getFullYear()} Price Prism Builder. All rights
            reserved. <br />
            <span className="font-medium">Created by Dhananjay Shembekar</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
