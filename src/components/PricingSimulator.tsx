
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import FloorPsfChart from '@/components/FloorPsfChart';
import PremiumEditor from '@/components/PremiumEditor';
import { Download, LineChart, Sliders, BarChart3 } from 'lucide-react';
import { PricingConfig } from '@/components/PricingConfiguration';
import PricingSummary from '@/components/PricingSummary';
import { simulatePricing } from '@/utils/psfOptimizer';
import { exportToExcel } from '@/utils/configUtils';

interface PricingSimulatorProps {
  data: any[];
  pricingConfig: PricingConfig;
  onConfigUpdate: (config: PricingConfig) => void;
}

const PricingSimulator: React.FC<PricingSimulatorProps> = ({
  data,
  pricingConfig,
  onConfigUpdate,
}) => {
  const [simulatedData, setSimulatedData] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [includeConfig, setIncludeConfig] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleSimulatePricing = () => {
    const { simulatedUnits, summaryByType } = simulatePricing(
      data,
      pricingConfig
    );

    setSimulatedData(simulatedUnits);
    
    // Convert summary to array for export
    const summaryArray = Object.entries(summaryByType).map(([type, stats]) => {
      const typedStats = stats as {
        count: number;
        minPsf: number;
        maxPsf: number;
        avgPsf: number;
        minPrice: number;
        maxPrice: number;
        avgPrice: number;
        totalSales: number;
      };
      
      return {
        Type: type,
        Count: typedStats.count,
        'Min PSF': typedStats.minPsf.toFixed(2),
        'Max PSF': typedStats.maxPsf.toFixed(2),
        'Avg PSF': typedStats.avgPsf.toFixed(2),
        'Min Price': typedStats.minPrice.toLocaleString(),
        'Max Price': typedStats.maxPrice.toLocaleString(),
        'Avg Price': typedStats.avgPrice.toLocaleString(),
        'Total Sales': typedStats.totalSales.toLocaleString()
      };
    });
    
    setSummaryData(summaryArray);
  };

  const handleExport = async () => {
    if (simulatedData.length === 0) {
      handleSimulatePricing();
    }
    
    setIsExporting(true);
    
    try {
      await exportToExcel(
        simulatedData, 
        includeConfig, 
        includeConfig ? pricingConfig : null,
        summaryData.length > 0 ? summaryData : null
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-indigo-100 shadow-md">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
          <CardTitle className="flex items-center gap-2 text-xl text-indigo-800">
            <LineChart className="h-5 w-5 text-indigo-600" />
            Pricing Simulator
          </CardTitle>
          <CardDescription className="text-indigo-600">
            Visualize pricing across floors and property types
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleSimulatePricing} 
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Simulate Pricing
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="include-config" 
                  checked={includeConfig}
                  onCheckedChange={setIncludeConfig}
                />
                <Label htmlFor="include-config">Include config file</Label>
              </div>
              
              <Button 
                variant="outline" 
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 border-indigo-200 hover:bg-indigo-50"
              >
                <Download className="h-4 w-4" />
                {isExporting ? 'Exporting...' : includeConfig ? 'Export with Config' : 'Export Data'}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-3 text-indigo-700 flex items-center">
                <Sliders className="h-5 w-5 mr-2 text-indigo-600" />
                Floor Rise PSF Chart
              </h3>
              <div className="h-[400px]">
                <FloorPsfChart
                  floorRules={pricingConfig.floorRiseRules}
                  maxFloor={pricingConfig.maxFloor || 50}
                />
              </div>
            </div>

            <PricingSummary 
              data={simulatedData.length > 0 ? simulatedData : data} 
              showDollarSign={true}
            />

            <PremiumEditor 
              pricingConfig={pricingConfig}
              onConfigUpdate={onConfigUpdate}
            />
          </div>
        </CardContent>
        
        <CardFooter className="px-6 py-4 bg-gradient-to-r from-indigo-50/70 to-blue-50/70 rounded-b">
          <p className="text-sm text-indigo-800">
            Adjust floor rise rules and view their impact on overall pricing
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PricingSimulator;
