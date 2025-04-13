
import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronRight, 
  BarChart3, 
  Maximize2, 
  Minimize2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

interface BedroomTypeStats {
  type: string;
  minPsf: number;
  avgPsf: number;
  maxPsf: number;
  minPrice: number;
  avgPrice: number;
  maxPrice: number;
  minSize: number;
  avgSize: number;
  maxSize: number;
  count: number;
}

interface PricingSummaryProps {
  data: any[];
}

type DisplayMode = "all" | "min" | "avg" | "max";

const PricingSummary: React.FC<PricingSummaryProps> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("all");

  const bedroomTypeStats = useMemo(() => {
    if (!data || !data.length) return [];

    const typeMap: Record<string, any[]> = {};
    
    // Group by bedroom type
    data.forEach((unit) => {
      if (!unit.type) return;
      
      if (!typeMap[unit.type]) {
        typeMap[unit.type] = [];
      }
      
      typeMap[unit.type].push(unit);
    });
    
    // Calculate statistics for each bedroom type
    return Object.entries(typeMap).map(([type, units]) => {
      // Extract values for calculations
      const psfs = units.map((unit) => unit.finalPsf || 0).filter(Boolean);
      const prices = units.map((unit) => unit.finalTotalPrice || 0).filter(Boolean);
      const sizes = units.map((unit) => parseFloat(unit.sellArea) || 0).filter(Boolean);
      
      // Calculate stats
      const stats: BedroomTypeStats = {
        type,
        count: units.length,
        minPsf: Math.min(...psfs),
        avgPsf: psfs.reduce((sum, psf) => sum + psf, 0) / psfs.length || 0,
        maxPsf: Math.max(...psfs),
        minPrice: Math.min(...prices),
        avgPrice: prices.reduce((sum, price) => sum + price, 0) / prices.length || 0,
        maxPrice: Math.max(...prices),
        minSize: Math.min(...sizes),
        avgSize: sizes.reduce((sum, size) => sum + size, 0) / sizes.length || 0,
        maxSize: Math.max(...sizes),
      };
      
      return stats;
    });
  }, [data]);

  return (
    <Card className="w-full mb-6 border-2 border-purple-100 shadow-md">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 cursor-pointer hover:bg-gradient-to-r hover:from-purple-100 hover:to-indigo-100 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-xl text-purple-700">Pricing Summary</CardTitle>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full">
                {isOpen ? (
                  <Minimize2 className="h-5 w-5 text-purple-500" />
                ) : (
                  <Maximize2 className="h-5 w-5 text-purple-500" />
                )}
              </Button>
            </div>
            <CardDescription className="text-indigo-600">
              Statistical breakdown of pricing and sizes by bedroom type
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="p-0">
            <div className="flex justify-end p-2 bg-purple-50">
              <ToggleGroup type="single" value={displayMode} onValueChange={(value) => value && setDisplayMode(value as DisplayMode)}>
                <ToggleGroupItem value="all" aria-label="Show all values" className="text-xs">
                  All
                </ToggleGroupItem>
                <ToggleGroupItem value="min" aria-label="Show minimum values" className="text-xs">
                  Min
                </ToggleGroupItem>
                <ToggleGroupItem value="avg" aria-label="Show average values" className="text-xs">
                  Avg
                </ToggleGroupItem>
                <ToggleGroupItem value="max" aria-label="Show maximum values" className="text-xs">
                  Max
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-purple-50">
                  <TableRow>
                    <TableHead className="font-semibold text-purple-700">Bedroom Type</TableHead>
                    <TableHead className="font-semibold text-purple-700">Unit Count</TableHead>
                    {displayMode === "all" ? (
                      <>
                        <TableHead className="text-center">
                          <div className="text-purple-700 font-semibold">PSF (per sqft)</div>
                          <div className="grid grid-cols-3 gap-1 text-xs mt-1">
                            <span className="text-purple-600">Min</span>
                            <span className="text-purple-600">Avg</span>
                            <span className="text-purple-600">Max</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-center">
                          <div className="text-purple-700 font-semibold">Price</div>
                          <div className="grid grid-cols-3 gap-1 text-xs mt-1">
                            <span className="text-purple-600">Min</span>
                            <span className="text-purple-600">Avg</span>
                            <span className="text-purple-600">Max</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-center">
                          <div className="text-purple-700 font-semibold">Size (sqft)</div>
                          <div className="grid grid-cols-3 gap-1 text-xs mt-1">
                            <span className="text-purple-600">Min</span>
                            <span className="text-purple-600">Avg</span>
                            <span className="text-purple-600">Max</span>
                          </div>
                        </TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="text-center">
                          <div className="text-purple-700 font-semibold">PSF (per sqft)</div>
                        </TableHead>
                        <TableHead className="text-center">
                          <div className="text-purple-700 font-semibold">Price</div>
                        </TableHead>
                        <TableHead className="text-center">
                          <div className="text-purple-700 font-semibold">Size (sqft)</div>
                        </TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bedroomTypeStats.length > 0 ? (
                    bedroomTypeStats.map((stat, index) => (
                      <TableRow 
                        key={index} 
                        className={index % 2 === 0 ? "bg-white" : "bg-purple-50/30"}
                      >
                        <TableCell className="font-medium text-purple-800">{stat.type}</TableCell>
                        <TableCell className="font-medium">{stat.count}</TableCell>
                        
                        {displayMode === "all" ? (
                          <>
                            <TableCell>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="text-center px-2 py-1 bg-red-50 rounded-md text-red-600 font-medium">
                                  {stat.minPsf.toFixed(2)}
                                </div>
                                <div className="text-center px-2 py-1 bg-purple-50 rounded-md text-purple-600 font-medium">
                                  {stat.avgPsf.toFixed(2)}
                                </div>
                                <div className="text-center px-2 py-1 bg-green-50 rounded-md text-green-600 font-medium">
                                  {stat.maxPsf.toFixed(2)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="text-center px-2 py-1 bg-red-50 rounded-md text-red-600 font-medium">
                                  {stat.minPrice.toLocaleString()}
                                </div>
                                <div className="text-center px-2 py-1 bg-purple-50 rounded-md text-purple-600 font-medium">
                                  {Math.round(stat.avgPrice).toLocaleString()}
                                </div>
                                <div className="text-center px-2 py-1 bg-green-50 rounded-md text-green-600 font-medium">
                                  {stat.maxPrice.toLocaleString()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="text-center px-2 py-1 bg-red-50 rounded-md text-red-600 font-medium">
                                  {stat.minSize.toFixed(0)}
                                </div>
                                <div className="text-center px-2 py-1 bg-purple-50 rounded-md text-purple-600 font-medium">
                                  {stat.avgSize.toFixed(0)}
                                </div>
                                <div className="text-center px-2 py-1 bg-green-50 rounded-md text-green-600 font-medium">
                                  {stat.maxSize.toFixed(0)}
                                </div>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>
                              <div className="text-center px-2 py-1 rounded-md font-medium
                                ${displayMode === 'min' ? 'bg-red-50 text-red-600' : 
                                displayMode === 'avg' ? 'bg-purple-50 text-purple-600' : 
                                'bg-green-50 text-green-600'}">
                                {displayMode === "min" 
                                  ? stat.minPsf.toFixed(2)
                                  : displayMode === "avg" 
                                    ? stat.avgPsf.toFixed(2)
                                    : stat.maxPsf.toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center px-2 py-1 rounded-md font-medium
                                ${displayMode === 'min' ? 'bg-red-50 text-red-600' : 
                                displayMode === 'avg' ? 'bg-purple-50 text-purple-600' : 
                                'bg-green-50 text-green-600'}">
                                {displayMode === "min" 
                                  ? stat.minPrice.toLocaleString()
                                  : displayMode === "avg" 
                                    ? Math.round(stat.avgPrice).toLocaleString()
                                    : stat.maxPrice.toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center px-2 py-1 rounded-md font-medium
                                ${displayMode === 'min' ? 'bg-red-50 text-red-600' : 
                                displayMode === 'avg' ? 'bg-purple-50 text-purple-600' : 
                                'bg-green-50 text-green-600'}">
                                {displayMode === "min" 
                                  ? stat.minSize.toFixed(0)
                                  : displayMode === "avg" 
                                    ? stat.avgSize.toFixed(0)
                                    : stat.maxSize.toFixed(0)}
                              </div>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No data available for summary
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default PricingSummary;
