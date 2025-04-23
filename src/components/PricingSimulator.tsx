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
import { simulatePricing } from "@/utils/psfOptimizer";
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
  basePriceComponent?: number;
  floorPriceComponent?: number;
  viewPriceComponent?: number;
  finalPsf: number;
  finalAcPsf: number;
  isOptimized?: boolean;
  additionalCategoryPriceComponents?: Record<string, number>;
  basePsf: number;
  floorAdjustment: number;
  viewPsfAdjustment: number;
  additionalAdjustment: number;
  psfAfterAllAdjustments: number;
  balconyPrice: number;
  acAreaPrice: number;
  totalPriceRaw: number;
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
  pricingConfig,
  onConfigUpdate,
  additionalCategories = [],
  maxFloor = 50,
  hideConfigPanel = false,
}) => {
  const { pricingMode, setPricingMode } = usePricingStore();
  
  const [units, setUnits] = useState<UnitWithPricing[]>([]);
  const [additionalColumns, setAdditionalColumns] = useState<string[]>([]);
  const [additionalColumnValues, setAdditionalColumnValues] = useState<
    Record<string, string[]>
  >({});

  const defaultVisibleColumns = [
    "name",
    "type",
    "floor",
    "view",
    "sellArea",
    "acArea",
    "basePsf",
    "floorAdjustment",
    "viewPsfAdjustment",
    "additionalAdjustment",
    "psfAfterAllAdjustments",
    "finalTotalPrice",
    "finalPsf",
    "finalAcPsf",
    "isOptimized",
  ];
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    defaultVisibleColumns
  );

  const {
    filteredUnits,
    selectedTypes,
    setSelectedTypes,
    selectedViews,
    setSelectedViews,
    selectedFloors,
    setSelectedFloors,
    selectedAdditionalFilters,
    setSelectedAdditionalFilters,
    sortConfig,
    setSortConfig,
    resetFilters,
  } = useUnitFilters(units);

  useEffect(() => {
    if (!data.length || !pricingConfig) return;

    if (pricingConfig.additionalCategoryPricing?.length) {
      const cols = new Set<string>();
      const mapVals: Record<string, Set<string>> = {};

      pricingConfig.additionalCategoryPricing.forEach((item: any) => {
        if (typeof item.column === "string") {
          cols.add(item.column);
          mapVals[item.column] = mapVals[item.column] || new Set();
          if (item.category) mapVals[item.column].add(item.category);
        }
      });

      const colArr = Array.from(cols);
      setAdditionalColumns(colArr);

      const valsMap: Record<string, string[]> = {};
      colArr.forEach((col) => {
        valsMap[col] = Array.from(mapVals[col]);
      });
      setAdditionalColumnValues(valsMap);

      const init: Record<string, string[]> = {};
      colArr.forEach((col) => (init[col] = []));
      setSelectedAdditionalFilters(init);
    }

    setUnits(simulatePricing(data, pricingConfig, pricingMode));
  }, [data, pricingConfig, pricingMode, setSelectedAdditionalFilters]);

  const handlePricingConfigChange = (newConfig: any) => {
    onConfigUpdate?.(newConfig);
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  };

  const getUniqueValues = (field: string) => {
    const vals = new Set<string>();
    units.forEach((u) => {
      if (u[field]) vals.add(u[field]);
    });
    return field === "floor"
      ? Array.from(vals).sort((a, b) => parseInt(a) - parseInt(b))
      : Array.from(vals).sort();
  };

  const resetColumnVisibility = () => {
    setVisibleColumns(defaultVisibleColumns);
    toast.success("Column visibility reset to default");
  };

  const toggleColumnVisibility = (columnId: string) => {
    setVisibleColumns((prev) => {
      const isVisible = prev.includes(columnId);
      const colDef = allColumns.find((c) => c.id === columnId);
      if (colDef?.required && isVisible) return prev;
      return isVisible
        ? prev.filter((i) => i !== columnId)
        : [...prev, columnId];
    });
  };

  const allColumns = [
    { id: "name", label: "Unit", required: true },
    { id: "type", label: "Type", required: true },
    { id: "floor", label: "Floor", required: true },
    { id: "view", label: "View", required: true },
    { id: "sellArea", label: "Sell Area", required: true },
    { id: "acArea", label: "AC Area", required: true },
    { id: "balconyArea", label: "Balcony", required: false },
    { id: "balconyPercentage", label: "Balcony %", required: false },
    { id: "basePsf", label: "Base PSF", required: false },
    { id: "floorAdjustment", label: "Floor Premium", required: false },
    { id: "viewPsfAdjustment", label: "View Premium", required: false },
    { id: "additionalAdjustment", label: "Add‑Cat Premium", required: false },
    { id: "psfAfterAllAdjustments", label: "Base + All Premiums", required: false },
    { id: "balconyPrice", label: "Balcony Price", required: false },
    { id: "acAreaPrice", label: "AC‑Area Price", required: false },
    { id: "totalPriceRaw", label: "Total Price (unc.)", required: false },
    { id: "finalTotalPrice", label: "Final Price", required: true },
    { id: "finalPsf", label: "SA PSF", required: true },
    { id: "finalAcPsf", label: "AC PSF", required: true },
    { id: "isOptimized", label: "Optimized", required: true },
  ];

  return (
    <div className="space-y-6">
      <Card className="w-full shadow-lg border-indigo-100/50">
        <CardContent className="pt-6">
          <RadioGroup
            value={pricingMode}
            onValueChange={(value: 'apartment' | 'villa') => {
              setPricingMode(value);
              toast.success(`Switched to ${value === 'apartment' ? 'Apartment' : 'Villa/Townhouse'} pricing mode`);
            }}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="apartment" id="apartment" />
              <Label htmlFor="apartment" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Apartment
                <span className="text-xs text-muted-foreground">(Sell Area pricing)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="villa" id="villa" />
              <Label htmlFor="villa" className="flex items-center gap-2">
                <House className="h-4 w-4" />
                Villa/Townhouse
                <span className="text-xs text-muted-foreground">(AC Area pricing)</span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {onConfigUpdate && !hideConfigPanel && (
        <div className="hover:shadow-lg transition-all duration-300 rounded-lg hover:shadow-indigo-100/50">
          <CollapsibleConfigPanel
            data={data}
            pricingConfig={pricingConfig}
            onConfigUpdate={handlePricingConfigChange}
            additionalCategories={additionalCategories}
            maxFloor={maxFloor}
          />
        </div>
      )}

      <Card className="w-full mb-6 shadow-lg border-indigo-100/50">
        <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-blue-50/50">
          <CardTitle className="flex items-center gap-2">
            <TableIcon className="h-5 w-5 text-indigo-600" />
            <span className="text-indigo-700">Unit Pricing Details</span>
          </CardTitle>
          <CardDescription className="text-indigo-600/80">
            View and filter detailed pricing for all units
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
              Array.from(new Set(units.map((u) => u[`${col}_value`]))).sort()
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
            sortConfig={sortConfig}
            handleSort={handleSort}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingSimulator;
