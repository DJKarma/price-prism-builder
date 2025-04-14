
import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  ArrowUpDown,
  DollarSign,
  Maximize2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PricingSummaryProps {
  data: any[];
  showDollarSign?: boolean;
  highlightedTypes?: string[];
  showAcPsf?: boolean;
}

const PricingSummary: React.FC<PricingSummaryProps> = ({
  data,
  showDollarSign = true,
  highlightedTypes = [],
  showAcPsf = false
}) => {
  console.info("PricingSummary received data sample:", data[0]);

  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [totalSummary, setTotalSummary] = useState<any>({});
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  }>({ key: "type", direction: "ascending" });

  // Parse data and compute summary by bedroom type
  useEffect(() => {
    if (!data || data.length === 0) return;

    try {
      // Group by bedroom type
      const typeGroups: Record<string, any[]> = {};
      data.forEach((item) => {
        const type = item.type || "Unknown";
        if (!typeGroups[type]) {
          typeGroups[type] = [];
        }
        typeGroups[type].push(item);
      });

      // Calculate metrics for each type
      const typeSummary = Object.keys(typeGroups).map((type) => {
        const items = typeGroups[type];
        
        // Filter out items with missing essential data
        const validItems = items.filter(item => {
          const hasValidSellArea = parseFloat(item.sellArea) > 0;
          const hasValidPrice = typeof item.finalTotalPrice === 'number' && item.finalTotalPrice > 0;
          return hasValidSellArea && hasValidPrice;
        });
        
        if (validItems.length === 0) {
          return {
            type,
            unitCount: 0,
            totalArea: 0,
            avgSize: 0,
            avgPrice: 0,
            minPrice: 0,
            maxPrice: 0,
            avgPsf: 0,
            minPsf: 0,
            maxPsf: 0,
            avgAcPsf: 0,
            minAcPsf: 0,
            maxAcPsf: 0,
            totalValue: 0,
          };
        }
        
        // Extract and calculate metrics
        const unitCount = validItems.length;
        
        // SA (Sell Area) calculations
        const totalArea = validItems.reduce(
          (sum, item) => sum + parseFloat(item.sellArea || 0),
          0
        );
        
        const avgSize = totalArea / unitCount;
        
        const prices = validItems.map((item) => item.finalTotalPrice);
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / unitCount;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        // Calculate PSF from finalTotalPrice / sellArea (Sell Area PSF)
        const psfs = validItems.map(
          (item) => item.finalPsf || (item.finalTotalPrice / parseFloat(item.sellArea || 1))
        );
        const avgPsf = psfs.reduce((sum, psf) => sum + psf, 0) / unitCount;
        const minPsf = Math.min(...psfs);
        const maxPsf = Math.max(...psfs);
        
        // AC Area PSF calculations
        const validItemsWithAcArea = validItems.filter(item => parseFloat(item.acArea) > 0);
        let avgAcPsf = 0, minAcPsf = 0, maxAcPsf = 0;
        
        if (validItemsWithAcArea.length > 0) {
          const acPsfs = validItemsWithAcArea.map(
            (item) => item.finalAcPsf || (item.finalTotalPrice / parseFloat(item.acArea || 1))
          );
          avgAcPsf = acPsfs.reduce((sum, psf) => sum + psf, 0) / validItemsWithAcArea.length;
          minAcPsf = Math.min(...acPsfs);
          maxAcPsf = Math.max(...acPsfs);
        }
        
        const totalValue = validItems.reduce(
          (sum, item) => sum + item.finalTotalPrice,
          0
        );
        
        return {
          type,
          unitCount,
          totalArea,
          avgSize,
          avgPrice,
          minPrice,
          maxPrice,
          avgPsf,
          minPsf,
          maxPsf,
          avgAcPsf,
          minAcPsf,
          maxAcPsf,
          totalValue,
        };
      });

      // Sort by bedroom type
      if (sortConfig) {
        typeSummary.sort((a, b) => {
          if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === "ascending" ? -1 : 1;
          }
          if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === "ascending" ? 1 : -1;
          }
          return 0;
        });
      }

      // Calculate grand total
      const allValidItems = data.filter(item => {
        const hasValidSellArea = parseFloat(item.sellArea) > 0;
        const hasValidPrice = typeof item.finalTotalPrice === 'number' && item.finalTotalPrice > 0;
        return hasValidSellArea && hasValidPrice;
      });
      
      if (allValidItems.length > 0) {
        const totalUnitCount = allValidItems.length;
        const totalSellArea = allValidItems.reduce(
          (sum, item) => sum + parseFloat(item.sellArea || 0),
          0
        );
        
        const totalValue = allValidItems.reduce(
          (sum, item) => sum + (item.finalTotalPrice || 0),
          0
        );
        
        // Overall average PSF based on total value divided by total area
        const overallAvgPsf = totalValue / totalSellArea;
        
        // Min and max PSF across all units
        const allPsfs = allValidItems.map(
          (item) => item.finalPsf || (item.finalTotalPrice / parseFloat(item.sellArea || 1))
        );
        const minPsf = Math.min(...allPsfs);
        const maxPsf = Math.max(...allPsfs);
        
        // AC PSF calculations for all units
        const validItemsWithAcArea = allValidItems.filter(item => parseFloat(item.acArea) > 0);
        let overallAvgAcPsf = 0, minAcPsf = 0, maxAcPsf = 0;
        
        if (validItemsWithAcArea.length > 0) {
          const totalAcArea = validItemsWithAcArea.reduce(
            (sum, item) => sum + parseFloat(item.acArea || 0),
            0
          );
          
          const acPsfs = validItemsWithAcArea.map(
            (item) => item.finalAcPsf || (item.finalTotalPrice / parseFloat(item.acArea || 1))
          );
          
          overallAvgAcPsf = totalValue / totalAcArea;
          minAcPsf = Math.min(...acPsfs);
          maxAcPsf = Math.max(...acPsfs);
        }
        
        setTotalSummary({
          unitCount: totalUnitCount,
          totalArea: totalSellArea,
          totalValue,
          avgPsf: overallAvgPsf,
          minPsf,
          maxPsf,
          avgAcPsf: overallAvgAcPsf, 
          minAcPsf,
          maxAcPsf
        });
      } else {
        setTotalSummary({
          unitCount: 0,
          totalArea: 0,
          totalValue: 0,
          avgPsf: 0,
          minPsf: 0,
          maxPsf: 0,
          avgAcPsf: 0,
          minAcPsf: 0,
          maxAcPsf: 0
        });
      }

      setSummaryData(typeSummary);
    } catch (error) {
      console.error("Error processing pricing summary data:", error);
    }
  }, [data, sortConfig]);

  const handleSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key) {
      direction = sortConfig.direction === "ascending" ? "descending" : "ascending";
    }
    setSortConfig({ key, direction });
  };

  const formatNumber = (num: number, decimals = 0, isCurrency = false): string => {
    if (!isFinite(num) || isNaN(num)) return "-";
    
    if (isCurrency) {
      // Format large numbers with K or M suffix
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
      } else if (num >= 1000) {
        return (num / 1000).toFixed(0) + "K";
      }
    }
    
    // Format with commas and fixed decimal places
    return num.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const renderSortableHeader = (label: string, key: string) => (
    <div
      className="flex items-center cursor-pointer"
      onClick={() => handleSort(key)}
    >
      {label} <ArrowUpDown className="ml-1 h-4 w-4" />
    </div>
  );

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Pricing Summary</CardTitle>
        <CardDescription>
          Breakdown by bedroom type with PSF analytics
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{renderSortableHeader("Type", "type")}</TableHead>
                <TableHead className="text-right">
                  {renderSortableHeader("Units", "unitCount")}
                </TableHead>
                <TableHead className="text-right">
                  {renderSortableHeader("Avg Size", "avgSize")}
                </TableHead>
                <TableHead className="text-right">
                  {renderSortableHeader("Total Value", "totalValue")}
                </TableHead>
                
                {/* SA PSF Columns */}
                <TableHead className="text-right border-l border-gray-200">
                  {renderSortableHeader("Min SA PSF", "minPsf")}
                </TableHead>
                <TableHead className="text-right">
                  {renderSortableHeader("Avg SA PSF", "avgPsf")}
                </TableHead>
                <TableHead className="text-right">
                  {renderSortableHeader("Max SA PSF", "maxPsf")}
                </TableHead>
                
                {/* AC PSF Columns */}
                {showAcPsf && (
                  <>
                    <TableHead className="text-right border-l border-gray-200">
                      {renderSortableHeader("Min AC PSF", "minAcPsf")}
                    </TableHead>
                    <TableHead className="text-right">
                      {renderSortableHeader("Avg AC PSF", "avgAcPsf")}
                    </TableHead>
                    <TableHead className="text-right">
                      {renderSortableHeader("Max AC PSF", "maxAcPsf")}
                    </TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {summaryData.map((row) => (
                <TableRow 
                  key={row.type}
                  className={highlightedTypes.includes(row.type) ? "bg-green-50" : ""}
                >
                  <TableCell className="font-medium">
                    {row.type}
                  </TableCell>
                  <TableCell className="text-right">{row.unitCount}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(row.avgSize, 2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {showDollarSign && <DollarSign className="h-3 w-3 inline mr-0.5" />}
                    {formatNumber(row.totalValue, 0, true)}
                  </TableCell>
                  
                  {/* SA PSF values */}
                  <TableCell className="text-right border-l border-gray-200">
                    {formatNumber(row.minPsf, 2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatNumber(row.avgPsf, 2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(row.maxPsf, 2)}
                  </TableCell>
                  
                  {/* AC PSF values */}
                  {showAcPsf && (
                    <>
                      <TableCell className="text-right border-l border-gray-200">
                        {formatNumber(row.minAcPsf, 2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumber(row.avgAcPsf, 2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(row.maxAcPsf, 2)}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              
              {/* Total row */}
              <TableRow className="bg-gray-50 font-medium">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">
                  {totalSummary.unitCount}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(
                    totalSummary.totalArea / totalSummary.unitCount,
                    2
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {showDollarSign && <DollarSign className="h-3 w-3 inline mr-0.5" />}
                  {formatNumber(totalSummary.totalValue, 0, true)}
                </TableCell>
                
                {/* SA PSF totals */}
                <TableCell className="text-right border-l border-gray-200">
                  {formatNumber(totalSummary.minPsf, 2)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className="bg-indigo-50 border-indigo-200">
                    {formatNumber(totalSummary.avgPsf, 2)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(totalSummary.maxPsf, 2)}
                </TableCell>
                
                {/* AC PSF totals */}
                {showAcPsf && (
                  <>
                    <TableCell className="text-right border-l border-gray-200">
                      {formatNumber(totalSummary.minAcPsf, 2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-indigo-50 border-indigo-200">
                        {formatNumber(totalSummary.avgAcPsf, 2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(totalSummary.maxAcPsf, 2)}
                    </TableCell>
                  </>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingSummary;
