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
      
      
      <Card className="w-full">
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

          <div className="relative w-full border rounded-md overflow-hidden">
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
              <TableBody maxHeight="600px">
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
