import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { TableIcon } from "lucide-react";
import { toast } from "sonner";
import { simulatePricing } from "@/utils/psfOptimizer";
import PricingFilters from "./pricing-simulator/PricingFilters";
import PricingTable from "./pricing-simulator/PricingTable";
import PricingExportControls from "./pricing-simulator/PricingExportControls";
import { useUnitFilters } from "./pricing-simulator/useUnitFilters";
import { createSummaryData } from "./pricing-simulator/pricingUtils";
import CollapsibleConfigPanel from "./pricing-simulator/CollapsibleConfigPanel";

export interface UnitWithPricing extends Record<string, any> {
  totalPrice: number;
  finalTotalPrice: number; // Ceiled total price
  balconyArea?: number;
  balconyPercentage?: number;
  basePriceComponent?: number;
  floorPriceComponent?: number;
  viewPriceComponent?: number;
  finalPsf: number; // SA PSF value
  finalAcPsf: number; // AC PSF value
  isOptimized?: boolean; // Flag to indicate if this unit's price was optimized
  additionalCategoryPriceComponents?: Record<string, number>; // Store additional category price contributions
}

interface PricingSimulatorProps {
  data: any[];
  pricingConfig: any;
  onConfigUpdate?: (updatedConfig: any) => void;
  additionalCategories?: Array<{ column: string; categories: string[] }>;
  maxFloor?: number;
}

const PricingSimulator: React.FC<PricingSimulatorProps> = ({
  data,
  pricingConfig,
  onConfigUpdate,
  additionalCategories = [],
  maxFloor = 50,
}) => {
  const [units, setUnits] = useState<UnitWithPricing[]>([]);
  const [additionalColumns, setAdditionalColumns] = useState<string[]>([]);
  const [additionalColumnValues, setAdditionalColumnValues] = useState<Record<string, string[]>>({});

  const defaultVisibleColumns = [
    "name",
    "type",
    "floor",
    "view",
    "sellArea",
    "acArea",
    "finalTotalPrice",
    "finalPsf",
    "finalAcPsf",
    "isOptimized",
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultVisibleColumns);

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
    if (pricingConfig?.optimizedTypes?.length && selectedTypes.length === 0) {
      const optimizedTypes = pricingConfig.optimizedTypes;
      if (optimizedTypes.length === 1) {
        setSelectedTypes([optimizedTypes[0]]);
        toast.info(`Filtered to show optimized bedroom type: ${optimizedTypes[0]}`);
      }
    }
  }, [pricingConfig?.optimizedTypes, selectedTypes, setSelectedTypes]);

  useEffect(() => {
    if (!data.length || !pricingConfig) return;

    if (pricingConfig.additionalCategoryPricing && pricingConfig.additionalCategoryPricing.length > 0) {
      const columnsSet = new Set<string>();
      const columnValuesMap: Record<string, Set<string>> = {};

      pricingConfig.additionalCategoryPricing.forEach((item: any) => {
        if (typeof item.column === "string") {
          columnsSet.add(item.column);

          if (!columnValuesMap[item.column]) {
            columnValuesMap[item.column] = new Set<string>();
          }

          if (item.category) {
            columnValuesMap[item.column].add(item.category);
          }
        }
      });

      const columns = Array.from(columnsSet) as string[];
      setAdditionalColumns(columns);

      const valuesMap: Record<string, string[]> = {};
      Object.entries(columnValuesMap).forEach(([col, valuesSet]) => {
        valuesMap[col] = Array.from(valuesSet);
      });
      setAdditionalColumnValues(valuesMap);

      const initialFilters: Record<string, string[]> = {};
      columns.forEach((col) => {
        initialFilters[col] = [];
      });
      setSelectedAdditionalFilters(initialFilters);
    }

    const calculatedUnits = simulatePricing(data, pricingConfig);
    setUnits(calculatedUnits);
  }, [data, pricingConfig, setSelectedAdditionalFilters]);

  const handlePricingConfigChange = (newConfig: any) => {
    if (onConfigUpdate) {
      onConfigUpdate(newConfig);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig((prevConfig) => {
      if (prevConfig.key === key) {
        return {
          key,
          direction: prevConfig.direction === "ascending" ? "descending" : "ascending",
        };
      }
      return { key, direction: "ascending" };
    });
  };

  const getUniqueValues = (fieldName: string): string[] => {
    const values = new Set<string>();
    units.forEach((unit) => {
      if (unit[fieldName]) {
        values.add(unit[fieldName]);
      }
    });
    if (fieldName === "floor") {
      return Array.from(values).sort((a, b) => parseInt(a) - parseInt(b));
    }
    return Array.from(values).sort();
  };

  const getUniqueAdditionalValues = (column: string): string[] => {
    const values = new Set<string>();
    units.forEach((unit) => {
      const columnKey = `${column}_value`;
      if (unit[columnKey]) {
        values.add(unit[columnKey]);
      }
    });
    return Array.from(values).sort();
  };

  const resetColumnVisibility = () => {
    setVisibleColumns(defaultVisibleColumns);
    toast.success("Column visibility reset to default");
  };

  const toggleColumnVisibility = (columnId: string) => {
    setVisibleColumns((prev) => {
      const isCurrentlyVisible = prev.includes(columnId);

      const column = allColumns.find((col) => col.id === columnId);
      if (column?.required && isCurrentlyVisible) {
        return prev;
      }

      if (isCurrentlyVisible) {
        return prev.filter((id) => id !== columnId);
      } else {
        return [...prev, columnId];
      }
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
    { id: "finalTotalPrice", label: "Final Price", required: true },
    { id: "finalPsf", label: "SA PSF", required: true },
    { id: "finalAcPsf", label: "AC PSF", required: true },
    { id: "isOptimized", label: "Optimized", required: true },
  ];

  const uniqueTypes = getUniqueValues("type");
  const uniqueViews = getUniqueValues("view");
  const uniqueFloors = getUniqueValues("floor");

  const activeFiltersCount =
    (selectedTypes.length > 0 ? 1 : 0) +
    (selectedViews.length > 0 ? 1 : 0) +
    (selectedFloors.length > 0 ? 1 : 0) +
    Object.values(selectedAdditionalFilters).reduce(
      (count, values) => count + (values.length > 0 ? 1 : 0),
      0
    );

  return (
    <div className="space-y-6">
      {onConfigUpdate && (
        // Removed extra animate-pulse class so only the subtle glow defined in the CollapsibleConfigPanel applies.
        <div className="hover:shadow-lg transition-all duration-300 rounded-lg hover:shadow-indigo-100/50">
          <CollapsibleConfigPanel
            data={data}
            pricingConfig={pricingConfig}
            onConfigUpdate={handlePricingConfigChange}
            maxFloor={maxFloor}
            additionalCategories={additionalCategories}
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
            uniqueTypes={uniqueTypes}
            uniqueViews={uniqueViews}
            uniqueFloors={uniqueFloors}
            selectedTypes={selectedTypes}
            setSelectedTypes={setSelectedTypes}
            selectedViews={selectedViews}
            setSelectedViews={setSelectedViews}
            selectedFloors={selectedFloors}
            setSelectedFloors={setSelectedFloors}
            additionalColumns={additionalColumns}
            getUniqueAdditionalValues={getUniqueAdditionalValues}
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
      
      {/* Scoped custom CSS for the subtle glow effect */}
      <style jsx>{`
        /* Apply a subtle blue glow when the configuration panel trigger is in "closed" state */
        .glow-on-collapse[data-state="closed"] {
          box-shadow: 0 0 8px rgba(66, 153, 225, 0.4);
          transition: box-shadow 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default PricingSimulator;
