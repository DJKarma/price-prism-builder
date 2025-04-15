import React, { useState } from 'react';
import {
  Card,
  CardContent,
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
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface PricingSummaryProps {
  data: any[];
  previousData?: any[];
}

type MetricType = 'avg' | 'min' | 'max';
type MetricField = 'saPsf' | 'acPsf' | 'size' | 'price';

const PricingSummary: React.FC<PricingSummaryProps> = ({ data, previousData }) => {
  // State to track which metrics to show for each field
  const [selectedMetrics, setSelectedMetrics] = useState<Record<MetricField, MetricType[]>>({
    saPsf: ['avg'],
    acPsf: ['avg'],
    size: ['avg'],
    price: ['avg']
  });

  // Calculate summary metrics
  const calculateSummary = (units: any[], field: string, type: MetricType): { value: number, change: number | null } => {
    if (!units || units.length === 0) {
      return { value: 0, change: null };
    }

    let result: number;
    const validValues = units
      .filter(unit => Number.isFinite(unit[field]))
      .map(unit => unit[field]);

    if (validValues.length === 0) {
      return { value: 0, change: null };
    }

    switch (type) {
      case 'min':
        result = Math.min(...validValues);
        break;
      case 'max':
        result = Math.max(...validValues);
        break;
      case 'avg':
      default:
        const sum = validValues.reduce((acc, val) => acc + val, 0);
        result = sum / validValues.length;
    }

    // Calculate change if previous data exists
    let change = null;
    if (previousData && previousData.length > 0) {
      const prevValidValues = previousData
        .filter(unit => Number.isFinite(unit[field]))
        .map(unit => unit[field]);

      if (prevValidValues.length > 0) {
        let prevResult: number;
        
        switch (type) {
          case 'min':
            prevResult = Math.min(...prevValidValues);
            break;
          case 'max':
            prevResult = Math.max(...prevValidValues);
            break;
          case 'avg':
          default:
            const prevSum = prevValidValues.reduce((acc, val) => acc + val, 0);
            prevResult = prevSum / prevValidValues.length;
        }
        
        change = ((result - prevResult) / prevResult) * 100;
      }
    }

    return { value: result, change };
  };

  // Format numbers for display
  const formatValue = (value: number, field: MetricField): string => {
    if (field === 'price') {
      // Format as currency with K/M suffix
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(2)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(0)}k`;
      }
      return `${Math.round(value)}`;
    } else if (field === 'size') {
      // Size in square feet (integer)
      return Math.round(value).toString();
    } else {
      // PSF values (2 decimal places)
      return Math.round(value).toString();
    }
  };

  // Toggle a specific metric for a field
  const toggleMetric = (field: MetricField, metric: MetricType) => {
    setSelectedMetrics(prev => {
      const current = [...prev[field]];
      
      // If metric is already selected, remove it (unless it's the last one)
      if (current.includes(metric)) {
        if (current.length > 1) {
          return {
            ...prev,
            [field]: current.filter(m => m !== metric)
          };
        }
        return prev; // Don't allow removing the last metric
      } 
      
      // Otherwise add it
      return {
        ...prev,
        [field]: [...current, metric]
      };
    });
  };

  const getMetrics = (field: string, metricField: MetricField) => {
    return selectedMetrics[metricField].map(metricType => {
      const { value, change } = calculateSummary(data, field, metricType);
      return { 
        type: metricType, 
        value, 
        change,
        formatted: formatValue(value, metricField)
      };
    });
  };

  const saPsfMetrics = getMetrics('finalPsf', 'saPsf');
  const acPsfMetrics = getMetrics('finalAcPsf', 'acPsf');
  const sizeMetrics = getMetrics('sellArea', 'size');
  const priceMetrics = getMetrics('finalTotalPrice', 'price');

  // Get cell style based on change
  const getCellStyle = (change: number | null) => {
    if (change === null) return '';
    if (change > 0) return 'bg-green-50 text-green-700';
    if (change < 0) return 'bg-red-50 text-red-700';
    return '';
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Pricing Summary
          <div className="text-sm font-normal text-muted-foreground">
            {data.length} units
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
          {/* Metric Selectors */}
          <div>
            <h3 className="text-sm font-medium mb-2">Select Metrics to Display</h3>
            <div className="space-y-3">
              <div className="flex flex-col space-y-1.5">
                <Label className="text-xs text-muted-foreground">SA PSF Metrics</Label>
                <ToggleGroup type="multiple" variant="outline" className="justify-start">
                  <ToggleGroupItem 
                    value="avg" 
                    aria-label="Average"
                    size="sm"
                    data-state={selectedMetrics.saPsf.includes('avg') ? 'on' : 'off'}
                    onClick={() => toggleMetric('saPsf', 'avg')}
                  >
                    Avg
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="min" 
                    aria-label="Minimum"
                    size="sm"
                    data-state={selectedMetrics.saPsf.includes('min') ? 'on' : 'off'}
                    onClick={() => toggleMetric('saPsf', 'min')}
                  >
                    Min
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="max" 
                    aria-label="Maximum"
                    size="sm"
                    data-state={selectedMetrics.saPsf.includes('max') ? 'on' : 'off'}
                    onClick={() => toggleMetric('saPsf', 'max')}
                  >
                    Max
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label className="text-xs text-muted-foreground">AC PSF Metrics</Label>
                <ToggleGroup type="multiple" variant="outline" className="justify-start">
                  <ToggleGroupItem 
                    value="avg" 
                    aria-label="Average"
                    size="sm"
                    data-state={selectedMetrics.acPsf.includes('avg') ? 'on' : 'off'}
                    onClick={() => toggleMetric('acPsf', 'avg')}
                  >
                    Avg
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="min" 
                    aria-label="Minimum"
                    size="sm"
                    data-state={selectedMetrics.acPsf.includes('min') ? 'on' : 'off'}
                    onClick={() => toggleMetric('acPsf', 'min')}
                  >
                    Min
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="max" 
                    aria-label="Maximum"
                    size="sm"
                    data-state={selectedMetrics.acPsf.includes('max') ? 'on' : 'off'}
                    onClick={() => toggleMetric('acPsf', 'max')}
                  >
                    Max
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">&nbsp;</h3>
            <div className="space-y-3">
              <div className="flex flex-col space-y-1.5">
                <Label className="text-xs text-muted-foreground">Size Metrics</Label>
                <ToggleGroup type="multiple" variant="outline" className="justify-start">
                  <ToggleGroupItem 
                    value="avg" 
                    aria-label="Average"
                    size="sm"
                    data-state={selectedMetrics.size.includes('avg') ? 'on' : 'off'}
                    onClick={() => toggleMetric('size', 'avg')}
                  >
                    Avg
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="min" 
                    aria-label="Minimum"
                    size="sm"
                    data-state={selectedMetrics.size.includes('min') ? 'on' : 'off'}
                    onClick={() => toggleMetric('size', 'min')}
                  >
                    Min
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="max" 
                    aria-label="Maximum"
                    size="sm"
                    data-state={selectedMetrics.size.includes('max') ? 'on' : 'off'}
                    onClick={() => toggleMetric('size', 'max')}
                  >
                    Max
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label className="text-xs text-muted-foreground">Price Metrics</Label>
                <ToggleGroup type="multiple" variant="outline" className="justify-start">
                  <ToggleGroupItem 
                    value="avg" 
                    aria-label="Average"
                    size="sm"
                    data-state={selectedMetrics.price.includes('avg') ? 'on' : 'off'}
                    onClick={() => toggleMetric('price', 'avg')}
                  >
                    Avg
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="min" 
                    aria-label="Minimum"
                    size="sm"
                    data-state={selectedMetrics.price.includes('min') ? 'on' : 'off'}
                    onClick={() => toggleMetric('price', 'min')}
                  >
                    Min
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="max" 
                    aria-label="Maximum"
                    size="sm"
                    data-state={selectedMetrics.price.includes('max') ? 'on' : 'off'}
                    onClick={() => toggleMetric('price', 'max')}
                  >
                    Max
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </div>
        </div>
        
        <Table className="border">
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {saPsfMetrics.map(metric => (
              <TableRow key={`sa-psf-${metric.type}`}>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    SA PSF ({metric.type})
                  </Badge>
                </TableCell>
                <TableCell className={getCellStyle(metric.change)}>
                  {metric.formatted}
                </TableCell>
                <TableCell>
                  {metric.change !== null ? (
                    <Badge variant={metric.change > 0 ? "success" : metric.change < 0 ? "destructive" : "outline"}>
                      {metric.change > 0 ? '+' : ''}{metric.change.toFixed(2)}%
                    </Badge>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            
            {acPsfMetrics.map(metric => (
              <TableRow key={`ac-psf-${metric.type}`}>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    AC PSF ({metric.type})
                  </Badge>
                </TableCell>
                <TableCell className={getCellStyle(metric.change)}>
                  {metric.formatted}
                </TableCell>
                <TableCell>
                  {metric.change !== null ? (
                    <Badge variant={metric.change > 0 ? "success" : metric.change < 0 ? "destructive" : "outline"}>
                      {metric.change > 0 ? '+' : ''}{metric.change.toFixed(2)}%
                    </Badge>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            
            {sizeMetrics.map(metric => (
              <TableRow key={`size-${metric.type}`}>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    Size ({metric.type})
                  </Badge>
                </TableCell>
                <TableCell className={getCellStyle(metric.change)}>
                  {metric.formatted} sq.ft
                </TableCell>
                <TableCell>
                  {metric.change !== null ? (
                    <Badge variant={metric.change > 0 ? "success" : metric.change < 0 ? "destructive" : "outline"}>
                      {metric.change > 0 ? '+' : ''}{metric.change.toFixed(2)}%
                    </Badge>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            
            {priceMetrics.map(metric => (
              <TableRow key={`price-${metric.type}`}>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    Price ({metric.type})
                  </Badge>
                </TableCell>
                <TableCell className={getCellStyle(metric.change)}>
                  ${metric.formatted}
                </TableCell>
                <TableCell>
                  {metric.change !== null ? (
                    <Badge variant={metric.change > 0 ? "success" : metric.change < 0 ? "destructive" : "outline"}>
                      {metric.change > 0 ? '+' : ''}{metric.change.toFixed(2)}%
                    </Badge>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PricingSummary;
