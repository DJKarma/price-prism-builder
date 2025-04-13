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
  LabelList,
  Cell,
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
  RefreshCcw,
  Wand2,
  TrendingUp,
  Zap,
  Target,
  Info,
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
import {
  Tooltip as TooltipComponent,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { optimizeBasePsf } from "@/utils/psfOptimizer";

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

// Optimization state to track original and optimized values
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
  const [typeSummary, setTypeSummary] = useState<
    Array<{ type: string; avgPsf: number; targetPsf: number; units: number; difference: number }>
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
  
  // Optimization state
  const [optimizationState, setOptimizationState] = useState<OptimizationState>({});
  const [optimizationInProgress, setOptimizationInProgress] = useState<string | null>(null);

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
      const psfValues = unitGroup.map(u => u.finalPsf || 0);
      const totalPsf = psfValues.reduce((sum, psf) => sum + psf, 0);
      const avgPsf = totalPsf / psfValues.length;
      const targetConfig = pricingConfig.bedroomTypePricing.find((b) => b.type === type);
      const targetPsf = targetConfig?.targetAvgPsf || pricingConfig.basePsf;
      return {
        type,
        avgPsf,
        targetPsf,
        units: unitGroup.length,
        difference: avgPsf - targetPsf,
      };
    });
    
    setTypeSummary(summaries);
    
    // Detailed summary by bedroom type
    const detailedSummaries = Object.entries(typeGroups).map(([type, unitGroup]) => {
      const psfValues = unitGroup.map(u => u.finalPsf || 0);
      const minPsf = Math.min(...psfValues);
      const maxPsf = Math.max(...psfValues);
      const avgPsf = psfValues.reduce((sum, val) => sum + val, 0) / psfValues.length;
      const priceValues = unitGroup.map(u => u.finalTotalPrice);
      const minPrice = Math.min(...priceValues);
      const maxPrice = Math.max(...priceValues);
      const avgPrice = priceValues.reduce((sum, val) => sum + val, 0) / priceValues.length;
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
        maxSize,
      };
    });
    
    setDetailedTypeSummary(detailedSummaries);
    
  }, [data, pricingConfig]); // Updated dependency array to include "units"

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

  const handleSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === "ascending" ? "descending" : "ascending";
    }
    setSortConfig({ key, direction });
  };

  const toggleSummaryStat = (id: string) => {
    setSummaryStats((prev) =>
      prev.map((stat) => (stat.id === id ? { ...stat, enabled: !stat.enabled } : stat))
    );
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

  const calculateTotals = () => {
    const total = filteredUnits.reduce(
      (acc, unit) => {
        const sellArea = parseFloat(unit.sellArea) || 0;
        return {
          units: acc.units + 1,
          area: acc.area + sellArea,
          value: acc.value + unit.finalTotalPrice,
        };
      },
      { units: 0, area: 0, value: 0 }
    );
    return { ...total, avgPsf: total.area ? total.value / total.area : 0 };
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

  // Optimization handlers
  const handleOptimizePsf = (bedroomType: string) => {
    setOptimizationInProgress(bedroomType);
    const typeConfig = pricingConfig.bedroomTypePricing.find(
      (b) => b.type === bedroomType
    );
    if (!typeConfig) {
      toast.error(`Configuration for ${bedroomType} not found`);
      setOptimizationInProgress(null);
      return;
    }
    const targetPsf = typeConfig.targetAvgPsf;
    const originalBasePsf =
      optimizationState[bedroomType]?.originalBasePsf || typeConfig.basePsf;
    try {
      const result = optimizeBasePsf(
        data,
        pricingConfig,
        bedroomType,
        targetPsf,
        originalBasePsf
      );
      setOptimizationState((prev) => ({
        ...prev,
        [bedroomType]: {
          originalBasePsf: originalBasePsf,
          optimizedBasePsf: result.optimizedBasePsf,
          isOptimized: true,
        },
      }));
      const updatedPricingConfig = {
        ...pricingConfig,
        bedroomTypePricing: pricingConfig.bedroomTypePricing.map((type) =>
          type.type === bedroomType
            ? { ...type, basePsf: result.optimizedBasePsf }
            : type
        ),
      };
      const updatedUnits = units.map((unit) => {
        if (unit.type !== bedroomType) return unit;
        const viewAdjustment = pricingConfig.viewPricing.find(
          (v) => v.view === unit.view
        );
        const basePsf = result.optimizedBasePsf;
        const floorAdjustment = unit.floorAdjustment;
        const viewPsfAdjustment = viewAdjustment?.psfAdjustment || 0;
        const calculatedPsf = basePsf + floorAdjustment + viewPsfAdjustment;
        const sellArea = parseFloat(unit.sellArea) || 0;
        const totalPrice = calculatedPsf * sellArea;
        const finalTotalPrice = Math.ceil(totalPrice / 1000) * 1000;
        const finalPsf = sellArea > 0 ? finalTotalPrice / sellArea : 0;
        const basePriceComponent = basePsf * sellArea;
        return {
          ...unit,
          calculatedPsf,
          totalPrice,
          finalTotalPrice,
          finalPsf,
          basePriceComponent,
          basePsf,
          isOptimized: true,
        };
      });
      setUnits(updatedUnits);
      toast.success(
        `Optimization successful for ${bedroomType}. Changed base PSF from ${originalBasePsf.toFixed(
          2
        )} to ${result.optimizedBasePsf.toFixed(
          2
        )}. Avg PSF moved from ${result.initialAvgPsf.toFixed(
          2
        )} to ${result.finalAvgPsf.toFixed(2)}.`,
        { duration: 4000 }
      );
    } catch (error) {
      console.error("Optimization error:", error);
      toast.error(
        `Optimization failed: ${
          (error as Error).message || "Unknown error"
        }`
      );
    } finally {
      setOptimizationInProgress(null);
    }
  };

  const handleRevertOptimization = (bedroomType: string) => {
    const { originalBasePsf } = optimizationState[bedroomType] || {};
    if (originalBasePsf === undefined) {
      toast.error(`Original value for ${bedroomType} not found`);
      return;
    }
    setOptimizationState((prev) => ({
      ...prev,
      [bedroomType]: {
        ...prev[bedroomType],
        optimizedBasePsf: originalBasePsf,
        isOptimized: false,
      },
    }));
    const updatedUnits = units.map((unit) => {
      if (unit.type !== bedroomType) return unit;
      const viewAdjustment = pricingConfig.viewPricing.find(
        (v) => v.view === unit.view
      );
      const basePsf = originalBasePsf;
      const floorAdjustment = unit.floorAdjustment;
      const viewPsfAdjustment = viewAdjustment?.psfAdjustment || 0;
      const calculatedPsf = basePsf + floorAdjustment + viewPsfAdjustment;
      const sellArea = parseFloat(unit.sellArea) || 0;
      const totalPrice = calculatedPsf * sellArea;
      const finalTotalPrice = Math.ceil(totalPrice / 1000) * 1000;
      const finalPsf = sellArea > 0 ? finalTotalPrice / sellArea : 0;
      const basePriceComponent = basePsf * sellArea;
      return {
        ...unit,
        calculatedPsf,
        totalPrice,
        finalTotalPrice,
        finalPsf,
        basePriceComponent,
        basePsf,
        isOptimized: false,
      };
    });
    setUnits(updatedUnits);
    toast.success(
      `Reverted ${bedroomType} to original base PSF: ${originalBasePsf.toFixed(
        2
      )}`
    );
  };

  const totals = calculateTotals();

  const getChartBarColor = (difference: number) => {
    if (Math.abs(difference) < 1) return "#22c55e";
    if (Math.abs(difference) < 5) return "#16a34a";
    if (Math.abs(difference) < 10) return "#eab308";
    if (difference < 0) return "#f97316";
    return "#ef4444";
  };

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
                  {detailedTypeSummary.map((summary) => {
                    const typeConfig = pricingConfig.bedroomTypePricing.find(
                      (b) => b.type === summary.type
                    );
                    const targetPsf = typeConfig?.targetAvgPsf || 0;
                    const optimized = optimizationState[summary.type]?.isOptimized || false;
                    const originalBasePsf = optimizationState[summary.type]?.originalBasePsf || 0;
                    const optimizedBasePsf = optimizationState[summary.type]?.optimizedBasePsf || 0;
                    const psfDifference = summary.avgPsf - targetPsf;
                    const psfDifferenceClass = 
                      Math.abs(psfDifference) < 1 ? "text-green-500" :
                      Math.abs(psfDifference) < 5 ? "text-green-700" :
                      Math.abs(psfDifference) < 10 ? "text-amber-500" :
                      psfDifference < 0 ? "text-amber-700" : "text-red-500";
                    
                    return (
                      <Card key={summary.type} className={`border ${optimized ? 'border-green-200 dark:border-green-800' : 'border-muted'}`}>
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-md font-semibold flex items-center justify-between">
                            <span>{summary.type}</span>
                            {optimized && (
                              <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 px-2 py-1 rounded-full">
                                Optimized
                              </span>
                            )}
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
                              <div className="flex items-center gap-1">
                                <p className="font-medium">{summary.avgPsf.toFixed(2)}</p>
                                {targetPsf > 0 && (
                                  <TooltipComponent>
                                    <TooltipTrigger asChild>
                                      <span className={`text-xs ${psfDifferenceClass}`}>
                                        ({psfDifference > 0 ? "+" : ""}{psfDifference.toFixed(2)})
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">
                                        {Math.abs(psfDifference) < 1 
                                          ? "Excellent match to target" 
                                          : Math.abs(psfDifference) < 5
                                            ? "Good match to target"
                                            : Math.abs(psfDifference) < 10
                                              ? "Moderate difference from target"
                                              : psfDifference < 0
                                                ? "Significantly below target"
                                                : "Significantly above target"
                                        }
                                      </p>
                                    </TooltipContent>
                                  </TooltipComponent>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Target PSF</p>
                              <div className="flex items-center gap-1">
                                <p className="font-medium">{targetPsf.toFixed(2)}</p>
                                <TooltipComponent>
                                  <TooltipTrigger asChild>
                                    <Target className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Target PSF from configuration</p>
                                  </TooltipContent>
                                </TooltipComponent>
                              </div>
                            </div>
                          </div>
                          
                          {/* Optimization controls */}
                          <div className="mt-3 flex gap-2">
                            <TooltipComponent>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full flex items-center text-xs"
                                  onClick={() => handleOptimizePsf(summary.type)}
                                  disabled={optimizationInProgress === summary.type}
                                >
                                  {optimizationInProgress === summary.type ? (
                                    <>
                                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Optimizing...
                                    </>
                                  ) : (
                                    <>
                                      <Wand2 className="h-3.5 w-3.5 mr-1" />
                                      {optimized ? "Re-optimize PSF" : "Optimize PSF"}
                                    </>
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs">
                                <p className="text-xs">
                                  Adjusts the base premium for this bedroom type using gradient descent
                                  optimization to bring the average PSF closer to the target value.
                                </p>
                              </TooltipContent>
                            </TooltipComponent>
                            
                            {optimized && (
                              <TooltipComponent>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-1/3 flex items-center text-xs"
                                    onClick={() => handleRevertOptimization(summary.type)}
                                  >
                                    <RefreshCcw className="h-3.5 w-3.5 mr-1" />
                                    Revert
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  <p className="text-xs">
                                    Restore original base PSF value of {originalBasePsf.toFixed(2)}
                                  </p>
                                </TooltipContent>
                              </TooltipComponent>
                            )}
                          </div>
                          
                          {/* Base PSF display */}
                          {optimized && (
                            <div className="mt-2 text-xs p-2 bg-muted/40 rounded flex items-center justify-between">
                              <div>
                                <span className="text-muted-foreground">Base PSF: </span>
                                <span className="font-medium">{optimizedBasePsf.toFixed(2)}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                (Original: {originalBasePsf.toFixed(2)})
                              </div>
                            </div>
                          )}
                          
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
                                    {summary.minPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })} - {summary.maxPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </p>
                                </div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              
              {/* Detailed Summary Cards - only show if detailed view is selected */}
              {summaryCardView === "detailed" && (
                <div className="grid grid-cols-1 gap-4">
                  {detailedTypeSummary.map((summary) => {
                    const typeConfig = pricingConfig.bedroomTypePricing.find(
                      (b) => b.type === summary.type
                    );
                    const targetPsf = typeConfig?.targetAvgPsf || 0;
                    const optimized = optimizationState[summary.type]?.isOptimized || false;
                    const originalBasePsf = optimizationState[summary.type]?.originalBasePsf || 0;
                    const optimizedBasePsf = optimizationState[summary.type]?.optimizedBasePsf || 0;
                    const psfDifference = summary.avgPsf - targetPsf;
                    const psfDifferenceClass = 
                      Math.abs(psfDifference) < 1 ? "text-green-500" :
                      Math.abs(psfDifference) < 5 ? "text-green-700" :
                      Math.abs(psfDifference) < 10 ? "text-amber-500" :
                      psfDifference < 0 ? "text-amber-700" : "text-red-500";
                    
                    return (
                      <Card key={summary.type} className={`overflow-hidden ${optimized ? 'border-green-200 dark:border-green-800' : ''}`}>
                        <CardHeader className="py-3 bg-muted/30">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-md flex items-center gap-2">
                              {summary.type} ({summary.count} units)
                              {optimized && (
                                <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 px-2 py-1 rounded-full">
                                  Optimized
                                </span>
                              )}
                            </CardTitle>
                            
                            <div className="flex items-center gap-2">
                              <TooltipComponent>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleOptimizePsf(summary.type)}
                                    disabled={optimizationInProgress === summary.type}
                                    className="h-8"
                                  >
                                    {optimizationInProgress === summary.type ? (
                                      <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Optimizing...
                                      </>
                                    ) : (
                                      <>
                                        <Wand2 className="h-4 w-4 mr-1" />
                                        {optimized ? "Re-optimize" : "Optimize PSF"}
                                      </>
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-xs">
                                  <p className="text-xs">
                                    Adjusts the base premium for this bedroom type using gradient descent
                                    optimization to bring the average PSF closer to the target value.
                                  </p>
                                </TooltipContent>
                              </TooltipComponent>
                              
                              {optimized && (
                                <TooltipComponent>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleRevertOptimization(summary.type)}
                                      className="h-8"
                                    >
                                      <RefreshCcw className="h-4 w-4 mr-1" />
                                      Revert
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    <p className="text-xs">
                                      Restore original base PSF value of {originalBasePsf.toFixed(2)}
                                    </p>
                                  </TooltipContent>
                                </TooltipComponent>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 mt-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Target PSF:</span>
                              <span className="text-sm font-medium">{targetPsf.toFixed(2)}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Achieved PSF:</span>
                              <span className="text-sm font-medium">{summary.avgPsf.toFixed(2)}</span>
                              {targetPsf > 0 && (
                                <TooltipComponent>
                                  <TooltipTrigger asChild>
                                    <span className={`text-xs ${psfDifferenceClass}`}>
                                      ({psfDifference > 0 ? "+" : ""}{psfDifference.toFixed(2)})
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">
                                      {Math.abs(psfDifference) < 1 
                                        ? "Excellent match to target" 
                                        : Math.abs(psfDifference) < 5
                                          ? "Good match to target"
                                          : Math.abs(psfDifference) < 10
                                            ? "Moderate difference from target"
                                            : psfDifference < 0
                                              ? "Significantly below target"
                                              : "Significantly above target"
                                      }
                                    </p>
                                  </TooltipContent>
                                </TooltipComponent>
                              )}
                            </div>
                            
                            {optimized && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Base PSF:</span>
                                <span className="text-sm font-medium">{optimizedBasePsf.toFixed(2)}</span>
                                <span className="text-xs text-muted-foreground">
                                  (Original: {originalBasePsf.toFixed(2)})
                                </span>
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        
                        <div className="grid grid-cols-1 divide-y md:divide-y-0 md:divide-x md:grid-cols-4">
                          {summaryStats.find(s => s.id === "count")?.enabled && (
                            <div className="p-4">
                              <h4 className="text-sm font-medium mb-2">Unit Count</h4>
                              <p className="text-xl font-medium">{summary.count}</p>
                            </div>
                          )}
                          
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
                    );
                  })}
                </div>
              )}
              
              {/* Improved Chart with more intuitive visuals */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <ChartBar className="h-5 w-5" />
                    PSF Target Comparison
                  </h3>
                </div>
                <div className="rounded-lg border border-muted p-4 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={typeSummary}
                      margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name, props) => {
                          if (name === "Difference") {
                            return [`${parseFloat(value as string).toFixed(2)} PSF ${parseFloat(value as string) >= 0 ? 'above' : 'below'} target`, "Difference"];
                          }
                          return [parseFloat(value as string).toFixed(2), name];
                        }}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          borderRadius: '8px',
                          border: '1px solid #ccc',
                          padding: '8px'
                        }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={36}
                        formatter={(value) => <span className="text-sm">{value}</span>}
                      />
                      <Bar
                        name="Average PSF"
                        dataKey="avgPsf"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList 
                          dataKey="avgPsf" 
                          position="top" 
                          formatter={(value) => parseFloat(value).toFixed(0)}
                          style={{ fontSize: '11px' }}
                        />
                        {typeSummary.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getChartBarColor(entry.difference)} />
                        ))}
                      </Bar>
                      <Bar
                        name="Target PSF"
                        dataKey="targetPsf"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList 
                          dataKey="targetPsf" 
                          position="top" 
                          formatter={(value) => parseFloat(value).toFixed(0)}
                          style={{ fontSize: '11px' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center mt-2">
                  <div className="grid grid-cols-5 gap-2 text-xs text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 bg-green-500 rounded mb-1"></div>
                      <p>Perfect Match</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 bg-green-700 rounded mb-1"></div>
                      <p>Good Match</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 bg-yellow-500 rounded mb-1"></div>
                      <p>Moderate</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 bg-orange-500 rounded mb-1"></div>
                      <p>Below Target</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 bg-red-500 rounded mb-1"></div>
                      <p>Above Target</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Showing {filteredUnits.length} of {units.length} units
        </CardFooter>
      </Card>

      {/* Detailed Unit Pricing */}
      <Card>
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
                      {unit.finalPsf?.toFixed(2) || "0.00"}
                    </TableCell>
                    <TableCell className="text-center">
                      {unit.isOptimized ? <Check className="h-4 w-4 text-green-600 inline" /> : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUnits.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={18} className="text-center py-4">
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
