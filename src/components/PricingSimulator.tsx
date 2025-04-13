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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowUpDown,
  Download,
  Filter,
  Table as TableIcon,
  Check,
  Info,
  RotateCcw,
  ChevronsUpDown,
  X
} from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
}

interface MultiFilterValue {
  [key: string]: string[];
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
  }>({ key: "floor", direction: "ascending" }); // Set default sort to floor ascending
  const [multiFilters, setMultiFilters] = useState<MultiFilterValue>({
    type: [],
    view: [],
    floor: [],
  });
  const [filterPopoverOpen, setFilterPopoverOpen] = useState<{[key: string]: boolean}>({
    type: false,
    view: false,
    floor: false
  });

  useEffect(() => {
    if (pricingConfig?.optimizedTypes?.length) {
      const optimizedTypes = pricingConfig.optimizedTypes;
      if (optimizedTypes.length === 1 && multiFilters.type.length === 0) {
        setMultiFilters(prev => ({ ...prev, type: [...optimizedTypes] }));
        toast.info(`Filtered to show optimized bedroom type: ${optimizedTypes.join(', ')}`);
      }
    }
  }, [pricingConfig?.optimizedTypes]);

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
      
      const basePsfWithAdjustments = basePsf + floorAdjustment + viewPsfAdjustment;
      
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
        isOptimized: isTypeOptimized,
      };
    });

    setUnits(calculatedUnits);
    setFilteredUnits(calculatedUnits);
  }, [data, pricingConfig]);

  useEffect(() => {
    let result = [...units];
    
    if (multiFilters.type.length > 0) {
      result = result.filter((unit) => multiFilters.type.includes(unit.type));
    }
    
    if (multiFilters.view.length > 0) {
      result = result.filter((unit) => multiFilters.view.includes(unit.view));
    }
    
    if (multiFilters.floor.length > 0) {
      result = result.filter((unit) => multiFilters.floor.includes(unit.floor));
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
  }, [units, multiFilters, sortConfig]);

  const handleMultiFilterChange = (key: string, value: string) => {
    setMultiFilters(prev => {
      const newValues = prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value];
      
      const result = { ...prev, [key]: newValues };
      return result;
    });
  };

  const toggleFilterPopover = (key: string) => {
    setFilterPopoverOpen(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const resetFilters = () => {
    setMultiFilters({
      type: [],
      view: [],
      floor: [],
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

  const formatPriceForDisplay = (price: number): string => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(2)}M`;
    } else if (price >= 1000) {
      return `${(price / 1000).toFixed(0)}K`;
    }
    return price.toFixed(0);
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

  const getTotalActiveFilters = () => {
    return Object.values(multiFilters).reduce((total, filters) => total + filters.length, 0);
  };

  const MultiSelectFilter = ({ 
    label, 
    filterKey, 
    options 
  }: { 
    label: string, 
    filterKey: string, 
    options: string[] 
  }) => (
    <Popover 
      open={filterPopoverOpen[filterKey]} 
      onOpenChange={(open) => setFilterPopoverOpen(prev => ({ ...prev, [filterKey]: open }))}
    >
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          role="combobox" 
          className="w-full justify-between"
          onClick={() => toggleFilterPopover(filterKey)}
        >
          {multiFilters[filterKey].length > 0 
            ? `${multiFilters[filterKey].length} ${label.toLowerCase()} selected` 
            : `All ${label}s`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
          <CommandEmpty>No {label.toLowerCase()} found</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="h-[200px]">
              {options.map((option) => (
                <CommandItem 
                  key={option} 
                  value={option}
                  onSelect={() => handleMultiFilterChange(filterKey, option)}
                  className="px-2 py-1 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={multiFilters[filterKey].includes(option)} 
                      className="h-4 w-4"
                    />
                    <span>{option}</span>
                  </div>
                </CommandItem>
              ))}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );

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
            <MultiSelectFilter 
              label="Type" 
              filterKey="type" 
              options={getUniqueValues("type")} 
            />
            {multiFilters.type.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {multiFilters.type.map(type => (
                  <Badge 
                    key={type} 
                    variant="secondary" 
                    className="text-xs"
                  >
                    {type}
                    <button
                      type="button"
                      className="ml-1"
                      onClick={() => handleMultiFilterChange("type", type)}
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div>
            <MultiSelectFilter 
              label="View" 
              filterKey="view" 
              options={getUniqueValues("view")} 
            />
            {multiFilters.view.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {multiFilters.view.map(view => (
                  <Badge 
                    key={view} 
                    variant="secondary" 
                    className="text-xs"
                  >
                    {view}
                    <button
                      type="button"
                      className="ml-1"
                      onClick={() => handleMultiFilterChange("view", view)}
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div>
            <MultiSelectFilter 
              label="Floor" 
              filterKey="floor" 
              options={getUniqueValues("floor")} 
            />
            {multiFilters.floor.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {multiFilters.floor.map(floor => (
                  <Badge 
                    key={floor} 
                    variant="secondary" 
                    className="text-xs"
                  >
                    {floor}
                    <button
                      type="button"
                      className="ml-1"
                      onClick={() => handleMultiFilterChange("floor", floor)}
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
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

        <FixedHeaderTable maxHeight="650px" className="scrollbar-always-visible">
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
                    {formatPriceForDisplay(unit.finalTotalPrice)}
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
            <span>{getTotalActiveFilters()} active filters</span>
            <span className="ml-2">Showing {filteredUnits.length} units</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingSimulator;
