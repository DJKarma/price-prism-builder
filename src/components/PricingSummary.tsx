
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
  TableFooter,
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
}

const PricingSummary: React.FC<PricingSummaryProps> = ({ 
  data,
  showDollarSign = true
}) => {
  const [isOpen, setIsOpen] = useState(true);

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

  // Calculate totals across all bedroom types
  const totals = useMemo(() => {
    if (!bedroomTypeStats.length) return null;

    // Extract all values for PSF, price, and size from all bedroom types
    const allPsfs = bedroomTypeStats.flatMap(stat => 
      Array(stat.count).fill(stat.avgPsf));
    
    const allPrices = bedroomTypeStats.flatMap(stat => 
      Array(stat.count).fill(stat.avgPrice));
    
    const allSizes = bedroomTypeStats.flatMap(stat => 
      Array(stat.count).fill(stat.avgSize));
    
    const totalCount = bedroomTypeStats.reduce((sum, stat) => sum + stat.count, 0);

    return {
      count: totalCount,
      minPsf: Math.min(...bedroomTypeStats.map(stat => stat.minPsf)),
      avgPsf: allPsfs.reduce((sum, psf) => sum + psf, 0) / allPsfs.length || 0,
      maxPsf: Math.max(...bedroomTypeStats.map(stat => stat.maxPsf)),
      minPrice: Math.min(...bedroomTypeStats.map(stat => stat.minPrice)),
      avgPrice: allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length || 0,
      maxPrice: Math.max(...bedroomTypeStats.map(stat => stat.maxPrice)),
      minSize: Math.min(...bedroomTypeStats.map(stat => stat.minSize)),
      avgSize: allSizes.reduce((sum, size) => sum + size, 0) / allSizes.length || 0,
      maxSize: Math.max(...bedroomTypeStats.map(stat => stat.maxSize)),
    };
  }, [bedroomTypeStats]);

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
              <Table>
                <TableHeader className="bg-purple-50">
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
                    bedroomTypeStats.map((stat, index) => (
                      <TableRow 
                        key={index} 
                        className={index % 2 === 0 ? "bg-white" : "bg-purple-50/30"}
                      >
                        <TableCell className="font-medium text-purple-800">{stat.type}</TableCell>
                        <TableCell className="font-medium">{stat.count}</TableCell>
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
                              {showDollarSign ? "$" : ""}{stat.minPrice.toLocaleString()}
                            </div>
                            <div className="text-center px-2 py-1 bg-purple-50 rounded-md text-purple-600 font-medium">
                              {showDollarSign ? "$" : ""}{Math.round(stat.avgPrice).toLocaleString()}
                            </div>
                            <div className="text-center px-2 py-1 bg-green-50 rounded-md text-green-600 font-medium">
                              {showDollarSign ? "$" : ""}{stat.maxPrice.toLocaleString()}
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
                {totals && bedroomTypeStats.length > 0 && (
                  <TableFooter className="bg-indigo-100/50">
                    <TableRow>
                      <TableCell className="font-bold text-indigo-800">TOTAL</TableCell>
                      <TableCell className="font-bold text-indigo-800">{totals.count}</TableCell>
                      <TableCell>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center px-2 py-1 bg-red-100 rounded-md text-red-700 font-bold">
                            {totals.minPsf.toFixed(2)}
                          </div>
                          <div className="text-center px-2 py-1 bg-indigo-100 rounded-md text-indigo-700 font-bold">
                            {totals.avgPsf.toFixed(2)}
                          </div>
                          <div className="text-center px-2 py-1 bg-green-100 rounded-md text-green-700 font-bold">
                            {totals.maxPsf.toFixed(2)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center px-2 py-1 bg-red-100 rounded-md text-red-700 font-bold">
                            {showDollarSign ? "$" : ""}{totals.minPrice.toLocaleString()}
                          </div>
                          <div className="text-center px-2 py-1 bg-indigo-100 rounded-md text-indigo-700 font-bold">
                            {showDollarSign ? "$" : ""}{Math.round(totals.avgPrice).toLocaleString()}
                          </div>
                          <div className="text-center px-2 py-1 bg-green-100 rounded-md text-green-700 font-bold">
                            {showDollarSign ? "$" : ""}{totals.maxPrice.toLocaleString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center px-2 py-1 bg-red-100 rounded-md text-red-700 font-bold">
                            {totals.minSize.toFixed(0)}
                          </div>
                          <div className="text-center px-2 py-1 bg-indigo-100 rounded-md text-indigo-700 font-bold">
                            {totals.avgSize.toFixed(0)}
                          </div>
                          <div className="text-center px-2 py-1 bg-green-100 rounded-md text-green-700 font-bold">
                            {totals.maxSize.toFixed(0)}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default PricingSummary;
