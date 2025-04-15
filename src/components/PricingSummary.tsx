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
import { Checkbox } from "@/components/ui/checkbox";
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

  const [selectedMetrics, setSelectedMetrics] = useState<Record<MetricCategory, MetricType[]>>({
    psf: ["avg"],
    acPsf: ["avg"],
    size: ["avg"],
    price: ["avg"]
  });

  const formatLargeNumber = (num: number): string => {
    if (!isFinite(num) || isNaN(num)) return "-";
    
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toFixed(0);
  };

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
      const typeGroups: Record<string, any[]> = {};
      data.forEach((item) => {
        const type = item.type || "Unknown";
        if (!typeGroups[type]) {
          typeGroups[type] = [];
        }
        typeGroups[type].push(item);
      });

      const typeSummary = Object.keys(typeGroups).map((type) => {
        const items = typeGroups[type];
        
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
            minSize: 0,
            maxSize: 0,
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
        
        const unitCount = validItems.length;
        
        const totalArea = validItems.reduce(
          (sum, item) => sum + parseFloat(item.sellArea || 0),
          0
        );
        
        const sizes = validItems.map((item) => parseFloat(item.sellArea || 0));
        const avgSize = totalArea / unitCount;
        const minSize = Math.min(...sizes);
        const maxSize = Math.max(...sizes);
        
        const prices = validItems.map((item) => item.finalTotalPrice);
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / unitCount;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        const psfs = validItems.map(
          (item) => item.finalPsf || (item.finalTotalPrice / parseFloat(item.sellArea || 1))
        );
        const avgPsf = psfs.reduce((sum, psf) => sum + psf, 0) / unitCount;
        const minPsf = Math.min(...psfs);
        const maxPsf = Math.max(...psfs);
        
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
          minSize,
          maxSize,
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
        
        const allSizes = allValidItems.map((item) => parseFloat(item.sellArea || 0));
        const minSize = Math.min(...allSizes);
        const maxSize = Math.max(...allSizes);
        
        const allPrices = allValidItems.map((item) => item.finalTotalPrice);
        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);
        
        const overallAvgPsf = totalValue / totalSellArea;
        
        const allPsfs = allValidItems.map(
          (item) => item.finalPsf || (item.finalTotalPrice / parseFloat(item.sellArea || 1))
        );
        const minPsf = Math.min(...allPsfs);
        const maxPsf = Math.max(...allPsfs);
        
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
          avgSize: totalSellArea / totalUnitCount,
          minSize,
          maxSize,
          avgPrice: totalValue / totalUnitCount,
          minPrice,
          maxPrice,
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
          avgSize: 0,
          minSize: 0,
          maxSize: 0,
          avgPrice: 0,
          minPrice: 0,
          maxPrice: 0,
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

  const toggleMetric = (category: MetricCategory, metric: MetricType) => {
    setSelectedMetrics(prev => {
      const currentMetrics = [...prev[category]];
      
      if (currentMetrics.includes(metric)) {
        if (currentMetrics.length > 1) {
          return {
            ...prev,
            [category]: currentMetrics.filter(m => m !== metric)
          };
        }
        return prev;
      } else {
        return {
          ...prev,
          [category]: [...currentMetrics, metric]
        };
      }
    });
  };

  const renderMetricSelector = (category: MetricCategory, label: string) => (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground font-medium">{label}</span>
      <div className="flex flex-wrap gap-3 items-center">
        {(['min', 'avg', 'max'] as MetricType[]).map(metric => (
          <div key={`${category}-${metric}`} className="flex items-center space-x-2">
            <Checkbox 
              id={`${category}-${metric}`}
              checked={selectedMetrics[category].includes(metric)}
              onCheckedChange={() => toggleMetric(category, metric)}
            />
            <label 
              htmlFor={`${category}-${metric}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {metric.charAt(0).toUpperCase() + metric.slice(1)}
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMetricCell = (row: any, category: MetricCategory) => {
    const selectedForCategory = selectedMetrics[category];
    if (selectedForCategory.length === 0) return null;
    
    let content: JSX.Element[] = [];
    
    if (selectedForCategory.includes('min')) {
      const value = getMetricValue(row, category, 'min');
      content.push(
        <div key={`${category}-min`} className="text-gray-600 text-sm">
          <span className="font-medium text-xs">Min:</span> {formatNumber(value, category === 'price')}
        </div>
      );
    }
    
    if (selectedForCategory.includes('avg')) {
      const value = getMetricValue(row, category, 'avg');
      content.push(
        <div key={`${category}-avg`} className="font-medium">
          <span className="text-xs">Avg:</span> {formatNumber(value, category === 'price')}
        </div>
      );
    }
    
    if (selectedForCategory.includes('max')) {
      const value = getMetricValue(row, category, 'max');
      content.push(
        <div key={`${category}-max`} className="text-gray-600 text-sm">
          <span className="font-medium text-xs">Max:</span> {formatNumber(value, category === 'price')}
        </div>
      );
    }
    
    return <div className="space-y-1">{content}</div>;
  };

  const getMetricValue = (row: any, category: MetricCategory, metric: MetricType): number => {
    switch (category) {
      case "psf":
        return row[`${metric}Psf`] || 0;
      case "acPsf":
        return row[`${metric}AcPsf`] || 0;
      case "size":
        return row[`${metric}Size`] || 0;
      case "price":
        return row[`${metric}Price`] || 0;
    }
  };

  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Pricing Summary</CardTitle>
        <CardDescription>
          Breakdown by bedroom type with PSF analytics
        </CardDescription>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          {renderMetricSelector("size", "Size")}
          {renderMetricSelector("price", "Price")}
          {renderMetricSelector("psf", "SA PSF")}
          {showAcPsf && renderMetricSelector("acPsf", "AC PSF")}
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
                    {renderMetricCell(row, "size")}
                  </TableCell>
                  <TableCell className="text-right">
                    {showDollarSign && selectedMetrics.price.length > 0 && <DollarSign className="h-3 w-3 inline mr-0.5" />}
                    {renderMetricCell(row, "price")}
                  </TableCell>
                  <TableCell className="text-right border-l border-gray-200">
                    {renderMetricCell(row, "psf")}
                  </TableCell>
                  {showAcPsf && (
                    <TableCell className="text-right border-l border-gray-200">
                      {renderMetricCell(row, "acPsf")}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              
              <TableRow className="bg-gray-50 font-medium">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">
                  {totalSummary.unitCount}
                </TableCell>
                <TableCell className="text-right">
                  {renderMetricCell(totalSummary, "size")}
                </TableCell>
                <TableCell className="text-right">
                  {showDollarSign && selectedMetrics.price.length > 0 && <DollarSign className="h-3 w-3 inline mr-0.5" />}
                  {renderMetricCell(totalSummary, "price")}
                </TableCell>
                <TableCell className="text-right border-l border-gray-200">
                  <Badge variant="outline" className="bg-indigo-50 border-indigo-200">
                    {renderMetricCell(totalSummary, "psf")}
                  </Badge>
                </TableCell>
                {showAcPsf && (
                  <TableCell className="text-right border-l border-gray-200">
                    <Badge variant="outline" className="bg-indigo-50 border-indigo-200">
                      {renderMetricCell(totalSummary, "acPsf")}
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
