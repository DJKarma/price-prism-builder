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
import PricingTable from "./pricing-simulator/PricingTable";
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
  const defaultVisibleColumns = [
    "name","type","floor","view",
    "sellArea","acArea","acPrice","balconyPrice",
    "balconyArea","balconyPercentage",
    "basePsf","viewPsfAdjustment","floorAdjustment",
    "additionalAdjustment","psfAfterAllAdjustments",
    "flatAddTotal","totalPriceRaw",
    "finalTotalPrice","finalPsf","finalAcPsf","isOptimized",
  ];
  const [visibleColumns, setVisibleColumns] =
    useState<string[]>(defaultVisibleColumns);

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
    setVisibleColumns(defaultVisibleColumns);
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
    { id: "name", label: "Unit", required: true },
    { id: "type", label: "Type", required: true },
    { id: "floor", label: "Floor", required: true },
    { id: "view", label: "View", required: true },
    { id: "sellArea", label: "Sell Area", required: true },
    { id: "acArea", label: "AC Area", required: true },
    { id: "acPrice",           label: "AC Component AED", required: false },
    { id: "balconyPrice",      label: "Balcony Component AED", required: false },
    { id: "balconyArea", label: "Balcony", required: false },
    { id: "balconyPercentage", label: "Balcony %", required: false },
    { id: "basePsf", label: "Base PSF", required: false },
    { id: "viewPsfAdjustment", label: "View Premium", required: false },
    { id: "floorAdjustment", label: "Floor Premium", required: false },
    {
      id: "additionalAdjustment",
      label: `Add-Cat Premium (${additionalColumns.join(", ") || "none"})`,
      required: false,
    },
    { id: "psfAfterAllAdjustments", label: "Base + Premiums", required: false },
    { id: "flatAddTotal", label: "Flat Adders", required: false },
    { id: "totalPriceRaw", label: "Total (unc.)", required: false },
    { id: "finalTotalPrice", label: "Final Price", required: true },
    { id: "finalPsf", label: "SA PSF", required: true },
    { id: "finalAcPsf", label: "AC PSF", required: true },
    { id: "isOptimized", label: "Optimized", required: true },
  ];

  return (
    <div className="space-y-6">
      {/* ────── Mode toggle ────── */}
      <Card className="w-full shadow-lg border-indigo-100/50">
        <CardContent className="pt-6 flex items-center gap-6">
          <Label className="font-semibold">Mode:</Label>
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
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="apartment" id="apt" />
              <Label htmlFor="apt" className="flex items-center gap-1">
                <Building className="h-4 w-4" /> Apartment
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="villa" id="villa" />
              <Label htmlFor="villa" className="flex items-center gap-1">
                <House className="h-4 w-4" /> Villa/Townhouse
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* ─── Configuration Panel ─── */}
      {onConfigUpdate && !hideConfigPanel && (
        <div className="hover:shadow-lg transition-all rounded-lg">
          <CollapsibleConfigPanel
            data={data}
            pricingConfig={pricingConfig}
            onConfigUpdate={handlePricingConfigChange}
            additionalCategories={additionalCategories}
            maxFloor={maxFloor}
          />
        </div>
      )}

      {/* ─── Results ─── */}
      <Card className="w-full mb-6 shadow-lg border-indigo-100/50">
        <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-blue-50/50">
          <CardTitle className="flex items-center gap-2">
            <TableIcon className="h-5 w-5 text-indigo-600" />
            Unit Pricing Details
          </CardTitle>
          <CardDescription className="text-indigo-600/80">
            {pricingMode === "villa"
              ? "Pricing on AC Area only"
              : "Pricing with Sellable + Balcony"}
          </CardDescription>
        </CardHeader>
        <CardContent>
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

          <PricingExportControls
            filteredUnits={filteredUnits}
            pricingConfig={pricingConfig}
            createSummaryData={createSummaryData}
          />

          <PricingTable
            filteredUnits={filteredUnits}
            visibleColumns={visibleColumns}
            additionalColumns={additionalColumns}
            handleSort={handleSort}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingSimulator;
