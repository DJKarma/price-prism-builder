import React, { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { calculateUnitPrice, calculateFloorPremium } from "@/utils/psfOptimizer";
import { PricingConfig } from "./PricingConfiguration";
import PremiumEditor from "./PremiumEditor";
import { ArrowDown, ArrowUp } from "lucide-react";
import ConfigExport from './ConfigExport';

interface PricingSimulatorProps {
  data: any[];
  pricingConfig: PricingConfig;
  onConfigUpdate: (updatedConfig: PricingConfig) => void;
}

const PricingSimulator: React.FC<PricingSimulatorProps> = ({ 
  data, 
  pricingConfig, 
  onConfigUpdate 
}) => {
  const [basePsf, setBasePsf] = useState<number>(pricingConfig?.basePsf || 1500);
  const [floorRisePsf, setFloorRisePsf] = useState<number>(5);
  const [selectedBedroomType, setSelectedBedroomType] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const [floorNumber, setFloorNumber] = useState<number>(1);
  const [localConfig, setLocalConfig] = useState<PricingConfig>(pricingConfig);
  const [simulatedUnits, setSimulatedUnits] = useState<any[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const bedroomTypes = useMemo(() => {
    return [...new Set(data.map(item => item.bedroomType))];
  }, [data]);
  
  const viewTypes = useMemo(() => {
    return [...new Set(data.map(item => item.view))];
  }, [data]);
  
  const maxFloor = useMemo(() => {
    let highest = 0;
    data.forEach(unit => {
      const floorNum = parseInt(unit.floor as string) || 0;
      if (floorNum > highest) highest = floorNum;
    });
    
    return Math.max(highest + 5, 50);
  }, [data]);
  
  const handleBasePsfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setBasePsf(value);
  };
  
  const handleFloorRisePsfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setFloorRisePsf(value);
  };
  
  const handleBedroomTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBedroomType(e.target.value);
  };
  
  const handleViewChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedView(e.target.value);
  };
  
  const handleFloorNumberChange = (value: number[]) => {
    setFloorNumber(value[0]);
  };
  
  const simulatePricing = useCallback(() => {
    if (!pricingConfig) {
      toast({
        title: "Configuration Required",
        description: "Please configure pricing before simulating.",
        variant: "destructive"
      });
      return;
    }
    
    const simulated = data.map(unit => {
      const bedroomTypeConfig = pricingConfig.bedroomTypePricing.find(
        (type: any) => type.type === unit.bedroomType
      );
      
      const viewConfig = pricingConfig.viewPricing.find(
        (view: any) => view.view === unit.view
      );
      
      const basePsfForBedroom = bedroomTypeConfig?.basePsf || pricingConfig.basePsf;
      const viewAdjustment = viewConfig?.psfAdjustment || 0;
      
      const floorPremium = calculateFloorPremium(parseInt(unit.floor), pricingConfig.floorRiseRules);
      
      const unitPriceDetails = calculateUnitPrice({
        unit,
        basePsf: basePsfForBedroom,
        viewAdjustment,
        floorPremium,
        pricingConfig
      });
      
      return {
        ...unit,
        ...unitPriceDetails
      };
    });
    
    setSimulatedUnits(simulated);
  }, [data, pricingConfig]);
  
  const handleConfigChange = (newConfig: PricingConfig) => {
    setLocalConfig(newConfig);
    onConfigUpdate(newConfig);
    simulatePricing();
  };
  
  const filteredUnits = useMemo(() => {
    let filtered = [...simulatedUnits];
    
    if (selectedBedroomType) {
      filtered = filtered.filter(unit => unit.bedroomType === selectedBedroomType);
    }
    
    if (selectedView) {
      filtered = filtered.filter(unit => unit.view === selectedView);
    }
    
    if (floorNumber) {
      filtered = filtered.filter(unit => parseInt(unit.floor) === floorNumber);
    }
    
    return filtered;
  }, [simulatedUnits, selectedBedroomType, selectedView, floorNumber]);
  
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  const sortedUnits = useMemo(() => {
    if (!sortColumn) return filteredUnits;
    
    return [...filteredUnits].sort((a: any, b: any) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
      if (aValue === bValue) return 0;
      
      const isAscending = sortDirection === 'asc';
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return isAscending ? aValue - bValue : bValue - aValue;
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        return isAscending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return 0;
      }
    });
  }, [filteredUnits, sortColumn, sortDirection]);
  
  const getSortIndicator = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ArrowUp className="inline w-4 h-4 ml-1" /> : <ArrowDown className="inline w-4 h-4 ml-1" />;
    }
    return null;
  };

  const generateSummaryData = () => {
    const summary = [];
    
    const overallAvgPsf = simulatedUnits.reduce((sum, unit) => sum + parseFloat(unit.finalPsfPrice), 0) / simulatedUnits.length;
    summary.push({
      Metric: 'Overall Average PSF',
      Value: overallAvgPsf.toFixed(2)
    });
    
    const bedroomTypes = [...new Set(simulatedUnits.map(unit => unit.bedroomType))];
    bedroomTypes.forEach(type => {
      const unitsOfType = simulatedUnits.filter(unit => unit.bedroomType === type);
      const avgPsf = unitsOfType.reduce((sum, unit) => sum + parseFloat(unit.finalPsfPrice), 0) / unitsOfType.length;
      summary.push({
        Metric: `Average PSF - ${type}`,
        Value: avgPsf.toFixed(2)
      });
    });
    
    const hasSA = simulatedUnits.some(unit => unit.saleableArea);
    const hasAC = simulatedUnits.some(unit => unit.area);
    
    if (hasSA) {
      const totalSA = simulatedUnits.reduce((sum, unit) => sum + (parseFloat(unit.saleableArea) || 0), 0);
      const totalRevenue = simulatedUnits.reduce((sum, unit) => sum + parseFloat(unit.finalPrice), 0);
      const saPsf = totalRevenue / totalSA;
      
      summary.push({
        Metric: 'Overall SA PSF',
        Value: saPsf.toFixed(2)
      });
    }
    
    if (hasAC) {
      const totalAC = simulatedUnits.reduce((sum, unit) => sum + (parseFloat(unit.area) || 0), 0);
      const totalRevenue = simulatedUnits.reduce((sum, unit) => sum + parseFloat(unit.finalPrice), 0);
      const acPsf = totalRevenue / totalAC;
      
      summary.push({
        Metric: 'Overall AC PSF',
        Value: acPsf.toFixed(2)
      });
    }
    
    return summary;
  };
  
  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Pricing Simulation</CardTitle>
          <CardDescription>
            Adjust parameters to simulate pricing for different units.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="bedroomType">Bedroom Type</Label>
              <select
                id="bedroomType"
                className="w-full rounded-md border shadow-sm focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                onChange={handleBedroomTypeChange}
                value={selectedBedroomType || ''}
              >
                <option value="">All Bedroom Types</option>
                {bedroomTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="view">View</Label>
              <select
                id="view"
                className="w-full rounded-md border shadow-sm focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                onChange={handleViewChange}
                value={selectedView || ''}
              >
                <option value="">All Views</option>
                {viewTypes.map(view => (
                  <option key={view} value={view}>{view}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="floor">Floor</Label>
              <Slider
                id="floor"
                defaultValue={[1]}
                max={maxFloor}
                step={1}
                onValueChange={handleFloorNumberChange}
              />
              <div className="text-sm text-gray-500 mt-1">
                Selected Floor: {floorNumber}
              </div>
            </div>
          </div>
          
          <Button onClick={simulatePricing}>Simulate Pricing</Button>
        </CardContent>
      </Card>
      
      <PremiumEditor 
        pricingConfig={localConfig}
        onPricingConfigChange={handleConfigChange}
      />
      
      {simulatedUnits.length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Simulated Unit Prices</CardTitle>
            <CardDescription>
              Detailed pricing breakdown for each unit.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort('unitNumber')} className="cursor-pointer">
                    Unit # {getSortIndicator('unitNumber')}
                  </TableHead>
                  <TableHead onClick={() => handleSort('bedroomType')} className="cursor-pointer">
                    Type {getSortIndicator('bedroomType')}
                  </TableHead>
                  <TableHead onClick={() => handleSort('view')} className="cursor-pointer">
                    View {getSortIndicator('view')}
                  </TableHead>
                  <TableHead onClick={() => handleSort('floor')} className="cursor-pointer">
                    Floor {getSortIndicator('floor')}
                  </TableHead>
                  <TableHead onClick={() => handleSort('area')} className="cursor-pointer">
                    Area {getSortIndicator('area')}
                  </TableHead>
                  <TableHead onClick={() => handleSort('basePsfPrice')} className="cursor-pointer">
                    Base Price {getSortIndicator('basePsfPrice')}
                  </TableHead>
                  <TableHead onClick={() => handleSort('viewPremium')} className="cursor-pointer">
                    View Premium {getSortIndicator('viewPremium')}
                  </TableHead>
                  <TableHead onClick={() => handleSort('floorPremium')} className="cursor-pointer">
                    Floor Premium {getSortIndicator('floorPremium')}
                  </TableHead>
                  <TableHead onClick={() => handleSort('finalPsfPrice')} className="cursor-pointer">
                    Final PSF Price {getSortIndicator('finalPsfPrice')}
                  </TableHead>
                  <TableHead onClick={() => handleSort('finalPrice')} className="cursor-pointer">
                    Final Price {getSortIndicator('finalPrice')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {sortedUnits.map((unit: any) => (
                  <TableRow key={unit.unitNumber}>
                    <TableCell>{unit.unitNumber}</TableCell>
                    <TableCell>{unit.bedroomType}</TableCell>
                    <TableCell>{unit.view}</TableCell>
                    <TableCell>{unit.floor}</TableCell>
                    <TableCell>{unit.area}</TableCell>
                    <TableCell>{unit.basePsfPrice.toFixed(2)}</TableCell>
                    <TableCell>{unit.viewPremium.toFixed(2)}</TableCell>
                    <TableCell>{unit.floorPremium.toFixed(2)}</TableCell>
                    <TableCell>{unit.finalPsfPrice.toFixed(2)}</TableCell>
                    <TableCell>{unit.finalPrice.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      <div className="flex justify-between items-center mt-4">
        <h3 className="text-lg font-semibold">Export Results</h3>
        <ConfigExport data={filteredUnits} summaryData={generateSummaryData()} />
      </div>
    </div>
  );
};

export default PricingSimulator;
