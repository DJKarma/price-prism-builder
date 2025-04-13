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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PricingSummary from "./PricingSummary";

interface PricingSimulatorProps {
  data: any[];
  pricingConfig: any;
  onConfigUpdate?: (updatedConfig: any) => void;
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

  useEffect(() => {
    if (pricingConfig?.optimizedTypes?.length && filters.type === "") {
      const optimizedTypes = pricingConfig.optimizedTypes;
      if (optimizedTypes.length === 1) {
        setFilters(prev => ({ ...prev, type: optimizedTypes[0] }));
        toast.info(`Filtered to show optimized bedroom type: ${optimizedTypes[0]}`);
      }
    }
  }, [pricingConfig?.optimizedTypes, filters.type]);

  useEffect(() => {
    if (!data.length || !pricingConfig) return;

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
      
      const calculatedPsf = basePsf + floorAdjustment + viewPsfAdjustment;
      
      const sellArea = parseFloat(unit.sellArea) || 0;
      const acArea = parseFloat(unit.acArea) || 0;
      
      let balconyArea = parseFloat(unit.balcony) || 0;
      if (sellArea > 0 && acArea > 0) {
        if (!unit.balcony || unit.balcony === '0') {
          balconyArea = sellArea - acArea;
        }
      }
      const balconyPercentage = sellArea > 0 ? (balconyArea / sellArea) * 100 : 0;
      
      const totalPrice = calculatedPsf * sellArea;
      const finalTotalPrice = Math.ceil(totalPrice / 1000) * 1000;
      const finalPsf = sellArea > 0 ? finalTotalPrice / sellArea : 0;
      
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
        isOptimized: isTypeOptimized,
      };
    });

    setUnits(calculatedUnits);
    setFilteredUnits(calculatedUnits);
  }, [data, pricingConfig]);

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
    toast.info(`Filter applied: ${key} = ${value || 'All'}`);
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
    <>
      <PricingSummary data={units} />
      
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

          <FixedHeaderTable maxHeight="650px">
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
                {filteredUnits.map((unit, index) => (
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

          <div className="mt-4 flex items-center justify-end">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Filter className="h-4 w-4 mr-1" />
              <span>{Object.values(filters).filter(Boolean).length} active filters</span>
              <span className="ml-2">Showing {filteredUnits.length} units</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default PricingSimulator;
