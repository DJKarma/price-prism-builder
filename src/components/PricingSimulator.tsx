
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
import { 
  ArrowUpDown, 
  Download, 
  Calculator, 
  Layers, 
  Filter, 
  ChartBar,
  BedDouble,
  PieChart,
  Table as TableIcon,
  Check,
  CheckCheck,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { toast } from "sonner";
import { PricingConfig } from "./PricingConfiguration";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface PricingSimulatorProps {
  data: any[];
  pricingConfig: PricingConfig;
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

// Stats configuration for summary table
interface SummaryStatConfig {
  id: string;
  label: string;
  enabled: boolean;
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
  
  // Summary stats configuration
  const [summaryStats, setSummaryStats] = useState<SummaryStatConfig[]>([
    { id: "count", label: "Unit Count", enabled: true },
    { id: "psf", label: "PSF Stats", enabled: true },
    { id: "price", label: "Price Stats", enabled: true },
    { id: "size", label: "Size Stats", enabled: true },
  ]);
  
  // Card view control
  const [summaryCardView, setSummaryCardView] = useState<"compact" | "detailed">("compact");

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
      
      // Calculate floor adjustment - FIXED to be cumulative
      let floorAdjustment = 0;
      const floorLevel = parseInt(unit.floor) || 1;
      
      // Sort floor rules by startFloor to process them in order
      const sortedFloorRules = [...pricingConfig.floorRiseRules].sort(
        (a, b) => a.startFloor - b.startFloor
      );
      
      // Calculate cumulative floor adjustment
      let currentFloor = 1;
      let cumulativeAdjustment = 0;
      
      for (const rule of sortedFloorRules) {
        // If we already passed this rule's range, apply full adjustment
        if (floorLevel > rule.endFloor) {
          // Apply adjustment for all floors in this range
          const floorsInRange = rule.endFloor - Math.max(currentFloor, rule.startFloor) + 1;
          cumulativeAdjustment += floorsInRange * rule.psfIncrement;
          currentFloor = rule.endFloor + 1;
        } 
        // If we're within this rule's range
        else if (floorLevel >= rule.startFloor) {
          // Apply adjustment for floors up to the unit's floor
          const floorsInRange = floorLevel - Math.max(currentFloor, rule.startFloor) + 1;
          cumulativeAdjustment += floorsInRange * rule.psfIncrement;
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
      
      // If balcony is not provided but sell area and AC area are available, calculate it
      if (sellArea > 0 && acArea > 0) {
        // If balcony is provided, use it, otherwise calculate
        if (!unit.balcony || unit.balcony === '0') {
          balconyArea = sellArea - acArea;
        }
      }
      
      // Calculate balcony percentage
      const balconyPercentage = sellArea > 0 ? (balconyArea / sellArea) * 100 : 0;
      
      // Calculate total price
      const totalPrice = calculatedPsf * sellArea;
      
      // Calculate ceiled total price (to nearest 1000)
      const finalTotalPrice = Math.ceil(totalPrice / 1000) * 1000;
      
      // Calculate price components
      const basePriceComponent = basePsf * sellArea;
      const floorPriceComponent = floorAdjustment * sellArea;
      const viewPriceComponent = viewPsfAdjustment * sellArea;
      
      return {
        ...unit,
        calculatedPsf,
        totalPrice,
        finalTotalPrice,
        balconyArea,
        balconyPercentage,
        basePriceComponent,
        floorPriceComponent,
        viewPriceComponent,
        basePsf,
        floorAdjustment,
        viewPsfAdjustment
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
    
    // Detailed summary by bedroom type - use ceiled prices for calculations
    const detailedSummaries = Object.entries(typeGroups).map(([type, unitGroup]) => {
      // Get PSF stats - use final PSF based on ceiled price
      const psfValues = unitGroup.map(u => u.finalTotalPrice / parseFloat(u.sellArea));
      const minPsf = Math.min(...psfValues);
      const maxPsf = Math.max(...psfValues);
      const avgPsf = psfValues.reduce((sum, val) => sum + val, 0) / psfValues.length;
      
      // Get price stats - use ceiled total price
      const priceValues = unitGroup.map(u => u.finalTotalPrice);
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

    // Apply sorting with numeric handling for floors
    if (sortConfig) {
      result.sort((a, b) => {
        // Special handling for floor field to sort numerically
        if (sortConfig.key === 'floor') {
          const floorA = parseInt(a.floor) || 0;
          const floorB = parseInt(b.floor) || 0;
          
          return sortConfig.direction === "ascending" 
            ? floorA - floorB 
            : floorB - floorA;
        }
        
        // Normal sorting for other fields
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

  const toggleSummaryStat = (id: string) => {
    setSummaryStats((prev) =>
      prev.map((stat) =>
        stat.id === id ? { ...stat, enabled: !stat.enabled } : stat
      )
    );
  };

  const getUniqueValues = (fieldName: string): string[] => {
    const values = new Set<string>();
    
    units.forEach((unit) => {
      if (unit[fieldName]) {
        values.add(unit[fieldName]);
      }
    });
    
    // For floor field, sort numerically
    if (fieldName === 'floor') {
      return Array.from(values).sort((a, b) => parseInt(a) - parseInt(b));
    }
    
    return Array.from(values).sort();
  };

  const calculateTotals = () => {
    const total = filteredUnits.reduce(
      (acc, unit) => {
        const sellArea = parseFloat(unit.sellArea) || 0;
        
        return {
          units: acc.units + 1,
          area: acc.area + sellArea,
          value: acc.value + unit.finalTotalPrice, // Use ceiled price
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
    
    // Create CSV headers including all columns
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
      "Final PSF"
    ];
    
    // Create CSV rows with all component values
    const rows = filteredUnits.map((unit) => {
      const sellArea = parseFloat(unit.sellArea) || 0;
      const finalPsf = sellArea > 0 ? unit.finalTotalPrice / sellArea : 0;
      
      return [
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
        finalPsf.toFixed(2)
      ];
    });
    
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Pricing Simulation Results
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant={summaryCardView === "compact" ? "default" : "outline"} 
                size="sm"
                className="h-8"
                onClick={() => setSummaryCardView("compact")}
              >
                <Minimize2 className="h-4 w-4 mr-1" />
                Compact
              </Button>
              <Button 
                variant={summaryCardView === "detailed" ? "default" : "outline"} 
                size="sm"
                className="h-8"
                onClick={() => setSummaryCardView("detailed")}
              >
                <Maximize2 className="h-4 w-4 mr-1" />
                Detailed
              </Button>
            </div>
          </div>
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
                {totals.avgPsf.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">
                {totals.value.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
          </div>

          {/* Type Summary Cards */}
          {detailedTypeSummary.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <BedDouble className="h-5 w-5" />
                  Bedroom Type Summary
                </h3>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1">
                      <Filter className="h-4 w-4" />
                      <span>Select Statistics</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border border-border">
                    <DropdownMenuLabel>Display Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {summaryStats.map((stat) => (
                      <DropdownMenuCheckboxItem
                        key={stat.id}
                        checked={stat.enabled}
                        onCheckedChange={() => toggleSummaryStat(stat.id)}
                      >
                        {stat.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Compact Summary Cards */}
              {summaryCardView === "compact" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {detailedTypeSummary.map((summary) => (
                    <Card key={summary.type} className="border border-muted">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-md font-semibold">
                          {summary.type}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-sm text-muted-foreground">Units</p>
                            <p className="font-medium">{summary.count}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Avg Size</p>
                            <p className="font-medium">{summary.avgSize.toFixed(1)} sqft</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Avg PSF</p>
                            <p className="font-medium">{summary.avgPsf.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Avg Price</p>
                            <p className="font-medium">{summary.avgPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                          </div>
                        </div>
                        
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <Button variant="ghost" size="sm" className="mt-2 w-full text-xs">
                              View More Details
                            </Button>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80 p-3">
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div className="col-span-3">
                                <p className="text-sm font-semibold mb-1">{summary.type} - {summary.count} units</p>
                              </div>
                              <div className="bg-muted/30 p-2 rounded">
                                <p className="text-xs text-muted-foreground">PSF Range</p>
                                <p className="text-xs font-medium mt-1">{summary.minPsf.toFixed(2)} - {summary.maxPsf.toFixed(2)}</p>
                              </div>
                              <div className="bg-muted/30 p-2 rounded">
                                <p className="text-xs text-muted-foreground">Size Range</p>
                                <p className="text-xs font-medium mt-1">{summary.minSize.toFixed(1)} - {summary.maxSize.toFixed(1)}</p>
                              </div>
                              <div className="bg-muted/30 p-2 rounded">
                                <p className="text-xs text-muted-foreground">Price Range</p>
                                <p className="text-xs font-medium mt-1">
                                  {summary.minPrice.toLocaleString(undefined, {maximumFractionDigits: 0})} - {summary.maxPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}
                                </p>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              {/* Detailed Summary Cards - only show if detailed view is selected */}
              {summaryCardView === "detailed" && (
                <div className="grid grid-cols-1 gap-4">
                  {detailedTypeSummary.map((summary) => (
                    <Card key={summary.type} className="overflow-hidden">
                      <CardHeader className="py-3 bg-muted/30">
                        <CardTitle className="text-md">
                          {summary.type} ({summary.count} units)
                        </CardTitle>
                      </CardHeader>
                      <div className="grid grid-cols-1 divide-y md:divide-y-0 md:divide-x md:grid-cols-4">
                        {/* Unit Count - Always show */}
                        {summaryStats.find(s => s.id === "count")?.enabled && (
                          <div className="p-4">
                            <h4 className="text-sm font-medium mb-2">Unit Count</h4>
                            <p className="text-xl font-medium">{summary.count}</p>
                          </div>
                        )}
                        
                        {/* PSF Stats */}
                        {summaryStats.find(s => s.id === "psf")?.enabled && (
                          <div className="p-4">
                            <h4 className="text-sm font-medium mb-2">Price Per Square Foot</h4>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Min</p>
                                <p className="font-medium">{summary.minPsf.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Avg</p>
                                <p className="font-medium">{summary.avgPsf.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Max</p>
                                <p className="font-medium">{summary.maxPsf.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Price Stats */}
                        {summaryStats.find(s => s.id === "price")?.enabled && (
                          <div className="p-4">
                            <h4 className="text-sm font-medium mb-2">Total Price</h4>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Min</p>
                                <p className="font-medium">{summary.minPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Avg</p>
                                <p className="font-medium">{summary.avgPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Max</p>
                                <p className="font-medium">{summary.maxPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Size Stats */}
                        {summaryStats.find(s => s.id === "size")?.enabled && (
                          <div className="p-4">
                            <h4 className="text-sm font-medium mb-2">Unit Size (sqft)</h4>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Min</p>
                                <p className="font-medium">{summary.minSize.toFixed(1)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Avg</p>
                                <p className="font-medium">{summary.avgSize.toFixed(1)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Max</p>
                                <p className="font-medium">{summary.maxSize.toFixed(1)}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
              
              {/* Chart is now optional and shown below the cards */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <ChartBar className="h-5 w-5" />
                    PSF Target Comparison
                  </h3>
                </div>
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
                        formatter={(value) => [parseFloat(value as string).toFixed(2), "PSF"]}
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

          {/* Results Table with Improved Structure */}
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
                      Floor Premium PSF <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("viewPsfAdjustment")}
                  >
                    <div className="flex items-center">
                      View Premium PSF <ArrowUpDown className="ml-1 h-4 w-4" />
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
                    onClick={() => handleSort("finalTotalPrice")}
                  >
                    <div className="flex items-center">
                      Final Price <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center">
                      Final PSF
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUnits.map((unit, index) => {
                  const sellArea = parseFloat(unit.sellArea) || 0;
                  const finalPsf = sellArea > 0 ? unit.finalTotalPrice / sellArea : 0;
                  
                  return (
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
                        {unit.basePriceComponent.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </TableCell>
                      <TableCell>
                        {unit.floorPriceComponent.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </TableCell>
                      <TableCell>
                        {unit.viewPriceComponent.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </TableCell>
                      <TableCell>
                        {unit.finalTotalPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </TableCell>
                      <TableCell>
                        {finalPsf.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredUnits.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={17} className="text-center py-4">
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
