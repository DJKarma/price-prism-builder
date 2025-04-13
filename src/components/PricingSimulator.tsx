
import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InfoIcon, CheckIcon, XIcon, Filter, ChevronsUpDown, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import PremiumEditor from "./PremiumEditor";
import MegaOptimize from "./MegaOptimize";
import { calculateUnitPrice, calculateFloorPremium, calculateOverallAveragePsf } from "@/utils/psfOptimizer";

const PricingSimulator = ({ 
  data, 
  pricingConfig, 
  onConfigUpdate 
}) => {
  // State for unit data with pricing
  const [pricedUnits, setPricedUnits] = useState([]);
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [bedroomFilterValue, setBedroomFilterValue] = useState("all");
  const [viewFilterValue, setViewFilterValue] = useState("all");
  const [floorFilterValue, setFloorFilterValue] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: 'unit', direction: 'ascending' });
  const [searchValue, setSearchValue] = useState("");
  const [totalPriceRange, setTotalPriceRange] = useState({ min: 0, max: 0 });
  const [psfRange, setPsfRange] = useState({ min: 0, max: 0 });
  
  // Bedroom summary stats
  const [bedroomSummary, setBedroomSummary] = useState([]);
  const [overallAvgPsf, setOverallAvgPsf] = useState(0);
  const [isLiveUpdateEnabled, setIsLiveUpdateEnabled] = useState(true);
  
  // Options for filtering
  const bedroomOptions = ["all", ...new Set(data.map(unit => unit.bedrooms))].sort();
  const viewOptions = ["all", ...new Set(data.map(unit => unit.view))].sort();
  
  // Calculate prices for all units based on the pricing config
  const calculatePrices = useCallback(() => {
    if (!data.length || !pricingConfig) return;
    
    // Process the pricing data
    const pricedData = data.map(unit => {
      const calculatedPrice = calculateUnitPrice(unit, pricingConfig);
      return {
        ...unit,
        ...calculatedPrice
      };
    });
    
    // Update the priced units
    setPricedUnits(pricedData);
    
    // Calculate bedroom summary
    const bedroomGroups = {};
    pricedData.forEach(unit => {
      const type = unit.bedrooms;
      if (!bedroomGroups[type]) {
        bedroomGroups[type] = {
          type,
          count: 0,
          totalArea: 0,
          totalPrice: 0,
          minPsf: Infinity,
          maxPsf: -Infinity,
          avgPsf: 0
        };
      }
      
      bedroomGroups[type].count += 1;
      bedroomGroups[type].totalArea += parseFloat(unit.area);
      bedroomGroups[type].totalPrice += unit.totalPrice;
      bedroomGroups[type].minPsf = Math.min(bedroomGroups[type].minPsf, unit.psf);
      bedroomGroups[type].maxPsf = Math.max(bedroomGroups[type].maxPsf, unit.psf);
    });
    
    // Calculate averages and format the summary
    const summaryArray = Object.values(bedroomGroups).map(group => {
      return {
        ...group,
        avgPsf: group.totalPrice / group.totalArea,
        avgPrice: group.totalPrice / group.count
      };
    }).sort((a, b) => {
      // Handle alphanumeric sorting for bedroom types
      const typeA = a.type;
      const typeB = b.type;
      
      // Extract numeric parts if they exist
      const numA = parseInt(typeA.replace(/\D/g, ''));
      const numB = parseInt(typeB.replace(/\D/g, ''));
      
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return typeA.localeCompare(typeB);
    });
    
    setBedroomSummary(summaryArray);
    
    // Calculate overall average PSF
    const overallAvg = calculateOverallAveragePsf(data, pricingConfig);
    setOverallAvgPsf(overallAvg);
    
    // Calculate price ranges
    const prices = pricedData.map(unit => unit.totalPrice);
    const psfs = pricedData.map(unit => unit.psf);
    
    setTotalPriceRange({
      min: Math.min(...prices),
      max: Math.max(...prices)
    });
    
    setPsfRange({
      min: Math.min(...psfs),
      max: Math.max(...psfs)
    });
    
  }, [data, pricingConfig]);
  
  // Initial calculation and when config changes
  useEffect(() => {
    calculatePrices();
  }, [calculatePrices]);
  
  // Apply filters whenever filter values or priced units change
  useEffect(() => {
    if (!pricedUnits.length) return;
    
    let filtered = [...pricedUnits];
    
    // Apply bedroom filter
    if (bedroomFilterValue !== "all") {
      filtered = filtered.filter(unit => unit.bedrooms === bedroomFilterValue);
    }
    
    // Apply view filter
    if (viewFilterValue !== "all") {
      filtered = filtered.filter(unit => unit.view === viewFilterValue);
    }
    
    // Apply floor filter
    if (floorFilterValue !== "all") {
      const floorNumber = parseInt(floorFilterValue);
      filtered = filtered.filter(unit => parseInt(unit.floor) === floorNumber);
    }
    
    // Apply search
    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase();
      filtered = filtered.filter(unit => 
        unit.unit.toLowerCase().includes(searchLower) ||
        unit.bedrooms.toLowerCase().includes(searchLower) ||
        unit.view.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let valueA = a[sortConfig.key];
        let valueB = b[sortConfig.key];
        
        // Ensure numeric comparison for numeric fields
        if (sortConfig.key === 'totalPrice' || sortConfig.key === 'psf' || sortConfig.key === 'area' || sortConfig.key === 'floor') {
          valueA = parseFloat(valueA);
          valueB = parseFloat(valueB);
        }
        
        if (valueA < valueB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setFilteredUnits(filtered);
  }, [pricedUnits, bedroomFilterValue, viewFilterValue, floorFilterValue, searchValue, sortConfig]);
  
  // Function to handle sorting
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  // Handle config updates
  const handleConfigUpdate = (updatedConfig) => {
    onConfigUpdate(updatedConfig);
    
    // If live update is enabled, recalculate immediately
    if (isLiveUpdateEnabled) {
      calculatePrices();
      toast({
        title: "Prices Updated",
        description: "All unit prices have been recalculated based on the new configuration.",
      });
    }
  };
  
  // Get the floor options from the data
  const floorOptions = ["all", ...new Set(data.map(unit => unit.floor))].sort((a, b) => {
    if (a === "all") return -1;
    if (b === "all") return 1;
    return parseInt(a) - parseInt(b);
  });
  
  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };
  
  // Format PSF for display
  const formatPsf = (psf) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(psf);
  };
  
  // Calculate target PSF percent difference
  const calculateTargetDiff = (type, currentPsf) => {
    const bedroomConfig = pricingConfig.bedroomTypePricing.find(
      config => config.type === type
    );
    
    if (bedroomConfig) {
      const targetPsf = bedroomConfig.targetAvgPsf;
      const diff = ((currentPsf - targetPsf) / targetPsf) * 100;
      return diff;
    }
    
    return 0;
  };
  
  // Determine badge color based on PSF diff
  const getBadgeColor = (diff) => {
    const absDiff = Math.abs(diff);
    
    if (absDiff <= 1) return "green";
    if (absDiff <= 3) return "yellow";
    return diff > 0 ? "orange" : "red";
  };
  
  // Toggle live update
  const toggleLiveUpdate = () => {
    setIsLiveUpdateEnabled(!isLiveUpdateEnabled);
    toast({
      title: isLiveUpdateEnabled ? "Live Updates Disabled" : "Live Updates Enabled",
      description: isLiveUpdateEnabled 
        ? "Changes will not automatically update prices until you manually recalculate." 
        : "Changes will automatically update all prices."
    });
  };
  
  // Manually recalculate prices
  const recalculatePrices = () => {
    calculatePrices();
    toast({
      title: "Prices Recalculated",
      description: "All unit prices have been updated based on the current configuration."
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Units</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.length}</div>
            <p className="text-sm text-muted-foreground">
              {filteredUnits.length} currently showing
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Overall Average PSF</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatPsf(overallAvgPsf)}</div>
            <p className="text-sm text-muted-foreground">
              Target: {formatPsf(pricingConfig.targetOverallPsf || 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Price Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatPrice(totalPriceRange.min)} - {formatPrice(totalPriceRange.max)}
            </div>
            <p className="text-sm text-muted-foreground">
              PSF: {formatPsf(psfRange.min)} - {formatPsf(psfRange.max)}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Live Update Toggle */}
      <div className="flex justify-end mb-4">
        <Button 
          variant={isLiveUpdateEnabled ? "default" : "outline"} 
          className="gap-2"
          onClick={toggleLiveUpdate}
        >
          <Clock className="h-4 w-4" />
          {isLiveUpdateEnabled ? "Live Updates On" : "Live Updates Off"}
        </Button>
        
        {!isLiveUpdateEnabled && (
          <Button 
            variant="outline" 
            className="ml-2"
            onClick={recalculatePrices}
          >
            Recalculate Prices
          </Button>
        )}
      </div>
      
      {/* Mega Optimize Component */}
      <MegaOptimize 
        data={data} 
        pricingConfig={pricingConfig} 
        onOptimized={handleConfigUpdate}
      />
      
      {/* Premium Editor */}
      <PremiumEditor 
        pricingConfig={pricingConfig} 
        onPricingConfigChange={handleConfigUpdate} 
      />
      
      {/* Bedroom Type Summary - Now with mini cards */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bedroom Type Summary</CardTitle>
          <CardDescription>
            Summary of calculated prices based on your configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bedroomSummary.map((summary) => {
              const targetDiff = calculateTargetDiff(summary.type, summary.avgPsf);
              const badgeColor = getBadgeColor(targetDiff);
              
              return (
                <Card key={summary.type} className="shadow-sm hover:shadow-md transition-shadow duration-300 border-l-4" style={{
                  borderLeftColor: badgeColor === "green" ? "#10b981" : 
                                   badgeColor === "yellow" ? "#f59e0b" : 
                                   badgeColor === "orange" ? "#f97316" : "#ef4444"
                }}>
                  <CardHeader className="py-4 px-5">
                    <CardTitle className="text-lg flex justify-between items-center">
                      <span>{summary.type}</span>
                      <Badge variant={
                        badgeColor === "green" ? "success" : 
                        badgeColor === "yellow" ? "warning" : 
                        badgeColor === "orange" ? "warning" : "destructive"
                      }>
                        {targetDiff > 0 ? "+" : ""}{targetDiff.toFixed(1)}%
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-5">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Units</span>
                        <span className="font-medium">{summary.count}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Avg Price</span>
                        <span className="font-medium">{formatPrice(summary.avgPrice)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Avg PSF</span>
                        <span className="font-medium">{formatPsf(summary.avgPsf)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Target PSF</span>
                        <span className="font-medium">{formatPsf(pricingConfig.bedroomTypePricing.find(b => b.type === summary.type)?.targetAvgPsf || 0)}</span>
                      </div>
                      <div className="flex flex-col col-span-2">
                        <span className="text-muted-foreground">PSF Range</span>
                        <span className="font-medium">{formatPsf(summary.minPsf)} - {formatPsf(summary.maxPsf)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Unit Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Unit Pricing Detail</CardTitle>
              <CardDescription>
                View and filter all unit prices based on configuration
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Select
                  value={bedroomFilterValue}
                  onValueChange={setBedroomFilterValue}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Bedrooms" />
                  </SelectTrigger>
                  <SelectContent>
                    {bedroomOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === "all" ? "All Bedrooms" : option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select
                  value={viewFilterValue}
                  onValueChange={setViewFilterValue}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="View" />
                  </SelectTrigger>
                  <SelectContent>
                    {viewOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === "all" ? "All Views" : option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select
                  value={floorFilterValue}
                  onValueChange={setFloorFilterValue}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Floor" />
                  </SelectTrigger>
                  <SelectContent>
                    {floorOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === "all" ? "All Floors" : option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Input
                placeholder="Search units..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full md:w-[200px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => requestSort('unit')}
                    >
                      Unit {sortConfig.key === 'unit' && (
                        <ChevronsUpDown className={`h-4 w-4 inline-block ${sortConfig.direction === 'ascending' ? 'rotate-180' : ''}`} />
                      )}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => requestSort('bedrooms')}
                    >
                      Type {sortConfig.key === 'bedrooms' && (
                        <ChevronsUpDown className={`h-4 w-4 inline-block ${sortConfig.direction === 'ascending' ? 'rotate-180' : ''}`} />
                      )}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => requestSort('floor')}
                    >
                      Floor {sortConfig.key === 'floor' && (
                        <ChevronsUpDown className={`h-4 w-4 inline-block ${sortConfig.direction === 'ascending' ? 'rotate-180' : ''}`} />
                      )}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => requestSort('view')}
                    >
                      View {sortConfig.key === 'view' && (
                        <ChevronsUpDown className={`h-4 w-4 inline-block ${sortConfig.direction === 'ascending' ? 'rotate-180' : ''}`} />
                      )}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer text-right"
                      onClick={() => requestSort('area')}
                    >
                      Area (sqft) {sortConfig.key === 'area' && (
                        <ChevronsUpDown className={`h-4 w-4 inline-block ${sortConfig.direction === 'ascending' ? 'rotate-180' : ''}`} />
                      )}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer text-right"
                      onClick={() => requestSort('psf')}
                    >
                      PSF {sortConfig.key === 'psf' && (
                        <ChevronsUpDown className={`h-4 w-4 inline-block ${sortConfig.direction === 'ascending' ? 'rotate-180' : ''}`} />
                      )}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer text-right"
                      onClick={() => requestSort('totalPrice')}
                    >
                      Price {sortConfig.key === 'totalPrice' && (
                        <ChevronsUpDown className={`h-4 w-4 inline-block ${sortConfig.direction === 'ascending' ? 'rotate-180' : ''}`} />
                      )}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnits.length > 0 ? (
                    filteredUnits.map((unit) => (
                      <TableRow key={unit.unit}>
                        <TableCell className="font-medium">{unit.unit}</TableCell>
                        <TableCell>{unit.bedrooms}</TableCell>
                        <TableCell>{unit.floor}</TableCell>
                        <TableCell>{unit.view}</TableCell>
                        <TableCell className="text-right">{parseFloat(unit.area).toFixed(0)}</TableCell>
                        <TableCell className="text-right">{formatPsf(unit.psf)}</TableCell>
                        <TableCell className="text-right">{formatPrice(unit.totalPrice)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No units found matching current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
        <CardFooter>
          <div className="text-sm text-muted-foreground">
            Showing {filteredUnits.length} of {pricedUnits.length} units
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PricingSimulator;
