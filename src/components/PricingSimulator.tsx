
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TableIcon } from "lucide-react";
import { toast } from "sonner";
import { simulatePricing } from "@/utils/psfOptimizer";
import PricingSummary from "./PricingSummary";
import PremiumEditor from "./PremiumEditor";
import PricingFilters from "./pricing-simulator/PricingFilters";
import PricingTable from "./pricing-simulator/PricingTable";
import PricingExportControls from "./pricing-simulator/PricingExportControls";
import { useUnitFilters } from "./pricing-simulator/useUnitFilters";
import { createSummaryData } from "./pricing-simulator/pricingUtils";

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
}

const PricingSimulator: React.FC<PricingSimulatorProps> = ({
  data,
  pricingConfig,
  onConfigUpdate,
}) => {
  const [units, setUnits] = useState<UnitWithPricing[]>([]);
  const [additionalColumns, setAdditionalColumns] = useState<string[]>([]);
  const [additionalColumnValues, setAdditionalColumnValues] = useState<Record<string, string[]>>({});
  
  // Column visibility
  const defaultVisibleColumns = [
    "name", "type", "floor", "view", "sellArea", "acArea", 
    "finalTotalPrice", "finalPsf", "finalAcPsf", "isOptimized"
  ];
  
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultVisibleColumns);
  
  // Get filtering and sorting from custom hook
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
    resetFilters
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

    // Detect additional category columns
    if (pricingConfig.additionalCategoryPricing && pricingConfig.additionalCategoryPricing.length > 0) {
      const columnsSet = new Set<string>();
      const columnValuesMap: Record<string, Set<string>> = {};
      
      pricingConfig.additionalCategoryPricing.forEach((item: any) => {
        if (typeof item.column === 'string') {
          columnsSet.add(item.column);
          
          // Initialize set for column values if it doesn't exist
          if (!columnValuesMap[item.column]) {
            columnValuesMap[item.column] = new Set<string>();
          }
          
          // Add the category value
          if (item.category) {
            columnValuesMap[item.column].add(item.category);
          }
        }
      });
      
      const columns = Array.from(columnsSet) as string[];
      setAdditionalColumns(columns);
      
      // Convert sets to arrays
      const valuesMap: Record<string, string[]> = {};
      Object.entries(columnValuesMap).forEach(([col, valuesSet]) => {
        valuesMap[col] = Array.from(valuesSet);
      });
      setAdditionalColumnValues(valuesMap);
      
      // Initialize filters for additional columns
      const initialFilters: Record<string, string[]> = {};
      columns.forEach(col => {
        initialFilters[col] = [];
      });
      setSelectedAdditionalFilters(initialFilters);
    }

    // Use the simulatePricing function to calculate unit prices
    const calculatedUnits = simulatePricing(data, pricingConfig);
    setUnits(calculatedUnits);
  }, [data, pricingConfig, setSelectedAdditionalFilters]);

  const handlePricingConfigChange = (newConfig: any) => {
    if (onConfigUpdate) {
      onConfigUpdate(newConfig);
    }
  };

  // Get unique values for filters
  const getUniqueValues = (fieldName: string): string[] => {
    const values = new Set<string>();
    units.forEach((unit) => {
      if (unit[fieldName]) {
        values.add(unit[fieldName]);
      }
    });
    if (fieldName === 'floor') {
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

  // Reset column visibility to default
  const resetColumnVisibility = () => {
    setVisibleColumns(defaultVisibleColumns);
    toast.success("Column visibility reset to default");
  };

  // Toggle column visibility
  const toggleColumnVisibility = (columnId: string) => {
    setVisibleColumns(prev => {
      // Check if the column should be visible
      const isCurrentlyVisible = prev.includes(columnId);
      
      // For required columns, they can't be toggled off
      const column = allColumns.find(col => col.id === columnId);
      if (column?.required && isCurrentlyVisible) {
        return prev;
      }
      
      // Toggle visibility
      if (isCurrentlyVisible) {
        return prev.filter(id => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  };

  // Column definitions
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

  // Get unique bedroom types, views, and floors for filters
  const uniqueTypes = getUniqueValues("type");
  const uniqueViews = getUniqueValues("view");
  const uniqueFloors = getUniqueValues("floor");

  // Calculate active filters count
  const activeFiltersCount = 
    (selectedTypes.length > 0 ? 1 : 0) +
    (selectedViews.length > 0 ? 1 : 0) +
    (selectedFloors.length > 0 ? 1 : 0) +
    Object.values(selectedAdditionalFilters).reduce((count, values) => count + (values.length > 0 ? 1 : 0), 0);

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TableIcon className="h-5 w-5" />
          Unit Pricing Details
        </CardTitle>
        <CardDescription>
          View and filter detailed pricing for all units
        </CardDescription>
      </CardHeader>
      <CardContent>
        {onConfigUpdate && (
          <PremiumEditor 
            pricingConfig={pricingConfig} 
            onPricingConfigChange={handlePricingConfigChange}
          />
        )}
        
        {/* Filters Section */}
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
        
        {/* Export Controls */}
        <PricingExportControls 
          filteredUnits={filteredUnits}
          pricingConfig={pricingConfig}
          createSummaryData={createSummaryData}
        />
        
        {/* Data Table */}
        <PricingTable
          filteredUnits={filteredUnits}
          visibleColumns={visibleColumns}
          additionalColumns={additionalColumns}
          sortConfig={sortConfig}
          handleSort={(key: string) => {
            let direction: "ascending" | "descending" = "ascending";
            if (sortConfig && sortConfig.key === key) {
              direction = sortConfig.direction === "ascending" ? "descending" : "ascending";
            }
            setSortConfig({ key, direction });
          }}
        />
        

      </CardContent>
    </Card>
  );
};

export default PricingSimulator;
