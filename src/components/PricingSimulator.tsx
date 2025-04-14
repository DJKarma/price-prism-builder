import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  FixedHeaderTable
} from "@/components/ui/table";
import {
  ArrowUpDown,
  Download,
  Filter,
  Table as TableIcon,
  Check,
  RotateCcw,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import BedroomTypeSelector from "./mega-optimize/BedroomTypeSelector";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import PricingSummary from "./PricingSummary";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { exportToExcel } from "@/utils/configUtils";
import { simulatePricing } from "@/utils/psfOptimizer";
import PremiumEditor from "./PremiumEditor";

interface PricingSimulatorProps {
  data: any[];
  pricingConfig: any;
  onConfigUpdate?: (updatedConfig: any) => void;
}

interface UnitWithPricing extends Record<string, any> {
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

// Format numbers for display (K/M for thousands/millions) but only for price values, not PSF
const formatNumber = (num: number, isTotalPrice: boolean = false): string => {
  if (!isFinite(num)) return "0";
  
  if (isTotalPrice) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0) + "K";
    }
  }
  
  return num.toFixed(2);
};

// Format numbers with thousand separators
const formatNumberWithCommas = (num: number): string => {
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const PricingSimulator: React.FC<PricingSimulatorProps> = ({
  data,
  pricingConfig,
  onConfigUpdate,
}) => {
  const [units, setUnits] = useState<UnitWithPricing[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<UnitWithPricing[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  }>({ key: "floor", direction: "ascending" }); // Set default sort to floor ascending
  
  // Multi-select filters
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedViews, setSelectedViews] = useState<string[]>([]);
  const [selectedFloors, setSelectedFloors] = useState<string[]>([]);
  const [additionalColumns, setAdditionalColumns] = useState<string[]>([]);
  const [additionalColumnValues, setAdditionalColumnValues] = useState<Record<string, string[]>>({});
  
  // Export config option
  const [includeConfig, setIncludeConfig] = useState<boolean>(false);
  
  // Column visibility
  const defaultVisibleColumns = [
    "name", "type", "floor", "view", "sellArea", "acArea", 
    "finalTotalPrice", "finalPsf", "finalAcPsf", "isOptimized"
  ];
  
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultVisibleColumns);
  
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

  // Additional category filters
  const [selectedAdditionalFilters, setSelectedAdditionalFilters] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (pricingConfig?.optimizedTypes?.length && selectedTypes.length === 0) {
      const optimizedTypes = pricingConfig.optimizedTypes;
      if (optimizedTypes.length === 1) {
        setSelectedTypes([optimizedTypes[0]]);
        toast.info(`Filtered to show optimized bedroom type: ${optimizedTypes[0]}`);
      }
    }
  }, [pricingConfig?.optimizedTypes, selectedTypes]);

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
    setFilteredUnits(calculatedUnits);
  }, [data, pricingConfig]);

  useEffect(() => {
    let result = [...units];
    
    // Apply multi-select filters
    if (selectedTypes.length > 0) {
      result = result.filter((unit) => selectedTypes.includes(unit.type));
    }
    if (selectedViews.length > 0) {
      result = result.filter((unit) => selectedViews.includes(unit.view));
    }
    if (selectedFloors.length > 0) {
      result = result.filter((unit) => selectedFloors.includes(unit.floor));
    }
    
    // Apply additional category filters
    Object.entries(selectedAdditionalFilters).forEach(([column, selectedValues]) => {
      if (selectedValues.length > 0) {
        const columnKey = `${column}_value`;
        result = result.filter(unit => 
          selectedValues.includes(unit[columnKey])
        );
      }
    });
    
    if (sortConfig) {
      result.sort((a, b) => {
        if (sortConfig.key === 'floor') {
          const floorA = parseInt(a.floor) || 0;
          const floorB = parseInt(b.floor) || 0;
          return sortConfig.direction === "ascending" ? floorA - floorB : floorB - floorA;
        }
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    setFilteredUnits(result);
  }, [units, selectedTypes, selectedViews, selectedFloors, selectedAdditionalFilters, sortConfig]);

  const resetFilters = () => {
    setSelectedTypes([]);
    setSelectedViews([]);
    setSelectedFloors([]);
    
    // Reset additional category filters
    const resetAdditionalFilters: Record<string, string[]> = {};
    additionalColumns.forEach(col => {
      resetAdditionalFilters[col] = [];
    });
    setSelectedAdditionalFilters(resetAdditionalFilters);
    
    toast.success("Filters have been reset");
  };

  const handleSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === "ascending" ? "descending" : "ascending";
    }
    setSortConfig({ key, direction });
  };

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

  const resetColumnVisibility = () => {
    setVisibleColumns(defaultVisibleColumns);
    toast.success("Column visibility reset to default");
  };

  const exportCSV = async () => {
    if (!filteredUnits.length) {
      toast.error("No data to export");
      return;
    }
    
    // Create summary data for the summary sheet
    const summaryData = createSummaryData();
    
    // Create a flat array of data for the export
    const flattenedData = filteredUnits.map(unit => {
      // Create a flattened version of the unit data for export
      const flatUnit: Record<string, any> = {};
      
      // Add basic fields
      allColumns.forEach(col => {
        if (col.id in unit) {
          const value = unit[col.id];
          if (col.id === "isOptimized") {
            flatUnit[col.label] = value ? "Yes" : "No";
          } else if (typeof value === 'number') {
            flatUnit[col.label] = value;
          } else {
            flatUnit[col.label] = value;
          }
        }
      });
      
      // Add additional category columns
      additionalColumns.forEach(column => {
        const columnKey = `${column}_value`;
        if (columnKey in unit) {
          flatUnit[column] = unit[columnKey];
        }
        
        // Add premium values if available
        const premiumKey = `${column}: ${unit[columnKey]}`;
        if (unit.additionalCategoryPriceComponents && premiumKey in unit.additionalCategoryPriceComponents) {
          flatUnit[`${column} Premium`] = unit.additionalCategoryPriceComponents[premiumKey];
        } else {
          flatUnit[`${column} Premium`] = 0;
        }
      });
      
      return flatUnit;
    });
    
    // Export the data
    await exportToExcel(
      flattenedData, 
      includeConfig, 
      pricingConfig, 
      summaryData
    );
  };

  const createSummaryData = () => {
    // Group by bedroom type for summary
    const typeGroups: Record<string, any[]> = {};
    filteredUnits.forEach((item) => {
      const type = item.type || "Unknown";
      if (!typeGroups[type]) {
        typeGroups[type] = [];
      }
      typeGroups[type].push(item);
    });
    
    // Calculate metrics for each type and create summary rows
    const summaryRows = Object.keys(typeGroups).map((type) => {
      const items = typeGroups[type];
      
      // Filter out items with missing essential data
      const validItems = items.filter(item => {
        const hasValidSellArea = parseFloat(item.sellArea) > 0;
        const hasValidPrice = typeof item.finalTotalPrice === 'number' && item.finalTotalPrice > 0;
        return hasValidSellArea && hasValidPrice;
      });
      
      if (validItems.length === 0) {
        return {
          Type: type,
          Units: 0,
          "Avg Size": 0,
          "Total Value": 0,
          "Min SA PSF": 0,
          "Avg SA PSF": 0,
          "Max SA PSF": 0,
          "Min AC PSF": 0,
          "Avg AC PSF": 0,
          "Max AC PSF": 0
        };
      }
      
      // Calculate metrics
      const unitCount = validItems.length;
      const totalArea = validItems.reduce((sum, item) => sum + parseFloat(item.sellArea || 0), 0);
      const avgSize = totalArea / unitCount;
      const totalValue = validItems.reduce((sum, item) => sum + (item.finalTotalPrice || 0), 0);
      
      // SA PSF
      const psfs = validItems.map(item => item.finalPsf || (item.finalTotalPrice / parseFloat(item.sellArea || 1)));
      const avgPsf = psfs.reduce((sum, psf) => sum + psf, 0) / unitCount;
      const minPsf = Math.min(...psfs);
      const maxPsf = Math.max(...psfs);
      
      // AC PSF
      const validItemsWithAcArea = validItems.filter(item => parseFloat(item.acArea) > 0);
      let avgAcPsf = 0, minAcPsf = 0, maxAcPsf = 0;
      
      if (validItemsWithAcArea.length > 0) {
        const acPsfs = validItemsWithAcArea.map(item => item.finalAcPsf || (item.finalTotalPrice / parseFloat(item.acArea || 1)));
        avgAcPsf = acPsfs.reduce((sum, psf) => sum + psf, 0) / validItemsWithAcArea.length;
        minAcPsf = Math.min(...acPsfs);
        maxAcPsf = Math.max(...acPsfs);
      }
      
      return {
        Type: type,
        Units: unitCount,
        "Avg Size": avgSize,
        "Total Value": totalValue,
        "Min SA PSF": minPsf,
        "Avg SA PSF": avgPsf,
        "Max SA PSF": maxPsf,
        "Min AC PSF": minAcPsf,
        "Avg AC PSF": avgAcPsf,
        "Max AC PSF": maxAcPsf
      };
    });
    
    // Add total row
    const allValidItems = filteredUnits.filter(item => {
      const hasValidSellArea = parseFloat(item.sellArea) > 0;
      const hasValidPrice = typeof item.finalTotalPrice === 'number' && item.finalTotalPrice > 0;
      return hasValidSellArea && hasValidPrice;
    });
    
    if (allValidItems.length > 0) {
      const totalUnitCount = allValidItems.length;
      const totalSellArea = allValidItems.reduce((sum, item) => sum + parseFloat(item.sellArea || 0), 0);
      const avgSize = totalSellArea / totalUnitCount;
      const totalValue = allValidItems.reduce((sum, item) => sum + (item.finalTotalPrice || 0), 0);
      
      // Overall average PSF based on total value divided by total area
      const overallAvgPsf = totalValue / totalSellArea;
      
      // Min and max PSF across all units
      const allPsfs = allValidItems.map(item => item.finalPsf || (item.finalTotalPrice / parseFloat(item.sellArea || 1)));
      const minPsf = Math.min(...allPsfs);
      const maxPsf = Math.max(...allPsfs);
      
      // AC PSF calculations for all units
      const validItemsWithAcArea = allValidItems.filter(item => parseFloat(item.acArea) > 0);
      let overallAvgAcPsf = 0, minAcPsf = 0, maxAcPsf = 0;
      
      if (validItemsWithAcArea.length > 0) {
        const totalAcArea = validItemsWithAcArea.reduce((sum, item) => sum + parseFloat(item.acArea || 0), 0);
        const acPsfs = validItemsWithAcArea.map(item => item.finalAcPsf || (item.finalTotalPrice / parseFloat(item.acArea || 1)));
        
        overallAvgAcPsf = totalValue / totalAcArea;
        minAcPsf = Math.min(...acPsfs);
        maxAcPsf = Math.max(...acPsfs);
      }
      
      summaryRows.push({
        Type: "TOTAL",
        Units: totalUnitCount,
        "Avg Size": avgSize,
        "Total Value": totalValue,
        "Min SA PSF": minPsf,
        "Avg SA PSF": overallAvgPsf,
        "Max SA PSF": maxPsf,
        "Min AC PSF": minAcPsf,
        "Avg AC PSF": overallAvgAcPsf,
        "Max AC PSF": maxAcPsf
      });
    }
    
    return summaryRows;
  };

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

  const handlePricingConfigChange = (newConfig: any) => {
    if (onConfigUpdate) {
      onConfigUpdate(newConfig);
    }
  };

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
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
          <div className="md:col-span-3">
            <BedroomTypeSelector
              bedroomTypes={uniqueTypes}
              selectedTypes={selectedTypes}
              setSelectedTypes={setSelectedTypes}
              label="Filter by Bedroom Types"
              placeholder="Select bedroom types..."
            />
          </div>
          <div className="md:col-span-3">
            <BedroomTypeSelector
              bedroomTypes={uniqueViews}
              selectedTypes={selectedViews}
              setSelectedTypes={setSelectedViews}
              label="Filter by Views"
              placeholder="Select views..."
            />
          </div>
          <div className="md:col-span-3">
            <BedroomTypeSelector
              bedroomTypes={uniqueFloors}
              selectedTypes={selectedFloors}
              setSelectedTypes={setSelectedFloors}
              label="Filter by Floors"
              placeholder="Select floors..."
            />
          </div>
          <div className="md:col-span-3 flex flex-col justify-end gap-2">
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={resetFilters}
                className="flex-shrink-0"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-shrink-0">
                    <Settings className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allColumns.map(column => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={visibleColumns.includes(column.id)}
                      onCheckedChange={() => toggleColumnVisibility(column.id)}
                      disabled={column.required && visibleColumns.includes(column.id)}
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  
                  {/* Add additional pricing factor columns */}
                  {additionalColumns.map(column => (
                    <DropdownMenuCheckboxItem
                      key={column}
                      checked={visibleColumns.includes(column)}
                      onCheckedChange={() => toggleColumnVisibility(column)}
                    >
                      {column}
                    </DropdownMenuCheckboxItem>
                  ))}
                  
                  {/* Add additional pricing factor premium columns */}
                  {additionalColumns.map(column => (
                    <DropdownMenuCheckboxItem
                      key={`${column}_premium`}
                      checked={visibleColumns.includes(`${column}_premium`)}
                      onCheckedChange={() => toggleColumnVisibility(`${column}_premium`)}
                    >
                      {column} Premium
                    </DropdownMenuCheckboxItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={resetColumnVisibility}
                    >
                      Reset to Default
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <div className="flex items-center space-x-2 border border-gray-200 rounded-md px-2 py-1">
                <Switch
                  id="include-config"
                  checked={includeConfig}
                  onCheckedChange={setIncludeConfig}
                />
                <Label htmlFor="include-config" className="text-xs">
                  Include config
                </Label>
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportCSV}
                className="flex-shrink-0"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
        
        {/* Additional category filters section */}
        {additionalColumns.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
            {additionalColumns.map(column => (
              <div className="md:col-span-3" key={column}>
                <BedroomTypeSelector
                  bedroomTypes={getUniqueAdditionalValues(column)}
                  selectedTypes={selectedAdditionalFilters[column] || []}
                  setSelectedTypes={(selected) => {
                    setSelectedAdditionalFilters(prev => ({
                      ...prev,
                      [column]: selected
                    }));
                  }}
                  label={`Filter by ${column}`}
                  placeholder={`Select ${column}...`}
                />
              </div>
            ))}
          </div>
        )}

        <FixedHeaderTable maxHeight="650px" className="scrollbar-always-visible">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.includes("name") && (
                  <TableHead
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center">
                      Unit <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                )}
                
                {visibleColumns.includes("type") && (
                  <TableHead
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort("type")}
                  >
                    <div className="flex items-center">
                      Type <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                )}
                
                {visibleColumns.includes("floor") && (
                  <TableHead
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort("floor")}
                  >
                    <div className="flex items-center">
                      Floor <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                )}
                
                {visibleColumns.includes("view") && (
                  <TableHead className="whitespace-nowrap">View</TableHead>
                )}
                
                {/* Additional category columns */}
                {additionalColumns.map(column => (
                  visibleColumns.includes(column) && (
                    <TableHead
                      key={column}
                      className="whitespace-nowrap"
                    >
                      {column}
                    </TableHead>
                  )
                ))}
                
                {visibleColumns.includes("sellArea") && (
                  <TableHead
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort("sellArea")}
                  >
                    <div className="flex items-center">
                      Sell Area <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                )}
                
                {visibleColumns.includes("acArea") && (
                  <TableHead
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort("acArea")}
                  >
                    <div className="flex items-center">
                      AC Area <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                )}
                
                {visibleColumns.includes("balconyArea") && (
                  <TableHead
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort("balconyArea")}
                  >
                    <div className="flex items-center">
                      Balcony <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                )}
                
                {visibleColumns.includes("balconyPercentage") && (
                  <TableHead
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort("balconyPercentage")}
                  >
                    <div className="flex items-center">
                      Balcony % <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                )}
                
                {visibleColumns.includes("basePsf") && (
                  <TableHead
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort("basePsf")}
                  >
                    <div className="flex items-center">
                      Base PSF <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                )}
                
                {visibleColumns.includes("floorAdjustment") && (
                  <TableHead
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort("floorAdjustment")}
                  >
                    <div className="flex items-center">
                      Floor Premium <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                )}
                
                {visibleColumns.includes("viewPsfAdjustment") && (
                  <TableHead
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort("viewPsfAdjustment")}
                  >
                    <div className="flex items-center">
                      View Premium <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                )}
                
                {/* Additional category premium columns */}
                {additionalColumns.map(column => (
                  visibleColumns.includes(`${column}_premium`) && (
                    <TableHead
                      key={`${column}_premium`}
                      className="cursor-pointer whitespace-nowrap"
                      onClick={() => handleSort("additionalCategoryAdjustment")}
                    >
                      <div className="flex items-center">
                        {column} Premium <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                  )
                ))}
                
                {visibleColumns.includes("finalTotalPrice") && (
                  <TableHead
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort("finalTotalPrice")}
                  >
                    <div className="flex items-center">
                      Final Price <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                )}
                
                {visibleColumns.includes("finalPsf") && (
                  <TableHead
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort("finalPsf")}
                  >
                    <div className="flex items-center">
                      SA PSF <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                )}
                
                {visibleColumns.includes("finalAcPsf") && (
                  <TableHead
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort("finalAcPsf")}
                  >
                    <div className="flex items-center">
                      AC PSF <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                )}
                
                {visibleColumns.includes("isOptimized") && (
                  <TableHead className="whitespace-nowrap">Optimized</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits.length > 0 ? (
                filteredUnits.map((unit, index) => (
                  <TableRow 
                    key={unit.name || index}
                    className={unit.isOptimized ? "bg-green-50" : ""}
                  >
                    {visibleColumns.includes("name") && <TableCell>{unit.name}</TableCell>}
                    {visibleColumns.includes("type") && <TableCell>{unit.type}</TableCell>}
                    {visibleColumns.includes("floor") && <TableCell>{unit.floor}</TableCell>}
                    {visibleColumns.includes("view") && <TableCell>{unit.view}</TableCell>}
                    
                    {/* Additional category columns */}
                    {additionalColumns.map(column => (
                      visibleColumns.includes(column) && (
                        <TableCell key={column}>
                          {unit[`${column}_value`] || "-"}
                        </TableCell>
                      )
                    ))}
                    
                    {visibleColumns.includes("sellArea") && (
                      <TableCell className="text-right">
                        {parseFloat(unit.sellArea).toFixed(2)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.includes("acArea") && (
                      <TableCell className="text-right">
                        {parseFloat(unit.acArea).toFixed(2)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.includes("balconyArea") && (
                      <TableCell className="text-right">
                        {unit.balconyArea.toFixed(2)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.includes("balconyPercentage") && (
                      <TableCell className="text-right">
                        {unit.balconyPercentage.toFixed(2)}%
                      </TableCell>
                    )}
                    
                    {visibleColumns.includes("basePsf") && (
                      <TableCell className="text-right">
                        {unit.basePsf.toFixed(2)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.includes("floorAdjustment") && (
                      <TableCell className="text-right">
                        {unit.floorAdjustment.toFixed(2)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.includes("viewPsfAdjustment") && (
                      <TableCell className="text-right">
                        {unit.viewPsfAdjustment.toFixed(2)}
                      </TableCell>
                    )}
                    
                    {/* Additional category premium columns */}
                    {additionalColumns.map(column => (
                      visibleColumns.includes(`${column}_premium`) && (
                        <TableCell key={`${column}_premium`} className="text-right">
                          {(unit.additionalCategoryPriceComponents && 
                           unit.additionalCategoryPriceComponents[`${column}: ${unit[`${column}_value`]}`])?.toFixed(2) || 
                           "0.00"}
                        </TableCell>
                      )
                    ))}
                    
                    {visibleColumns.includes("finalTotalPrice") && (
                      <TableCell className="font-medium text-right">
                        {formatNumberWithCommas(unit.finalTotalPrice)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.includes("finalPsf") && (
                      <TableCell className="font-medium text-right">
                        {unit.finalPsf.toFixed(2)}
                      </TableCell>
                    )}
                    
                    {visibleColumns.includes("finalAcPsf") && (
                      <TableCell className="font-medium text-right">
                        {unit.finalAcPsf ? unit.finalAcPsf.toFixed(2) : "-"}
                      </TableCell>
                    )}
                    
                    {visibleColumns.includes("isOptimized") && (
                      <TableCell className="text-center">
                        {unit.isOptimized ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : null}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={Object.keys(visibleColumns).length || 1}
                    className="text-center py-6"
                  >
                    No units match your filter criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </FixedHeaderTable>
        
        {/* Pricing Summary Component */}
        <div className="mt-8">
          <PricingSummary 
            data={filteredUnits} 
            showDollarSign={true} 
            showAcPsf={true}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingSimulator;
