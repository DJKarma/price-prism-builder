
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Wand2 } from "lucide-react";
import BedroomTypeSelector from './BedroomTypeSelector';
import BedroomTypeSummary from './BedroomTypeSummary';
import OptimizationControls from './OptimizationControls';
import OptimizationImpact from './OptimizationImpact';
import OptimizationModeSelector from './OptimizationModeSelector';
import useOptimizer from './useOptimizer';
import { PricingConfig } from '@/components/PricingConfiguration';
import { OptimizationMode } from './types';

interface MegaOptimizeProps {
  data: any[];
  pricingConfig: PricingConfig;
  onOptimized: (updatedConfig: PricingConfig) => void;
}

export const MegaOptimize: React.FC<MegaOptimizeProps> = ({ 
  data, 
  pricingConfig, 
  onOptimized 
}) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>('psf');
  
  const {
    optimize,
    optimizationResult,
    isOptimizing,
    resetOptimization
  } = useOptimizer(data, pricingConfig);
  
  const handleOptimize = async (params: any) => {
    try {
      const updatedConfig = await optimize({
        ...params,
        bedroomType: selectedType,
        mode: optimizationMode
      });
      
      if (updatedConfig) {
        onOptimized(updatedConfig);
        toast.success(`Optimized pricing for ${selectedType || 'all units'}`);
      }
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error('Failed to optimize pricing');
    }
  };
  
  const bedroomTypes = pricingConfig.bedroomTypePricing.map(type => type.type);
  
  return (
    <Card className="mb-8 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-indigo-500" />
          MegaOptimize™
        </CardTitle>
        <CardDescription>
          Automatically adjust PSF values to achieve target pricing
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="optimize" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="optimize">Optimization Controls</TabsTrigger>
            <TabsTrigger value="results" disabled={!optimizationResult}>
              Results & Impact
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="optimize" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <BedroomTypeSelector
                  bedroomTypes={bedroomTypes}
                  selectedType={selectedType}
                  onSelect={setSelectedType}
                />
                
                <OptimizationModeSelector
                  mode={optimizationMode}
                  onChange={setOptimizationMode}
                />
              </div>
              
              <BedroomTypeSummary
                data={data}
                pricingConfig={pricingConfig}
                selectedType={selectedType}
              />
            </div>
            
            <OptimizationControls
              onOptimize={handleOptimize}
              isOptimizing={isOptimizing}
              optimizationMode={optimizationMode}
            />
          </TabsContent>
          
          <TabsContent value="results">
            {optimizationResult && (
              <OptimizationImpact result={optimizationResult} />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={resetOptimization}
          disabled={!optimizationResult}
        >
          Reset Optimization
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MegaOptimize;
