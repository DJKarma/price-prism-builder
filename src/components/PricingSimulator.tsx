
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
  finalPsf: number; // Now the primary PSF value
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
  
  // Column visibility
  const defaultVisibleColumns = [
    "name", "type", "floor", "view", "sellArea", "acArea", 
    "finalTotalPrice", "finalPsf", "isOptimized"
  ];
  
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultVisibleColumns);
  
  // Column definitions
  const allColumns = [
    { id: "name", label: "Unit", required: true },
    { id: "type", label: "Type", required: true },
    { id: "floor", label: "Floor", required: true },
    { id: "view", label: "View", required: true },
    { id: "sellArea", label: "Sell Area", required: true },
    { id: "acArea", label: "AC Area", required: false },
    { id: "balconyArea", label: "Balcony", required: false },
    { id: "balconyPercentage", label: "Balcony %", required: false },
    { id: "basePsf", label: "Base PSF", required: false },
    { id: "floorAdjustment", label: "Floor Premium", required: false },
    { id: "viewPsfAdjustment", label: "View Premium", required: false },
    { id: "finalTotalPrice", label: "Final Price", required: true },
    { id: "finalPsf", label: "Final PSF", required: true },
    { id: "isOptimized", label: "Optimized", required: true },
  ];

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
      
      pricingConfig.additionalCategoryPricing.forEach((item: any) => {
        if (typeof item.column === 'string') {
          columnsSet.add(item.column);
        }
      });
      
      const columns = Array.from(columnsSet) as string[];
      setAdditionalColumns(columns);
    }

    const calculatedUnits = data.map((unit) => {
      const bedroomType = pricingConfig.bedroomTypePricing.find(
        (b: any) => b.type === unit.type
      );
      const viewAdjustment = pricingConfig.viewPricing.find(
        (v: any) => v.view === unit.view
      );
      
      const isBedroomTypeOptimized = bedroomType?.isOptimized || false;
      const optimizedTypes = pricingConfig.optimizedTypes || [];
      const isTypeOptimized = optimizedTypes.includes(unit.type);
      
      const basePsf = bedroomType?.basePsf || pricingConfig.basePsf;
      
      let floorAdjustment = 0;
      const floorLevel = parseInt(unit.floor) || 1;
      
      const sortedFloorRules = [...pricingConfig.floorRiseRules].sort(
        (a: any, b: any) => a.startFloor - b.startFloor
      );
      
      let cumulativeAdjustment = 0;
      for (const rule of sortedFloorRules) {
        const ruleEnd = rule.endFloor === null ? 999 : rule.endFloor;
        if (floorLevel > ruleEnd) {
          for (let floor = Math.max(rule.startFloor, 1); floor <= ruleEnd; floor++) {
            cumulativeAdjustment += rule.psfIncrement;
            if (rule.jumpEveryFloor && rule.jumpIncrement) {
              if ((floor - rule.startFloor + 1) % rule.jumpEveryFloor === 0) {
                cumulativeAdjustment += rule.jumpIncrement;
              }
            }
          }
        } else if (floorLevel >= rule.startFloor) {
          for (let floor = Math.max(rule.startFloor, 1); floor <= floorLevel; floor++) {
            cumulativeAdjustment += rule.psfIncrement;
            if (rule.jumpEveryFloor && rule.jumpIncrement) {
              if ((floor - rule.startFloor + 1) % rule.jumpEveryFloor === 0) {
                cumulativeAdjustment += rule.jumpIncrement;
              }
            }
          }
          break;
        }
      }
      
      floorAdjustment = cumulativeAdjustment;
      
      const viewPsfAdjustment = viewAdjustment?.psfAdjustment || 0;
      
      // Calculate additional category adjustments
      const additionalCategoryPriceComponents: Record<string, number> = {};
      let additionalCategoryAdjustment = 0;
      
      if (pricingConfig.additionalCategoryPricing) {
        pricingConfig.additionalCategoryPricing.forEach((catPricing: any) => {
          const { column, category, psfAdjustment } = catPricing;
          
          // Check if this unit has this category value
          const columnKey = `${column}_value`; // The raw column value we stored
          const matchesCategory = unit[columnKey] === category;
          
          if (matchesCategory) {
            additionalCategoryAdjustment += psfAdjustment;
            
            // Store component for display in detailed breakdown
            const componentKey = `${column}: ${category}`;
            additionalCategoryPriceComponents[componentKey] = psfAdjustment;
          }
        });
      }
      
      // Calculate base PSF with all adjustments
      const basePsfWithAdjustments = basePsf + floorAdjustment + viewPsfAdjustment + additionalCategoryAdjustment;
      
      const sellArea = parseFloat(unit.sellArea) || 0;
      const acArea = parseFloat(unit.acArea) || 0;
      
      let balconyArea = parseFloat(unit.balcony) || 0;
      if (sellArea > 0 && acArea > 0) {
        if (!unit.balcony || unit.balcony === '0') {
          balconyArea = sellArea - acArea;
        }
      }
      const balconyPercentage = sellArea > 0 ? (balconyArea / sellArea) * 100 : 0;
      
      const totalPrice = basePsfWithAdjustments * sellArea;
      const finalTotalPrice = Math.ceil(totalPrice / 1000) * 1000;
      
      // Calculate finalPsf exactly as in PricingSummary - based on finalTotalPrice / sellArea
      const finalPsf = sellArea > 0 ? finalTotalPrice / sellArea : 0;
      
      const basePriceComponent = basePsf * sellArea;
      const floorPriceComponent = floorAdjustment * sellArea;
      const viewPriceComponent = viewPsfAdjustment * sellArea;
      
      return {
        ...unit,
        totalPrice,
        finalTotalPrice,
        finalPsf,
        balconyArea,
        balconyPercentage,
        basePriceComponent,
        floorPriceComponent,
        viewPriceComponent,
        basePsf,
        floorAdjustment,
        viewPsfAdjustment,
        additionalCategoryAdjustment,
        additionalCategoryPriceComponents,
        isOptimized: isTypeOptimized,
      };
    });

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
  }, [units, selectedTypes, selectedViews, selectedFloors, sortConfig]);

  const resetFilters = () => {
    setSelectedTypes([]);
    setSelectedViews([]);
    setSelectedFloors([]);
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

  const exportCSV = () => {
    if (!filteredUnits.length) {
      toast.error("No data to export");
      return;
    }
    
    // Only include visible columns
    const allColumnDefs = [
      ...allColumns,
      ...additionalColumns.map(col => ({ id: col, label: `${col} Premium`, required: false }))
    ];
    
    const visibleColumnDefs = allColumnDefs.filter(col => 
      visibleColumns.includes(col.id) || 
      (additionalColumns.includes(col.id) && visibleColumns.includes(`additional_${col.id}`))
    );
    
    // Build headers from visible columns
    const headers = visibleColumnDefs.map(col => col.label);
    
    // Create each row of data
    const rows = filteredUnits.map((unit) => {
      return visibleColumnDefs.map(col => {
        const value = unit[col.id];
        
        // Format based on column type
        if (col.id === "isOptimized") {
          return value ? "Yes" : "No";
        } else if (["sellArea", "acArea", "balconyArea"].includes(col.id)) {
          return typeof value === 'number' ? value.toFixed(2) : value;
        } else if (col.id === "balconyPercentage") {
          return typeof value === 'number' ? value.toFixed(2) + "%" : value;
        } else if (col.id === "finalTotalPrice") {
          return value;
        } else if (typeof value === 'number') {
          return value.toFixed(2);
        }
        
        return value !== undefined && value !== null ? value : "";
      });
    });
    
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((row) => row.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "pricing_simulation.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file downloaded successfully");
  };

  // Get unique bedroom types, views, and floors for filters
  const uniqueTypes = getUniqueValues("type");
  const uniqueViews = getUniqueValues("view");
  const uniqueFloors = getUniqueValues("floor");

  // Calculate active filters count
  const activeFiltersCount = 
    (selectedTypes.length > 0 ? 1 : 0) +
    (selectedViews.length > 0 ? 1 : 0) +
    (selectedFloors.length > 0 ? 1 : 0);

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Unit Pricing Details
        </CardTitle>
        <CardDescription>
          View and filter detailed pricing for all units
        </CardDescription>
      </CardHeader>
      <CardContent>
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
          <div className="md:col-span-3 flex flex-col justify-end">
            <div className="flex space-x-2 overflow-x-auto">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetFilters}
                className="flex-shrink-0 whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-shrink-0 whitespace-nowrap"
                  >
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
                  {additionalColumns.map(column => (
                    <DropdownMenuCheckboxItem
                      key={column}
                      checked={visibleColumns.includes(column)}
                      onCheckedChange={() => toggleColumnVisibility(column)}
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
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportCSV}
                className="flex-shrink-0 whitespace-nowrap"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

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
                
                {/* Additional category columns */}
                {additionalColumns.map(column => (
                  visibleColumns.includes(column) && (
                    <TableHead
                      key={column}
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
                      Final PSF <ArrowUpDown className="ml-1 h-4 w-4" />
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
                    
                    {/* Additional category columns */}
                    {additionalColumns.map(column => (
                      visibleColumns.includes(column) && (
                        <TableCell key={column} className="text-right">
                          {(unit.additionalCategoryPriceComponents && 
                           unit.additionalCategoryPriceComponents[`${column}: ${unit[`${column}_value`]}`]) || 
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
      </CardContent>
    </Card>
  );
};

export default PricingSimulator;
