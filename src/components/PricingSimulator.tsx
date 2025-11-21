// src/components/PricingSimulator.tsx

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TableIcon, Building, House, ChevronDown, Settings, LineChart } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatNumberWithCommas } from "./pricing-simulator/pricingUtils";
import { toast } from "sonner";
import { simulatePricing, PricingMode } from "@/utils/psfOptimizer";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { usePricingStore } from "@/store/pricingStore";
import PricingFilters from "./pricing-simulator/PricingFilters";
import CollapsibleTable from "./pricing-simulator/CollapsibleTable";
import PricingExportControls from "./pricing-simulator/PricingExportControls";
import CollapsibleConfigPanel from "./pricing-simulator/CollapsibleConfigPanel";
import { useUnitFilters } from "./pricing-simulator/useUnitFilters";
import { createSummaryData } from "./pricing-simulator/pricingUtils";
import MarginOptimizer from "./MarginOptimizer";
import MegaOptimize from "./MegaOptimize";

export interface UnitWithPricing extends Record<string, any> {
  totalPrice: number;
  finalTotalPrice: number;
  balconyArea?: number;
  balconyPercentage?: number;
  basePsf: number;
  floorAdjustment: number;
  viewPsfAdjustment: number;
  additionalAdjustment: number;
  psfAfterAllAdjustments: number;
  balconyPrice: number;
  acAreaPrice: number;
  totalPriceRaw: number;
  flatAddTotal: number;
  finalPsf: number;
  finalAcPsf: number;
  isOptimized?: boolean;
  additionalCategoryPriceComponents?: Record<string, number>;
}

interface PricingSimulatorProps {
  data: any[];
  pricingConfig: any;
  onConfigUpdate?: (updatedConfig: any) => void;
  additionalCategories?: Array<{ column: string; categories: string[] }>;
  maxFloor?: number;
  hideConfigPanel?: boolean;
}

