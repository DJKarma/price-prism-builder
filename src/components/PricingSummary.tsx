
import React, { useState, useMemo, useEffect } from "react";
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
  TableFooter,
  FixedHeaderTable
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
  showDollarSign?: boolean;
  highlightedTypes?: string[];
}

// Helper function to format numbers for display
const formatNumber = (num: number): string => {
  if (!isFinite(num) || num === 0) return "0";
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(0) + "K";
  }
  
  return num.toString();
};

// Helper function to sort bedroom types naturally
const sortBedroomTypes = (a: string, b: string) => {
  // Extract numeric parts (if any) from bedroom type strings
  const aMatch = a.match(/(\d+)/);
  const bMatch = b.match(/(\d+)/);
  
  // If both have numbers, sort numerically
  if (aMatch && bMatch) {
    return parseInt(aMatch[0], 10) - parseInt(bMatch[0], 10);
  }
  
  // If only one has a number or neither has numbers, sort alphabetically
  return a.localeCompare(b);
};

const PricingSummary: React.FC<PricingSummaryProps> = ({ 
  data,
  showDollarSign = true,
  highlightedTypes = []
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [highlightedValues, setHighlightedValues] = useState<string[]>([]);
  
  // Slot machine effect for numbers
  useEffect(() => {
    if (highlightedTypes.length > 0) {
      setHighlightedValues(highlightedTypes);
      // Clear highlighting after 3 seconds (reduced from 5)
      const timer = setTimeout(() => {
        setHighlightedValues([]);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedTypes]);

  // Log incoming data for debugging
  React.useEffect(() => {
    if (data && data.length > 0) {
      console.log("PricingSummary received data sample:", {
        unit: data[0].name,
        finalPsf: data[0].finalPsf,
        finalTotalPrice: data[0].finalTotalPrice,
        sellArea: data[0].sellArea
      });
    }
  }, [data]);

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
    
    // Calculate statistics for each bedroom type and sort by type
    return Object.entries(typeMap)
      .map(([type, units]) => {
        // Extract values for calculations, ensuring we have valid numbers
        const psfs = units
          .map((unit) => {
            const psf = typeof unit.finalPsf === 'number' ? unit.finalPsf : parseFloat(unit.finalPsf) || 0;
            return psf;
          })
          .filter((psf) => !isNaN(psf) && isFinite(psf) && psf > 0);
        
        const prices = units
          .map((unit) => {
            const price = typeof unit.finalTotalPrice === 'number' ? unit.finalTotalPrice : parseFloat(unit.finalTotalPrice) || 0;
            return price;
          })
          .filter((price) => !isNaN(price) && isFinite(price) && price > 0);
        
        const sizes = units
          .map((unit) => {
            const size = typeof unit.sellArea === 'number' ? unit.sellArea : parseFloat(unit.sellArea) || 0;
            return size;
          })
          .filter((size) => !isNaN(size) && isFinite(size) && size > 0);
        
        // Calculate stats with safeguards against empty arrays - ROUND all values
        const stats: BedroomTypeStats = {
          type,
          count: units.length,
          minPsf: psfs.length ? Math.round(Math.min(...psfs)) : 0,
          avgPsf: psfs.length ? Math.round(psfs.reduce((sum, psf) => sum + psf, 0) / psfs.length) : 0,
          maxPsf: psfs.length ? Math.round(Math.max(...psfs)) : 0,
          minPrice: prices.length ? Math.round(Math.min(...prices)) : 0,
          avgPrice: prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : 0,
          maxPrice: prices.length ? Math.round(Math.max(...prices)) : 0,
          minSize: sizes.length ? Math.round(Math.min(...sizes)) : 0,
          avgSize: sizes.length ? Math.round(sizes.reduce((sum, size) => sum + size, 0) / sizes.length) : 0,
          maxSize: sizes.length ? Math.round(Math.max(...sizes)) : 0,
        };
        
        return stats;
      })
      .sort((a, b) => sortBedroomTypes(a.type, b.type));
  }, [data]);

  // Calculate totals across all bedroom types
  const totals = useMemo(() => {
    if (!bedroomTypeStats.length) return null;

    // Filter out invalid entries first
    const validStats = bedroomTypeStats.filter(stat => 
      stat.count > 0 && 
      isFinite(stat.avgPsf) && stat.avgPsf > 0 &&
      isFinite(stat.avgPrice) && stat.avgPrice > 0 &&
      isFinite(stat.avgSize) && stat.avgSize > 0
    );
    
    if (validStats.length === 0) return null;
    
    // Get weights based on unit count
    const totalUnits = validStats.reduce((sum, stat) => sum + stat.count, 0);
    
    // Weighted average calculations
    const weightedPsf = validStats.reduce((sum, stat) => 
      sum + (stat.avgPsf * stat.count), 0) / totalUnits;
    
    const weightedPrice = validStats.reduce((sum, stat) => 
      sum + (stat.avgPrice * stat.count), 0) / totalUnits;
    
    const weightedSize = validStats.reduce((sum, stat) => 
      sum + (stat.avgSize * stat.count), 0) / totalUnits;
    
    // Get min/max values safely
    const minPsf = Math.min(...validStats.map(stat => stat.minPsf).filter(v => isFinite(v) && v > 0));
    const maxPsf = Math.max(...validStats.map(stat => stat.maxPsf).filter(v => isFinite(v) && v > 0));
    const minPrice = Math.min(...validStats.map(stat => stat.minPrice).filter(v => isFinite(v) && v > 0));
    const maxPrice = Math.max(...validStats.map(stat => stat.maxPrice).filter(v => isFinite(v) && v > 0));
    const minSize = Math.min(...validStats.map(stat => stat.minSize).filter(v => isFinite(v) && v > 0));
    const maxSize = Math.max(...validStats.map(stat => stat.maxSize).filter(v => isFinite(v) && v > 0));

    return {
      count: totalUnits,
      minPsf: isFinite(minPsf) ? Math.round(minPsf) : 0,
      avgPsf: isFinite(weightedPsf) ? Math.round(weightedPsf) : 0,
      maxPsf: isFinite(maxPsf) ? Math.round(maxPsf) : 0,
      minPrice: isFinite(minPrice) ? Math.round(minPrice) : 0,
      avgPrice: isFinite(weightedPrice) ? Math.round(weightedPrice) : 0,
      maxPrice: isFinite(maxPrice) ? Math.round(maxPrice) : 0,
      minSize: isFinite(minSize) ? Math.round(minSize) : 0,
      avgSize: isFinite(weightedSize) ? Math.round(weightedSize) : 0,
      maxSize: isFinite(maxSize) ? Math.round(maxSize) : 0,
    };
  }, [bedroomTypeStats]);

  // Function to render slot-machine-like effect for numbers
  const SlotMachineNumber = ({ value, isHighlighted = false, prefix = '', suffix = '' }: { 
    value: number, 
    isHighlighted?: boolean,
    prefix?: string,
    suffix?: string
  }) => {
    const [displayValue, setDisplayValue] = useState(value);
    const [isAnimating, setIsAnimating] = useState(false);
    
    useEffect(() => {
      if (isHighlighted && value !== displayValue) {
        setIsAnimating(true);
        
        // Generate random intermediate values
        let iterations = 0;
        const maxIterations = 5; // Reduced iterations for faster animation
        const interval = setInterval(() => {
          if (iterations < maxIterations) {
            // Random value between original and target with decreasing randomness
            const progress = iterations / maxIterations;
            const randomFactor = 1 - progress;
            const range = Math.abs(value - displayValue);
            const randomDelta = range * randomFactor * (Math.random() - 0.5);
            // Round the intermediate value for consistent display
            const intermediateValue = Math.round(value + randomDelta);
            
            setDisplayValue(intermediateValue);
            iterations++;
          } else {
            clearInterval(interval);
            setDisplayValue(value);
            setIsAnimating(false);
          }
        }, 80);
        
        return () => clearInterval(interval);
      } else {
        setDisplayValue(value);
      }
    }, [value, isHighlighted]);
    
    // Format the value for display (K/M for thousands/millions)
    const formattedValue = formatNumber(displayValue);
    
    return (
      <span className={`transition-all duration-200 ${isAnimating ? 'text-indigo-800 scale-110' : ''}`}>
        {prefix}{formattedValue}{suffix}
      </span>
    );
  };

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
            <div className="overflow-x-auto">
              <FixedHeaderTable maxHeight="650px">
                <Table>
                  <TableHeader className="bg-purple-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="font-semibold text-purple-700">Bedroom Type</TableHead>
                      <TableHead className="font-semibold text-purple-700">Unit Count</TableHead>
                      <TableHead className="text-center">
                        <div className="text-purple-700 font-semibold">PSF (per sqft)</div>
                        <div className="grid grid-cols-3 gap-1 text-xs mt-1">
                          <span className="text-purple-600">Min</span>
                          <span className="text-purple-600">Avg</span>
                          <span className="text-purple-600">Max</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="text-purple-700 font-semibold">Final Price</div>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bedroomTypeStats.length > 0 ? (
                      bedroomTypeStats.map((stat, index) => {
                        const isHighlighted = highlightedValues.includes(stat.type);
                        return (
                          <TableRow 
                            key={index} 
                            className={
                              isHighlighted 
                                ? "bg-yellow-50 transition-colors duration-500" 
                                : index % 2 === 0 ? "bg-white" : "bg-purple-50/30"
                            }
                          >
                            <TableCell className="font-medium text-purple-800">{stat.type}</TableCell>
                            <TableCell className="font-medium">{stat.count}</TableCell>
                            <TableCell>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="text-center px-2 py-1 bg-red-50 rounded-md text-red-600 font-medium">
                                  <SlotMachineNumber value={stat.minPsf} isHighlighted={isHighlighted} />
                                </div>
                                <div className={`text-center px-2 py-1 rounded-md font-medium transition-all duration-300 ${
                                  isHighlighted 
                                    ? "bg-yellow-300 text-yellow-900 animate-pulse" 
                                    : "bg-purple-50 text-purple-600"
                                }`}>
                                  <SlotMachineNumber value={stat.avgPsf} isHighlighted={isHighlighted} />
                                </div>
                                <div className="text-center px-2 py-1 bg-green-50 rounded-md text-green-600 font-medium">
                                  <SlotMachineNumber value={stat.maxPsf} isHighlighted={isHighlighted} />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="text-center px-2 py-1 bg-red-50 rounded-md text-red-600 font-medium">
                                  <SlotMachineNumber 
                                    value={stat.minPrice} 
                                    isHighlighted={isHighlighted} 
                                    prefix={showDollarSign ? '$' : ''}
                                  />
                                </div>
                                <div className="text-center px-2 py-1 bg-purple-50 rounded-md text-purple-600 font-medium">
                                  <SlotMachineNumber 
                                    value={stat.avgPrice} 
                                    isHighlighted={isHighlighted} 
                                    prefix={showDollarSign ? '$' : ''}
                                  />
                                </div>
                                <div className="text-center px-2 py-1 bg-green-50 rounded-md text-green-600 font-medium">
                                  <SlotMachineNumber 
                                    value={stat.maxPrice} 
                                    isHighlighted={isHighlighted} 
                                    prefix={showDollarSign ? '$' : ''}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="text-center px-2 py-1 bg-red-50 rounded-md text-red-600 font-medium">
                                  <SlotMachineNumber value={stat.minSize} isHighlighted={isHighlighted} />
                                </div>
                                <div className="text-center px-2 py-1 bg-purple-50 rounded-md text-purple-600 font-medium">
                                  <SlotMachineNumber value={stat.avgSize} isHighlighted={isHighlighted} />
                                </div>
                                <div className="text-center px-2 py-1 bg-green-50 rounded-md text-green-600 font-medium">
                                  <SlotMachineNumber value={stat.maxSize} isHighlighted={isHighlighted} />
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No data available for summary
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  {totals && bedroomTypeStats.length > 0 && (
                    <TableFooter className="bg-indigo-100/50 sticky bottom-0 z-10">
                      <TableRow>
                        <TableCell className="font-bold text-indigo-800">TOTAL</TableCell>
                        <TableCell className="font-bold text-indigo-800">{totals.count}</TableCell>
                        <TableCell>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center px-2 py-1 bg-red-100 rounded-md text-red-700 font-bold">
                              <SlotMachineNumber value={totals.minPsf} isHighlighted={highlightedValues.length > 0} />
                            </div>
                            <div className="text-center px-2 py-1 bg-indigo-100 rounded-md text-indigo-700 font-bold">
                              <SlotMachineNumber value={totals.avgPsf} isHighlighted={highlightedValues.length > 0} />
                            </div>
                            <div className="text-center px-2 py-1 bg-green-100 rounded-md text-green-700 font-bold">
                              <SlotMachineNumber value={totals.maxPsf} isHighlighted={highlightedValues.length > 0} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center px-2 py-1 bg-red-100 rounded-md text-red-700 font-bold">
                              <SlotMachineNumber 
                                value={totals.minPrice} 
                                isHighlighted={highlightedValues.length > 0} 
                                prefix={showDollarSign ? '$' : ''}
                              />
                            </div>
                            <div className="text-center px-2 py-1 bg-indigo-100 rounded-md text-indigo-700 font-bold">
                              <SlotMachineNumber 
                                value={totals.avgPrice} 
                                isHighlighted={highlightedValues.length > 0} 
                                prefix={showDollarSign ? '$' : ''}
                              />
                            </div>
                            <div className="text-center px-2 py-1 bg-green-100 rounded-md text-green-700 font-bold">
                              <SlotMachineNumber 
                                value={totals.maxPrice} 
                                isHighlighted={highlightedValues.length > 0} 
                                prefix={showDollarSign ? '$' : ''}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center px-2 py-1 bg-red-100 rounded-md text-red-700 font-bold">
                              <SlotMachineNumber value={totals.minSize} isHighlighted={highlightedValues.length > 0} />
                            </div>
                            <div className="text-center px-2 py-1 bg-indigo-100 rounded-md text-indigo-700 font-bold">
                              <SlotMachineNumber value={totals.avgSize} isHighlighted={highlightedValues.length > 0} />
                            </div>
                            <div className="text-center px-2 py-1 bg-green-100 rounded-md text-green-700 font-bold">
                              <SlotMachineNumber value={totals.maxSize} isHighlighted={highlightedValues.length > 0} />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </FixedHeaderTable>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default PricingSummary;
