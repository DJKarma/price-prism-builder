
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
import { ArrowUpDown, Download, Calculator } from "lucide-react";
import { toast } from "sonner";
import { PricingConfig } from "./PricingConfiguration";

interface PricingSimulatorProps {
  data: any[];
  pricingConfig: PricingConfig;
}

interface UnitWithPricing extends Record<string, any> {
  calculatedPsf: number;
  totalPrice: number;
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
      
      // Calculate total price
      const sellArea = parseFloat(unit.sellArea) || 0;
      const totalPrice = calculatedPsf * sellArea;
      
      return {
        ...unit,
        calculatedPsf,
        totalPrice,
      };
    });

    setUnits(calculatedUnits);
    setFilteredUnits(calculatedUnits);
    
    // Calculate unit type summaries
    const typeGroups: Record<string, UnitWithPricing[]> = {};
    calculatedUnits.forEach(unit => {
      if (!unit.type) return;
      
      if (!typeGroups[unit.type]) {
        typeGroups[unit.type] = [];
      }
      
      typeGroups[unit.type].push(unit);
    });
    
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
    
    // Create CSV headers
    const headers = [
      "Unit",
      "Bedroom Type",
      "Floor",
      "View",
      "Sell Area",
      "PSF",
      "Total Price",
    ];
    
    // Create CSV rows
    const rows = filteredUnits.map((unit) => [
      unit.name,
      unit.type,
      unit.floor,
      unit.view,
      unit.sellArea,
      unit.calculatedPsf.toFixed(2),
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

          {/* Results Table */}
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
                    onClick={() => handleSort("calculatedPsf")}
                  >
                    <div className="flex items-center">
                      PSF <ArrowUpDown className="ml-1 h-4 w-4" />
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
                    <TableCell>
                      ${unit.calculatedPsf.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
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
                    <TableCell colSpan={7} className="text-center py-4">
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
