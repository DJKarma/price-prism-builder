
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ArrowUpDown, Download, Calculator, Layers } from "lucide-react";
import { toast } from "sonner";
import { PricingConfig } from "./PricingConfiguration";

interface PricingSimulatorProps {
  data: any[];
  pricingConfig: PricingConfig;
}

interface UnitWithPricing extends Record<string, any> {
  calculatedPsf: number;
  totalPrice: number;
  balconyArea?: number;
  balconyPercentage?: number;
  basePriceComponent?: number;
  floorPriceComponent?: number;
  viewPriceComponent?: number;
}

interface TypeSummary {
  type: string;
  count: number;
  minPsf: number;
  avgPsf: number;
  maxPsf: number;
  minPrice: number;
  avgPrice: number;
  maxPrice: number;
  minSize: number;
  avgSize: number;
  maxSize: number;
}

const PricingSimulator: React.FC<PricingSimulatorProps> = ({
  data,
  pricingConfig,
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
  const [typeSummary, setTypeSummary] = useState<
    Array<{ type: string; avgPsf: number; targetPsf: number; units: number }>
  >([]);
  const [detailedTypeSummary, setDetailedTypeSummary] = useState<TypeSummary[]>([]);

  // Process the data with pricing calculations
  useEffect(() => {
    if (!data.length || !pricingConfig) return;

    const calculatedUnits = data.map((unit) => {
      // Base calculation
      const bedroomType = pricingConfig.bedroomTypePricing.find(
        (b) => b.type === unit.type
      );
      const viewAdjustment = pricingConfig.viewPricing.find(
        (v) => v.view === unit.view
      );
      
      // Base price from unit type or default base
      const basePsf = bedroomType?.basePsf || pricingConfig.basePsf;
      
      // Calculate floor adjustment
      let floorAdjustment = 0;
      const floorLevel = parseInt(unit.floor) || 1;
      
      for (const rule of pricingConfig.floorRiseRules) {
        if (floorLevel >= rule.startFloor && floorLevel <= rule.endFloor) {
          floorAdjustment = 
            (floorLevel - rule.startFloor + 1) * rule.psfIncrement;
          break;
        }
      }
      
      // Calculate view adjustment
      const viewPsfAdjustment = viewAdjustment?.psfAdjustment || 0;
      
      // Calculate final PSF
      const calculatedPsf = basePsf + floorAdjustment + viewPsfAdjustment;
      
      // Calculate sell area and AC area to numeric values
      const sellArea = parseFloat(unit.sellArea) || 0;
      const acArea = parseFloat(unit.acArea) || 0;
      
      // Calculate balcony area and percentage
      let balconyArea = parseFloat(unit.balcony) || 0;
      
      // If balcony is not provided but sell area and AC area are available, calculate it
      if ((!unit.balcony || unit.balcony === '0') && sellArea > 0 && acArea > 0) {
        balconyArea = sellArea - acArea;
      }
      
      // Calculate balcony percentage
      const balconyPercentage = sellArea > 0 ? (balconyArea / sellArea) * 100 : 0;
      
      // Calculate total price
      const totalPrice = calculatedPsf * sellArea;
      
      // Calculate price components
      const basePriceComponent = basePsf * sellArea;
      const floorPriceComponent = floorAdjustment * sellArea;
      const viewPriceComponent = viewPsfAdjustment * sellArea;
      
      return {
        ...unit,
        calculatedPsf,
        totalPrice,
        balconyArea,
        balconyPercentage,
        basePriceComponent,
        floorPriceComponent,
        viewPriceComponent,
      };
    });

    setUnits(calculatedUnits);
    setFilteredUnits(calculatedUnits);
    
    // Calculate unit type summaries for chart
    const typeGroups: Record<string, UnitWithPricing[]> = {};
    calculatedUnits.forEach(unit => {
      if (!unit.type) return;
      
      if (!typeGroups[unit.type]) {
        typeGroups[unit.type] = [];
      }
      
      typeGroups[unit.type].push(unit);
    });
    
    // Basic summary for chart
    const summaries = Object.entries(typeGroups).map(([type, unitGroup]) => {
      const totalPsf = unitGroup.reduce((sum, unit) => sum + unit.calculatedPsf, 0);
      const avgPsf = totalPsf / unitGroup.length;
      
      const targetConfig = pricingConfig.bedroomTypePricing.find(
        (b) => b.type === type
      );
      
      return {
        type,
        avgPsf,
        targetPsf: targetConfig?.targetAvgPsf || pricingConfig.basePsf,
        units: unitGroup.length,
      };
    });
    
    setTypeSummary(summaries);
    
    // Detailed summary by bedroom type
    const detailedSummaries = Object.entries(typeGroups).map(([type, unitGroup]) => {
      // Get PSF stats
      const psfValues = unitGroup.map(u => u.calculatedPsf);
      const minPsf = Math.min(...psfValues);
      const maxPsf = Math.max(...psfValues);
      const avgPsf = psfValues.reduce((sum, val) => sum + val, 0) / psfValues.length;
      
      // Get price stats
      const priceValues = unitGroup.map(u => u.totalPrice);
      const minPrice = Math.min(...priceValues);
      const maxPrice = Math.max(...priceValues);
      const avgPrice = priceValues.reduce((sum, val) => sum + val, 0) / priceValues.length;
      
      // Get size stats
      const sizeValues = unitGroup.map(u => parseFloat(u.sellArea) || 0);
      const minSize = Math.min(...sizeValues);
      const maxSize = Math.max(...sizeValues);
      const avgSize = sizeValues.reduce((sum, val) => sum + val, 0) / sizeValues.length;
      
      return {
        type,
        count: unitGroup.length,
        minPsf,
        avgPsf,
        maxPsf,
        minPrice,
        avgPrice,
        maxPrice,
        minSize,
        avgSize,
        maxSize
      };
    });
    
    setDetailedTypeSummary(detailedSummaries);
    
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

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
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
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
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
    
    return Array.from(values).sort();
  };

  const calculateTotals = () => {
    const total = filteredUnits.reduce(
      (acc, unit) => {
        const sellArea = parseFloat(unit.sellArea) || 0;
        
        return {
          units: acc.units + 1,
          area: acc.area + sellArea,
          value: acc.value + unit.totalPrice,
        };
      },
      { units: 0, area: 0, value: 0 }
    );
    
    return {
      ...total,
      avgPsf: total.area ? total.value / total.area : 0,
    };
  };

  const exportCSV = () => {
    if (!filteredUnits.length) {
      toast.error("No data to export");
      return;
    }
    
    // Create CSV headers including new columns
    const headers = [
      "Unit",
      "Bedroom Type",
      "Floor",
      "View",
      "Sell Area",
      "AC Area",
      "Balcony Area",
      "Balcony %",
      "PSF",
      "Base Price",
      "Floor Premium",
      "View Premium", 
      "Total Price",
    ];
    
    // Create CSV rows with all component values
    const rows = filteredUnits.map((unit) => [
      unit.name,
      unit.type,
      unit.floor,
      unit.view,
      unit.sellArea,
      unit.acArea || 0,
      unit.balconyArea ? unit.balconyArea.toFixed(2) : 0,
      unit.balconyPercentage ? unit.balconyPercentage.toFixed(2) : 0,
      unit.calculatedPsf.toFixed(2),
      unit.basePriceComponent.toFixed(2),
      unit.floorPriceComponent.toFixed(2),
      unit.viewPriceComponent.toFixed(2),
      unit.totalPrice.toFixed(2),
    ]);
    
    // Combine headers and rows
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((row) => row.join(",")).join("\n");
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "pricing_simulation.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("CSV file downloaded successfully");
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Pricing Simulation Results
          </CardTitle>
          <CardDescription>
            Summary of calculated prices based on your configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Units</p>
              <p className="text-2xl font-bold">{totals.units}</p>
            </div>
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Sell Area</p>
              <p className="text-2xl font-bold">
                {totals.area.toLocaleString()} sqft
              </p>
            </div>
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Average PSF</p>
              <p className="text-2xl font-bold">
                ${totals.avgPsf.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">
                ${totals.value.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
          </div>

          {/* Type Summary Chart */}
          {typeSummary.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Bedroom Type Analysis</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={typeSummary}
                    margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`$${parseFloat(value as string).toFixed(2)}`, "PSF"]}
                    />
                    <Legend />
                    <Bar
                      name="Average PSF"
                      dataKey="avgPsf"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      name="Target PSF"
                      dataKey="targetPsf"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bedroom Type</TableHead>
                      <TableHead>Units</TableHead>
                      <TableHead>Average PSF</TableHead>
                      <TableHead>Target PSF</TableHead>
                      <TableHead>Difference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typeSummary.map((summary) => (
                      <TableRow key={summary.type}>
                        <TableCell className="font-medium">{summary.type}</TableCell>
                        <TableCell>{summary.units}</TableCell>
                        <TableCell>
                          ${summary.avgPsf.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          ${summary.targetPsf.toFixed(2)}
                        </TableCell>
                        <TableCell className={
                          Math.abs(summary.avgPsf - summary.targetPsf) / summary.targetPsf > 0.05
                            ? "text-destructive"
                            : "text-green-600"
                        }>
                          ${(summary.avgPsf - summary.targetPsf).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          
          {/* New: Detailed Bedroom Type Summary */}
          {detailedTypeSummary.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Detailed Bedroom Type Summary
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Min PSF</TableHead>
                      <TableHead>Avg PSF</TableHead>
                      <TableHead>Max PSF</TableHead>
                      <TableHead>Min Price</TableHead>
                      <TableHead>Avg Price</TableHead>
                      <TableHead>Max Price</TableHead>
                      <TableHead>Min Size</TableHead>
                      <TableHead>Avg Size</TableHead>
                      <TableHead>Max Size</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedTypeSummary.map((summary) => (
                      <TableRow key={summary.type}>
                        <TableCell className="font-medium">{summary.type}</TableCell>
                        <TableCell>{summary.count}</TableCell>
                        <TableCell>${summary.minPsf.toFixed(2)}</TableCell>
                        <TableCell>${summary.avgPsf.toFixed(2)}</TableCell>
                        <TableCell>${summary.maxPsf.toFixed(2)}</TableCell>
                        <TableCell>${summary.minPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                        <TableCell>${summary.avgPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                        <TableCell>${summary.maxPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                        <TableCell>{summary.minSize.toFixed(1)} sqft</TableCell>
                        <TableCell>{summary.avgSize.toFixed(1)} sqft</TableCell>
                        <TableCell>{summary.maxSize.toFixed(1)} sqft</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Unit Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Unit Pricing Details</CardTitle>
          <CardDescription>
            View and filter detailed pricing for all units
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Select
                value={filters.type}
                onValueChange={(value) => handleFilterChange("type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Type" />
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
                  <SelectValue placeholder="Filter by View" />
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
                  <SelectValue placeholder="Filter by Floor" />
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
            <div className="md:flex justify-end">
              <Button variant="outline" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button>
            </div>
          </div>

          {/* Results Table with Added Columns */}
          <div className="overflow-x-auto">
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
                      Area <ArrowUpDown className="ml-1 h-4 w-4" />
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
                    onClick={() => handleSort("calculatedPsf")}
                  >
                    <div className="flex items-center">
                      PSF <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("basePriceComponent")}
                  >
                    <div className="flex items-center">
                      Base Price <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("floorPriceComponent")}
                  >
                    <div className="flex items-center">
                      Floor Premium <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("viewPriceComponent")}
                  >
                    <div className="flex items-center">
                      View Premium <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("totalPrice")}
                  >
                    <div className="flex items-center">
                      Total Price <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUnits.map((unit, index) => (
                  <TableRow key={index}>
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
                      ${unit.calculatedPsf.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      ${unit.basePriceComponent.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </TableCell>
                    <TableCell>
                      ${unit.floorPriceComponent.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </TableCell>
                    <TableCell>
                      ${unit.viewPriceComponent.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </TableCell>
                    <TableCell>
                      ${unit.totalPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUnits.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-4">
                      No units match your filter criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Showing {filteredUnits.length} of {units.length} units
        </CardFooter>
      </Card>
    </div>
  );
};

export default PricingSimulator;
