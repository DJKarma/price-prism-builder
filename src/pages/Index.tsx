
import React, { useState, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CSVUploader from "@/components/CSVUploader";
import ColumnMapper from "@/components/ColumnMapper";
import PricingConfiguration, { PricingConfig } from "@/components/PricingConfiguration";
import PricingSimulator from "@/components/PricingSimulator";
import MegaOptimize from "@/components/MegaOptimize";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mappedData, setMappedData] = useState<any[]>([]);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
  const [forceUpdate, setForceUpdate] = useState<number>(0);
  const [newFileUploaded, setNewFileUploaded] = useState<boolean>(false);

  const maxFloor = useMemo(() => {
    if (!mappedData.length) return 50; // Default
    
    let highest = 0;
    mappedData.forEach(unit => {
      const floorNum = parseInt(unit.floor as string) || 0;
      if (floorNum > highest) highest = floorNum;
    });
    
    return Math.max(highest + 5, 50);
  }, [mappedData]);

  const handleDataParsed = (data: any[], headers: string[]) => {
    setCsvData(data);
    setCsvHeaders(headers);
    setNewFileUploaded(true);
    setActiveTab("map");
  };

  const handleMappingComplete = (mapping: Record<string, string>, data: any[]) => {
    setMappedData(data);
    setActiveTab("configure");
  };

  const handleConfigurationComplete = useCallback((config: PricingConfig) => {
    // Remove base PSF from config as it's not needed
    const { basePsf, ...rest } = config;
    
    const targetOverallPsf = config.bedroomTypePricing.reduce(
      (sum, type) => sum + type.targetAvgPsf, 
      0
    ) / config.bedroomTypePricing.length;
    
    const updatedConfig = {
      ...rest,
      targetOverallPsf,
      maxFloor: maxFloor
    };
    
    setPricingConfig(updatedConfig);
    
    setForceUpdate(prev => prev + 1);
    setActiveTab("simulate");
  }, [maxFloor]);

  const handleConfigUpdate = useCallback((updatedConfig: PricingConfig) => {
    setPricingConfig(updatedConfig);
    setForceUpdate(prev => prev + 1);
  }, []);

  const handleBackToUpload = () => {
    setActiveTab("upload");
  };
  
  const handleBackToMap = () => {
    setActiveTab("map");
  };
  
  const handleBackToConfigure = () => {
    setActiveTab("configure");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" closeButton richColors />
      
      <header className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Price Prism Builder</h1>
          <p className="text-lg opacity-90">
            Dynamic real estate pricing simulation tool
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-8">
            <TabsTrigger value="upload" disabled={activeTab !== "upload"}>
              1. Upload Data
            </TabsTrigger>
            <TabsTrigger
              value="map"
              disabled={!csvData.length || (activeTab !== "map" && activeTab !== "configure" && activeTab !== "simulate")}
            >
              2. Map Columns
            </TabsTrigger>
            <TabsTrigger
              value="configure"
              disabled={!mappedData.length || (activeTab !== "configure" && activeTab !== "simulate")}
            >
              3. Configure Pricing
            </TabsTrigger>
            <TabsTrigger
              value="simulate"
              disabled={!pricingConfig || activeTab !== "simulate"}
            >
              4. Simulate Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-0">
            <CSVUploader onDataParsed={handleDataParsed} />
          </TabsContent>

          <TabsContent value="map" className="mt-0">
            {csvData.length > 0 && csvHeaders.length > 0 && (
              <ColumnMapper
                headers={csvHeaders}
                data={csvData}
                onMappingComplete={handleMappingComplete}
                onBack={handleBackToUpload}
              />
            )}
          </TabsContent>

          <TabsContent value="configure" className="mt-0">
            {mappedData.length > 0 && (
              <>
                <div className="mb-4">
                  <Button variant="outline" size="sm" onClick={handleBackToMap}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Map Columns
                  </Button>
                </div>
                <PricingConfiguration
                  data={mappedData}
                  onConfigurationComplete={handleConfigurationComplete}
                  maxFloor={maxFloor}
                  hideBasePsf={true} // New prop to hide base PSF
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="simulate" className="mt-0">
            {pricingConfig && (
              <>
                <div className="mb-4">
                  <Button variant="outline" size="sm" onClick={handleBackToConfigure}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Configure Pricing
                  </Button>
                </div>
                <MegaOptimize 
                  data={mappedData} 
                  pricingConfig={pricingConfig} 
                  onOptimized={handleConfigUpdate}
                />
                
                <PricingSimulator 
                  data={mappedData} 
                  pricingConfig={pricingConfig} 
                  onConfigUpdate={handleConfigUpdate}
                  key={`simulator-${forceUpdate}`}
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <footer className="bg-gray-800 text-white p-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h2 className="text-xl font-bold">Price Prism Builder</h2>
              <p className="text-sm opacity-75">
                Advanced real estate pricing simulation
              </p>
            </div>
            <div className="text-sm opacity-75">
              &copy; {new Date().getFullYear()} Price Prism Builder. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
