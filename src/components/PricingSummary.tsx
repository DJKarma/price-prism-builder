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
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ArrowUpDown,
  DollarSign,
} from "lucide-react";

interface PricingSummaryProps {
  data: any[];
  showDollarSign?: boolean;
  highlightedTypes?: string[];
  showAcPsf?: boolean;
}

type MetricType = "avg" | "min" | "max";
type MetricCategory = "psf" | "acPsf" | "size" | "price";

const PricingSummary: React.FC<PricingSummaryProps> = ({
  data,
  showDollarSign = true,
  highlightedTypes = [],
  showAcPsf = false
}) => {
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [totalSummary, setTotalSummary] = useState<any>({});
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  }>({ key: "type", direction: "ascending" });

  // Selected metrics state
  const [selectedMetrics, setSelectedMetrics] = useState<Record<MetricCategory, MetricType>>({
    psf: "avg",
    acPsf: "avg",
    size: "avg",
    price: "avg"
  });

  // Format number with K/M suffix for large numbers
  const formatLargeNumber = (num: number): string => {
    if (!isFinite(num) || isNaN(num)) return "-";
    
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toFixed(0);
  };

  // Format number with specified decimals
  const formatNumber = (num: number, isPrice = false): string => {
    if (!isFinite(num) || isNaN(num)) return "-";
    
    if (isPrice) {
      return formatLargeNumber(num);
    }
    return Math.ceil(num).toLocaleString();
  };

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

  const renderMetricSelector = (category: MetricCategory, label: string) => (
    <div className="flex flex-col gap-1 items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <ToggleGroup 
        type="single" 
        value={selectedMetrics[category]}
        onValueChange={(value) => {
          if (value) {
            setSelectedMetrics(prev => ({
              ...prev,
              [category]: value as MetricType
            }));
          }
        }}
        className="flex gap-1"
      >
        <ToggleGroupItem value="min" size="sm">Min</ToggleGroupItem>
        <ToggleGroupItem value="avg" size="sm">Avg</ToggleGroupItem>
        <ToggleGroupItem value="max" size="sm">Max</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );

  const getMetricValue = (row: any, category: MetricCategory): number => {
    const metric = selectedMetrics[category];
    switch (category) {
      case "psf":
        return row[`${metric}Psf`] || 0;
      case "acPsf":
        return row[`${metric}AcPsf`] || 0;
      case "size":
        return metric === "avg" ? row.avgSize : (metric === "min" ? row.minSize : row.maxSize);
      case "price":
        return row[`${metric}Price`] || 0;
    }
  };

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Pricing Summary</CardTitle>
        <CardDescription>
          Breakdown by bedroom type with PSF analytics
        </CardDescription>
        <div className="flex flex-wrap gap-4 justify-start mt-2">
          {renderMetricSelector("psf", "SA PSF")}
          {showAcPsf && renderMetricSelector("acPsf", "AC PSF")}
          {renderMetricSelector("size", "Size")}
          {renderMetricSelector("price", "Price")}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right border-l border-gray-200">SA PSF</TableHead>
                {showAcPsf && (
                  <TableHead className="text-right border-l border-gray-200">AC PSF</TableHead>
                )}
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {summaryData.map((row, index) => (
                <TableRow 
                  key={row.type}
                  className={highlightedTypes.includes(row.type) ? "bg-green-50" : ""}
                >
                  <TableCell className="font-medium">{row.type}</TableCell>
                  <TableCell className="text-right">{row.unitCount}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(getMetricValue(row, "size"))}
                  </TableCell>
                  <TableCell className="text-right">
                    {showDollarSign && <DollarSign className="h-3 w-3 inline mr-0.5" />}
                    {formatNumber(getMetricValue(row, "price"), true)}
                  </TableCell>
                  <TableCell 
                    className={`text-right border-l border-gray-200 ${
                      row[`${selectedMetrics.psf}Psf`] !== row.prevPsf ? "bg-yellow-100" : ""
                    }`}
                  >
                    {formatNumber(getMetricValue(row, "psf"))}
                  </TableCell>
                  {showAcPsf && (
                    <TableCell 
                      className={`text-right border-l border-gray-200 ${
                        row[`${selectedMetrics.acPsf}AcPsf`] !== row.prevAcPsf ? "bg-yellow-100" : ""
                      }`}
                    >
                      {formatNumber(getMetricValue(row, "acPsf"))}
                    </TableCell>
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
                  {formatNumber(getMetricValue(totalSummary, "size"))}
                </TableCell>
                <TableCell className="text-right">
                  {showDollarSign && <DollarSign className="h-3 w-3 inline mr-0.5" />}
                  {formatNumber(getMetricValue(totalSummary, "price"), true)}
                </TableCell>
                <TableCell className="text-right border-l border-gray-200">
                  <Badge variant="outline" className="bg-indigo-50 border-indigo-200">
                    {formatNumber(getMetricValue(totalSummary, "psf"))}
                  </Badge>
                </TableCell>
                {showAcPsf && (
                  <TableCell className="text-right border-l border-gray-200">
                    <Badge variant="outline" className="bg-indigo-50 border-indigo-200">
                      {formatNumber(getMetricValue(totalSummary, "acPsf"))}
                    </Badge>
                  </TableCell>
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
