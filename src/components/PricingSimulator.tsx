// src/components/PricingSimulator.tsx

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { TableIcon, Building, House } from "lucide-react";
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

  // sync if parent prop changes
  useEffect(() => {
    setPricingConfig(externalConfig);
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
    // propagate up
    onConfigUpdate?.(newConfig);
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
  // 8) build dynamic allColumns (with bracketed list for Add-Cat Premium)
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
    { id: "isOptimized",              label: "Optimized",                                required: true  },
    // Add dynamic additional columns
    ...additionalColumns.flatMap(col => [
      { id: col, label: col, required: false },
      { id: `${col}_premium`, label: `${col} Premium`, required: false }
    ])
  ];


  return (
    <div className="space-y-8 animate-fade-in">
      {/* ────── Mode toggle ────── */}
      <Card className="w-full glass-card border-border/50 shadow-md hover-glow animate-slide-up">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <Label className="text-base font-semibold text-foreground">Mode:</Label>
            <RadioGroup
              value={pricingMode}
              onValueChange={(v: PricingMode) => {
                setPricingMode(v);
                toast.success(
                  `Switched to ${
                    v === "apartment" ? "Apartment" : "Villa/Townhouse"
                  } mode`
                );
              }}
              className="flex space-x-6"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="apartment" id="apt" />
                <Label htmlFor="apt" className="flex items-center gap-2 font-medium cursor-pointer">
                  <Building className="h-4 w-4" /> Apartment
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="villa" id="villa" />
                <Label htmlFor="villa" className="flex items-center gap-2 font-medium cursor-pointer">
                  <House className="h-4 w-4" /> Villa/Townhouse
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* ─── Configuration Panel ─── */}
      {onConfigUpdate && !hideConfigPanel && (
        <div className="glass-panel rounded-lg shadow-md border border-border/50 animate-slide-up stagger-1">
          <CollapsibleConfigPanel
            data={data}
            pricingConfig={pricingConfig}
            onConfigUpdate={handlePricingConfigChange}
            additionalCategories={additionalCategories}
            maxFloor={maxFloor}
          />
        </div>
      )}

      {/* ─── Results Section ─── */}
      <div className="space-y-8">
        {/* Filters and Controls */}
        <Card className="w-full glass-card border-border/50 shadow-md">
          <CardContent className="pt-8 pb-8">
            <PricingFilters
              uniqueTypes={getUniqueValues("type")}
              uniqueViews={getUniqueValues("view")}
              uniqueFloors={getUniqueValues("floor")}
              selectedTypes={selectedTypes}
              setSelectedTypes={setSelectedTypes}
              selectedViews={selectedViews}
              setSelectedViews={setSelectedViews}
              selectedFloors={selectedFloors}
              setSelectedFloors={setSelectedFloors}
              additionalColumns={additionalColumns}
              getUniqueAdditionalValues={(col) =>
                Array.from(new Set(units.map((u) => u[`${col}_value`] || ""))).sort()
              }
              selectedAdditionalFilters={selectedAdditionalFilters}
              setSelectedAdditionalFilters={setSelectedAdditionalFilters}
              resetFilters={resetFilters}
              visibleColumns={visibleColumns}
              allColumns={allColumns}
              toggleColumnVisibility={toggleColumnVisibility}
              resetColumnVisibility={resetColumnVisibility}
            />

            <div className="mt-6 pt-6 border-t border-border/50">
              <PricingExportControls
                filteredUnits={filteredUnits}
                pricingConfig={pricingConfig}
                createSummaryData={createSummaryData}
              />
            </div>
          </CardContent>
        </Card>

        {/* Collapsible Table */}
        <CollapsibleTable
          filteredUnits={filteredUnits}
          visibleColumns={visibleColumns}
          additionalColumns={additionalColumns}
          handleSort={handleSort}
          pricingMode={pricingMode}
        />
      </div>
    </div>
  );
};

export default PricingSimulator;