const PricingSimulator: React.FC<PricingSimulatorProps> = ({
  data,
  pricingConfig: externalConfig,
  onConfigUpdate,
  additionalCategories = [],
  maxFloor = 50,
  hideConfigPanel = false,
}) => {
  const { pricingMode, setPricingMode } = usePricingStore();

  //
  //  ——— Local pricingConfig state —————————————————————————————————————————————————————————————————————————————————
  //
  // initialize from prop
  const [pricingConfig, setPricingConfig] = useState<any>(externalConfig);
  
  // Project Cost state - initialize from config if available
  const [projectCost, setProjectCost] = useState<number>(externalConfig?.projectCost || 0);

  // sync if parent prop changes
  useEffect(() => {
    setPricingConfig(externalConfig);
    setProjectCost(externalConfig?.projectCost || 0);
  }, [externalConfig]);

  //
  // 1) simulated units
  //
  const [units, setUnits] = useState<UnitWithPricing[]>([]);

  //
  // 2) dynamic additional-category columns
  //
  const [additionalColumns, setAdditionalColumns] = useState<string[]>([]);

  //
  // 3) columns visibility (persisted across config changes)
  //
const getDefaultVisibleColumns = (additionalColumns: string[]) => {
  const baseColumns = [
  "name",
  "type",
  "floor",
  "view",
  "sellArea",
  "acArea",
  "balconyArea",
  "balconyPercentage",
  "basePsf",
  "viewPsfAdjustment",
  "floorAdjustment",
  "additionalAdjustment",      // “Add-Cat Premium (…)"
  "psfAfterAllAdjustments",
  "acPrice",               // <-- you’ll add these two keys below
  "balconyPrice",
  "flatAddTotal",
  "totalPriceRaw",             // “total Price (unc.)”
  "finalTotalPrice",
  "finalPsf",
  "finalAcPsf",
  "isOptimized",
    ];
    
    // Add dynamic additional columns (show both value and premium for important fields)
    const dynamicColumns = additionalColumns.flatMap(col => [
      col, // The actual value column
      `${col}_premium` // The premium column
    ]);
    
    return [...baseColumns, ...dynamicColumns];
  };

  const [visibleColumns, setVisibleColumns] =
    useState<string[]>([]);

  //
  // 4) filtering & sorting
  //
  const {
    filteredUnits,
    selectedTypes, setSelectedTypes,
    selectedViews, setSelectedViews,
    selectedFloors, setSelectedFloors,
    selectedAdditionalFilters, setSelectedAdditionalFilters,
    sortConfig, setSortConfig,
    resetFilters,
  } = useUnitFilters(units);

  //
  // 5) whenever data, config, mode or filters change, recalc
  //
  useEffect(() => {
    if (!data.length || !pricingConfig) return;

    // detect additional columns
    const cols = new Set<string>();
    (pricingConfig.additionalCategoryPricing || []).forEach((item: any) => {
      cols.add(item.column);
    });
    setAdditionalColumns(Array.from(cols));

    // run simulation with active filters scoped to flat-price adders
    setUnits(
      simulatePricing(
        data,
        pricingConfig,
        pricingMode as PricingMode,
        {
          types: selectedTypes,
          views: selectedViews,
          floors: selectedFloors,
          additional: selectedAdditionalFilters,
        }
      )
    );
  }, [
    data,
    pricingConfig,
    pricingMode,
    selectedTypes,
    selectedViews,
    selectedFloors,
    selectedAdditionalFilters,
  ]);

  //
  // 6) update visible columns when additional columns change
  //
  useEffect(() => {
    // Only set default visible columns if visibleColumns is empty (initial load)
    if (visibleColumns.length === 0) {
      setVisibleColumns(getDefaultVisibleColumns(additionalColumns));
    }
  }, [additionalColumns, visibleColumns.length]);

  //
  // 6) handlers
  //
  const handlePricingConfigChange = (newConfig: any) => {
    // update local
    setPricingConfig(newConfig);
    // propagate up (including project cost)
    onConfigUpdate?.({ ...newConfig, projectCost });
  };
  const handleSort = (key: string) =>
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  const resetColumnVisibility = () => {
    setVisibleColumns(getDefaultVisibleColumns(additionalColumns));
    toast.success("Column visibility reset to default");
  };
  const toggleColumnVisibility = (columnId: string) => {
    setVisibleColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((c) => c !== columnId)
        : [...prev, columnId]
    );
  };

  //
  // 7) helpers for filters
  //
  const getUniqueValues = (field: string) => {
    const vals = new Set<string>();
    units.forEach((u) => u[field] && vals.add(u[field]));
    return field === "floor"
      ? Array.from(vals).sort((a, b) => parseInt(a) - parseInt(b))
      : Array.from(vals).sort();
  };

  //
  // 8) Calculate project cost metrics
  //
  const totalAcArea = filteredUnits.reduce((sum, unit) => sum + (parseFloat(unit.acArea) || 0), 0);
  const totalSellArea = filteredUnits.reduce((sum, unit) => sum + (parseFloat(unit.sellArea) || 0), 0);
  const costAcPsf = totalAcArea > 0 ? projectCost / totalAcArea : 0;
  const costSaPsf = totalSellArea > 0 ? projectCost / totalSellArea : 0;

  //
  // 9) build dynamic allColumns (with bracketed list for Add-Cat Premium)
  //
  const allColumns = [
    { id: "name",                     label: "Unit",                                     required: true  },
    { id: "type",                     label: "Type",                                     required: true  },
    { id: "floor",                    label: "Floor",                                    required: true  },
    { id: "view",                     label: "View",                                     required: true  },
    { id: "sellArea",                 label: "Sell Area",                                required: true  },
    { id: "acArea",                   label: "AC Area",                                  required: true  },
    { id: "balconyArea",              label: "Balcony Area",                             required: false },
    { id: "balconyPercentage",        label: "Balcony %",                               required: false },
    { id: "basePsf",                  label: "Base PSF",                                 required: false },
    { id: "viewPsfAdjustment",        label: "View PSF Adjustment",                     required: false },
    { id: "floorAdjustment",          label: "Floor PSF Adjustment",                    required: false },
    { id: "additionalAdjustment",     label: `Add-Cat Premium (${additionalColumns.join(
                                           ", "
                                         )})`,                    required: false },
    { id: "psfAfterAllAdjustments",   label: "PSF After All Adjustments",               required: false },
    { id: "acPrice",              label: "AC Component",                             required: false },
    { id: "balconyPrice",         label: "Balcony Component",                        required: false },
    { id: "flatAddTotal",             label: "Flat Adders",            required: false },
    { id: "totalPriceRaw",            label: "Total Price (unc.)",                      required: false },
    { id: "finalTotalPrice",          label: "Final Total Price",                        required: true  },
    { id: "finalPsf",                 label: "Final PSF",                                required: true  },
    { id: "finalAcPsf",               label: "Final AC PSF",                             required: true  },
    { id: "unitCost",                 label: "Unit Cost",                                required: false },
    { id: "margin",                   label: "Margin",                                   required: false },
    { id: "marginPercent",            label: "Margin %",                                 required: false },
    { id: "isOptimized",              label: "Optimized",                                required: true  },
    // Add dynamic additional columns
    ...additionalColumns.flatMap(col => [
      { id: col, label: col, required: false },
      { id: `${col}_premium`, label: `${col} Premium`, required: false }
    ])
  ];


  const [activeSimTab, setActiveSimTab] = useState("config");

  return (
    <div className="space-y-6 animate-fade-in" id="pricing-simulator-root">
      {/* ────── Sticky Toolbar ────── */}
      <Card className="sticky top-0 z-10 glass-card border-border/50 shadow-lg backdrop-blur-sm">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Mode Selector */}
            <div className="flex items-center gap-4">
              <Label className="text-sm font-semibold">Mode:</Label>
              <RadioGroup
                value={pricingMode}
                onValueChange={(v: PricingMode) => {
                  setPricingMode(v);
                  toast.success(
                    `Switched to ${v === "apartment" ? "Apartment" : "Villa/Townhouse"} mode`
                  );
                }}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="apartment" id="apt" />
                  <Label htmlFor="apt" className="flex items-center gap-2 font-medium cursor-pointer">
                    <Building className="h-4 w-4" /> Apartment
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="villa" id="villa" />
                  <Label htmlFor="villa" className="flex items-center gap-2 font-medium cursor-pointer">
                    <House className="h-4 w-4" /> Villa/Townhouse
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Key Metrics */}
            {projectCost > 0 && (
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Cost AC PSF</div>
                  <Badge variant="secondary" className="text-sm font-semibold">
                    {costAcPsf.toFixed(2)}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Units</div>
                  <Badge variant="outline" className="text-sm font-semibold">
                    {filteredUnits.length}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ────── Pricing Table (Always Visible) ────── */}
      <div id="pricing-table-section">
        <CollapsibleTable
          filteredUnits={filteredUnits}
          visibleColumns={visibleColumns}
          additionalColumns={additionalColumns}
          handleSort={handleSort}
          pricingMode={pricingMode}
          costAcPsf={costAcPsf}
          costSaPsf={costSaPsf}
          uniqueTypes={getUniqueValues("type")}
          uniqueViews={getUniqueValues("view")}
          uniqueFloors={getUniqueValues("floor")}
          selectedTypes={selectedTypes}
          setSelectedTypes={setSelectedTypes}
          selectedViews={selectedViews}
          setSelectedViews={setSelectedViews}
          selectedFloors={selectedFloors}
          setSelectedFloors={setSelectedFloors}
          getUniqueAdditionalValues={(col) =>
            Array.from(new Set(units.map((u) => u[`${col}_value`] || ""))).sort()
          }
          selectedAdditionalFilters={selectedAdditionalFilters}
          setSelectedAdditionalFilters={setSelectedAdditionalFilters}
          resetFilters={resetFilters}
          allColumns={allColumns}
          toggleColumnVisibility={toggleColumnVisibility}
          resetColumnVisibility={resetColumnVisibility}
          pricingConfig={pricingConfig}
          createSummaryData={createSummaryData}
        />

        <PricingExportControls
          filteredUnits={filteredUnits}
          pricingConfig={pricingConfig}
          createSummaryData={createSummaryData}
        />
      </div>

      {/* ────── Configuration & Optimization Tabs ────── */}
      <Tabs value={activeSimTab} onValueChange={setActiveSimTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="optimize" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Optimization
          </TabsTrigger>
        </TabsList>

        {/* ─── Configuration Tab ─── */}
        <TabsContent value="config" className="space-y-6">
          {/* Configuration Panel */}
          {onConfigUpdate && !hideConfigPanel && (
            <CollapsibleConfigPanel
              data={data}
              pricingConfig={pricingConfig}
              onConfigUpdate={handlePricingConfigChange}
              additionalCategories={additionalCategories}
              maxFloor={maxFloor}
            />
          )}
        </TabsContent>

        {/* ─── Optimization Tab ─── */}
        <TabsContent value="optimize" className="space-y-6">
          {/* Section 1: PSF Optimization & Summary */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-indigo-600" />
              <h2 className="text-2xl font-bold text-foreground">PSF Optimization & Summary</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Optimize base PSF values and premiums to achieve target overall PSF
            </p>
            
            <MegaOptimize
              data={data}
              pricingConfig={pricingConfig}
              onOptimized={(updatedConfig) => {
                setPricingConfig(updatedConfig);
                onConfigUpdate?.(updatedConfig);
                
                // Smooth scroll to pricing table
                setTimeout(() => {
                  const tableSection = document.getElementById('pricing-table-section');
                  if (tableSection) {
                    const topOffset = tableSection.offsetTop - 80; // Account for sticky header
                    window.scrollTo({
                      top: topOffset,
                      behavior: 'smooth'
                    });
                  }
                }, 300);
              }}
            />
          </div>

          {/* Section 2: Cost & Margin Optimization */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-indigo-600" />
              <h2 className="text-2xl font-bold text-foreground">Cost & Margin Optimization</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Define project cost and optimize pricing to achieve target profit margins
            </p>

            {/* Project Cost */}
            <Card className="glass-card border-border/50 shadow-lg">
              <CardHeader className="gradient-bg text-primary-foreground">
                <div className="flex items-center gap-3">
                  <Building className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-xl font-semibold">Project Cost</CardTitle>
                    <CardDescription className="text-primary-foreground/90 mt-1">
                      Required for Profit/Margin Optimizer. Define total project cost to calculate unit costs and margins.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="projectCost" className="text-sm font-medium">
                      Project Cost *
                    </Label>
                    <Input
                      id="projectCost"
                      type="number"
                      value={projectCost || ''}
                      onChange={(e) => {
                        const newCost = parseFloat(e.target.value) || 0;
                        setProjectCost(newCost);
                      }}
                      onBlur={() => {
                        onConfigUpdate?.({ ...pricingConfig, projectCost });
                      }}
                      placeholder="Enter total project cost"
                      className="w-full"
                    />
                  </div>

                  {projectCost > 0 && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Cost AC PSF
                        </Label>
                        <div className="px-3 py-2 bg-muted/50 rounded-md text-sm font-semibold">
                          {costAcPsf.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          = {formatNumberWithCommas(projectCost)} / {formatNumberWithCommas(totalAcArea)} sqft
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Cost SA PSF
                        </Label>
                        <div className="px-3 py-2 bg-muted/50 rounded-md text-sm font-semibold">
                          {costSaPsf.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          = {formatNumberWithCommas(projectCost)} / {formatNumberWithCommas(totalSellArea)} sqft
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Profit/Margin Optimizer */}
            <MarginOptimizer
              pricingConfig={pricingConfig}
              onConfigUpdate={(updatedConfig) => {
                setPricingConfig(updatedConfig);
                onConfigUpdate?.(updatedConfig);
                
                // Smooth scroll to pricing table
                setTimeout(() => {
                  const tableSection = document.getElementById('pricing-table-section');
                  if (tableSection) {
                    const topOffset = tableSection.offsetTop - 80; // Account for sticky header
                    window.scrollTo({
                      top: topOffset,
                      behavior: 'smooth'
                    });
                  }
                }, 300);
              }}
              projectCost={projectCost}
              costAcPsf={costAcPsf}
              units={filteredUnits}
            />
          </div>
        </TabsContent>

      </Tabs>

    </div>
  );
};

export default PricingSimulator;
