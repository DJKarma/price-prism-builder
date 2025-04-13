
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpDown,
  Download,
  Filter,
  Table as TableIcon,
  Check,
  Info,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { PricingConfig } from "./PricingConfiguration";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PricingSimulatorProps {
  data: any[];
  pricingConfig: PricingConfig;
  onConfigUpdate?: (updatedConfig: PricingConfig) => void;
}

interface UnitWithPricing extends Record<string, any> {
  calculatedPsf: number;
  totalPrice: number;
  finalTotalPrice: number; // Ceiled total price
  balconyArea?: number;
  balconyPercentage?: number;
  basePriceComponent?: number;
  floorPriceComponent?: number;
  viewPriceComponent?: number;
  finalPsf?: number; // Added for clarity
  isOptimized?: boolean; // Flag to indicate if this unit's price was optimized
}

interface OptimizationState {
  [bedroomType: string]: {
    originalBasePsf: number;
    optimizedBasePsf: number;
    isOptimized: boolean;
  };
}

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
  } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({
    type: "",
    view: "",
    floor: "",
  });
  
  // Optimization state
  const [optimizationState, setOptimizationState] = useState<OptimizationState>({});
  
  // Process the data with pricing calculations
  useEffect(() => {
    if (!data.length || !pricingConfig) return;

    // Initialize optimization state with original base PSF values
    const initialOptimizationState: OptimizationState = {};
    pricingConfig.bedroomTypePricing.forEach((typeConfig) => {
      initialOptimizationState[typeConfig.type] = {
        originalBasePsf: typeConfig.basePsf,
        optimizedBasePsf: typeConfig.basePsf,
        isOptimized: false,
      };
    });
    setOptimizationState(initialOptimizationState);

    const calculatedUnits = data.map((unit) => {
      // Base calculation
      const bedroomType = pricingConfig.bedroomTypePricing.find(
        (b) => b.type === unit.type
      );
      const viewAdjustment = pricingConfig.viewPricing.find(
        (v) => v.view === unit.view
      );
      
      // Check if this unit type has an optimized base PSF
      const optimizationInfo = initialOptimizationState[unit.type];
      const useOptimizedBasePsf = optimizationInfo?.isOptimized && optimizationInfo?.optimizedBasePsf;
      
      // Base price from unit type or default base
      const basePsf = useOptimizedBasePsf 
        ? optimizationInfo.optimizedBasePsf 
        : (bedroomType?.basePsf || pricingConfig.basePsf);
      
      // Calculate floor adjustment using cumulative and jump logic
      let floorAdjustment = 0;
      const floorLevel = parseInt(unit.floor) || 1;
      
      // Sort floor rules by startFloor to process them in order
      const sortedFloorRules = [...pricingConfig.floorRiseRules].sort(
        (a, b) => a.startFloor - b.startFloor
      );
      
      // Calculate cumulative floor adjustment by iterating through each floor in the applicable range
      let cumulativeAdjustment = 0;
      for (const rule of sortedFloorRules) {
        const ruleEnd = rule.endFloor; // Already set or defaulted elsewhere
        if (floorLevel > ruleEnd) {
          // Process full range for this rule
          for (let floor = Math.max(rule.startFloor, 1); floor <= ruleEnd; floor++) {
            cumulativeAdjustment += rule.psfIncrement;
            if (rule.jumpEveryFloor && rule.jumpIncrement) {
              if ((floor - rule.startFloor + 1) % rule.jumpEveryFloor === 0) {
                cumulativeAdjustment += rule.jumpIncrement;
              }
            }
          }
        } else if (floorLevel >= rule.startFloor) {
          // Process only up to the unit's floor in this rule
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
      
      // Calculate view adjustment
      const viewPsfAdjustment = viewAdjustment?.psfAdjustment || 0;
      
      // Calculate final PSF
      const calculatedPsf = basePsf + floorAdjustment + viewPsfAdjustment;
      
      // Calculate sell area and AC area to numeric values
      const sellArea = parseFloat(unit.sellArea) || 0;
      const acArea = parseFloat(unit.acArea) || 0;
      
      // Calculate balcony area and percentage
      let balconyArea = parseFloat(unit.balcony) || 0;
      if (sellArea > 0 && acArea > 0) {
        if (!unit.balcony || unit.balcony === '0') {
          balconyArea = sellArea - acArea;
        }
      }
      const balconyPercentage = sellArea > 0 ? (balconyArea / sellArea) * 100 : 0;
      
      // Calculate total and final prices
      const totalPrice = calculatedPsf * sellArea;
      const finalTotalPrice = Math.ceil(totalPrice / 1000) * 1000;
      const finalPsf = sellArea > 0 ? finalTotalPrice / sellArea : 0;
      
      // Calculate price components
      const basePriceComponent = basePsf * sellArea;
      const floorPriceComponent = floorAdjustment * sellArea;
      const viewPriceComponent = viewPsfAdjustment * sellArea;
      
      return {
        ...unit,
        calculatedPsf,
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
        isOptimized: useOptimizedBasePsf,
      };
    });

    setUnits(calculatedUnits);
    setFilteredUnits(calculatedUnits);
    
  }, [data, pricingConfig]);

  // Apply filters
  useEffect(() => {
    let result = [...units];
    if (filters.type) {
      result = result.filter((unit) => unit.type === filters.type);
    }
    if (filters.view) {
      result = result.filter((unit) => unit.view === filters.view);
    }
    if (filters.floor) {
      result = result.filter((unit) => unit.floor === filters.floor);
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
  }, [units, filters, sortConfig]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      type: "",
      view: "",
      floor: "",
    });
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

  const exportCSV = () => {
    if (!filteredUnits.length) {
      toast.error("No data to export");
      return;
    }
    const headers = [
      "Unit",
      "Bedroom Type",
      "Floor",
      "View",
      "Sell Area",
      "AC Area",
      "Balcony Area",
      "Balcony %",
      "Base PSF",
      "Floor Premium PSF",
      "View Premium PSF",
      "Total PSF",
      "Base Price",
      "Floor Premium",
      "View Premium",
      "Total Price (Raw)",
      "Final Total Price",
      "Final PSF",
      "Optimized",
    ];
    const rows = filteredUnits.map((unit) => [
      unit.name,
      unit.type,
      unit.floor,
      unit.view,
      unit.sellArea,
      unit.acArea || 0,
      unit.balconyArea ? unit.balconyArea.toFixed(2) : 0,
      unit.balconyPercentage ? unit.balconyPercentage.toFixed(2) : 0,
      unit.basePsf.toFixed(2),
      unit.floorAdjustment.toFixed(2),
      unit.viewPsfAdjustment.toFixed(2),
      unit.calculatedPsf.toFixed(2),
      unit.basePriceComponent.toFixed(2),
      unit.floorPriceComponent.toFixed(2),
      unit.viewPriceComponent.toFixed(2),
      unit.totalPrice.toFixed(2),
      unit.finalTotalPrice.toFixed(2),
      unit.finalPsf ? unit.finalPsf.toFixed(2) : "0",
      unit.isOptimized ? "Yes" : "No",
    ]);
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div>
            <Select
              value={filters.type}
              onValueChange={(value) => handleFilterChange("type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {getUniqueValues("type").map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={filters.view}
              onValueChange={(value) => handleFilterChange("view", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Views" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Views</SelectItem>
                {getUniqueValues("view").map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={filters.floor}
              onValueChange={(value) => handleFilterChange("floor", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Floors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Floors</SelectItem>
                {getUniqueValues("floor").map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={resetFilters}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
          </div>
          <div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={exportCSV}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
          </div>
        </div>

        <FixedHeaderTable maxHeight="480px">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    Unit <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("type")}
                >
                  <div className="flex items-center">
                    Type <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("floor")}
                >
                  <div className="flex items-center">
                    Floor <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>View</TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("sellArea")}
                >
                  <div className="flex items-center">
                    Sell Area <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("acArea")}
                >
                  <div className="flex items-center">
                    AC Area <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("balconyArea")}
                >
                  <div className="flex items-center">
                    Balcony <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("balconyPercentage")}
                >
                  <div className="flex items-center">
                    Balcony % <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("basePsf")}
                >
                  <div className="flex items-center">
                    Base PSF <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("floorAdjustment")}
                >
                  <div className="flex items-center">
                    Floor Premium <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("viewPsfAdjustment")}
                >
                  <div className="flex items-center">
                    View Premium <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("calculatedPsf")}
                >
                  <div className="flex items-center">
                    Total PSF <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("finalTotalPrice")}
                >
                  <div className="flex items-center">
                    Final Price <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("finalPsf")}
                >
                  <div className="flex items-center">
                    Final PSF <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center justify-center">
                    Optimized
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits.slice(0, 15).map((unit, index) => (
                <TableRow key={index} className={unit.isOptimized ? "bg-green-50 dark:bg-green-950/20" : ""}>
                  <TableCell className="font-medium">{unit.name}</TableCell>
                  <TableCell>{unit.type || "—"}</TableCell>
                  <TableCell>{unit.floor || "—"}</TableCell>
                  <TableCell>{unit.view || "—"}</TableCell>
                  <TableCell>{unit.sellArea || "0"}</TableCell>
                  <TableCell>{unit.acArea || "0"}</TableCell>
                  <TableCell>
                    {unit.balconyArea ? unit.balconyArea.toFixed(2) : "0"}
                  </TableCell>
                  <TableCell>
                    {unit.balconyPercentage ? unit.balconyPercentage.toFixed(2) : "0"}%
                  </TableCell>
                  <TableCell>
                    {unit.basePsf.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {unit.floorAdjustment.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {unit.viewPsfAdjustment.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {unit.calculatedPsf.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {unit.finalTotalPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </TableCell>
                  <TableCell>
                    {unit.finalPsf?.toFixed(2) || "0.00"}
                  </TableCell>
                  <TableCell className="text-center">
                    {unit.isOptimized ? <Check className="h-4 w-4 text-green-600 inline" /> : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {filteredUnits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={15} className="text-center py-4">
                    No units match your filter criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </FixedHeaderTable>
        <div className="mt-4 text-sm text-muted-foreground flex items-center justify-between">
          <div>
            Showing {Math.min(15, filteredUnits.length)} of {filteredUnits.length} units
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Table shows up to 15 rows at a time. Use filters to narrow results.</p>
              </TooltipContent>
            </Tooltip>
            <Filter className="h-4 w-4 mr-2" />
            <span>{Object.values(filters).filter(Boolean).length} active filters</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingSimulator;
