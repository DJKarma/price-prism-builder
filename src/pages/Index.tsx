
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CSVUploader from "@/components/CSVUploader";
import ColumnMapper from "@/components/ColumnMapper";
import PricingConfiguration, { PricingConfig } from "@/components/PricingConfiguration";
import PricingSimulator from "@/components/PricingSimulator";
import MegaOptimize from "@/components/MegaOptimize";
import ConfigImporter from "@/components/ConfigImporter";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, FileSpreadsheet, Settings, LineChart, ArrowRight, PieChart } from "lucide-react";
import { usePricingStore } from "@/store/usePricingStore";

const Index = () => {
  // Local UI state
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [forceUpdate, setForceUpdate] = useState<number>(0);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [tabChanging, setTabChanging] = useState<boolean>(false);

  // Global state from our store
  const {
    csvData, 
    csvHeaders, 
    mappedData, 
    pricingConfig,
    additionalCategories,
    setCsvData,
    setMappedData,
    setPricingConfig,
    updatePricingConfig
  } = usePricingStore();

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
    setCsvData(data, headers);
    changeTab('map', 'forward');
  };

  const handleMappingComplete = (mapping: Record<string, string>, data: any[], categories: any[]) => {
    setMappedData(data, categories);
    changeTab('configure', 'forward');
  };

  const handleConfigurationComplete = useCallback((config: PricingConfig) => {
    const targetOverallPsf = config.bedroomTypePricing.reduce(
      (sum, type) => sum + type.targetAvgPsf, 
      0
    ) / config.bedroomTypePricing.length;
    
    const updatedConfig: PricingConfig = {
      ...config,
      targetOverallPsf,
      maxFloor: maxFloor
    };
    
    setPricingConfig(updatedConfig);
    
    setForceUpdate(prev => prev + 1);
    changeTab('simulate', 'forward');
  }, [maxFloor, setPricingConfig]);

  const handleConfigUpdate = useCallback((updatedConfig: PricingConfig) => {
    updatePricingConfig(updatedConfig);
    setForceUpdate(prev => prev + 1);
  }, [updatePricingConfig]);

  const handleBackToUpload = () => {
    changeTab('upload', 'backward');
  };
  
  const handleBackToMap = () => {
    changeTab('map', 'backward');
  };
  
  const handleBackToConfigure = () => {
    changeTab('configure', 'backward');
  };

  const changeTab = (tab: string, direction: 'forward' | 'backward') => {
    setTransitionDirection(direction);
    setTabChanging(true);
    
    // Small delay for animation
    setTimeout(() => {
      setActiveTab(tab);
      setTabChanging(false);
    }, 300);
  };

  const getStepIcon = (step: string, isActive: boolean) => {
    const iconClass = `h-4 w-4 ${isActive ? 'text-white' : 'text-gray-600'}`;
    
    switch (step) {
      case 'upload':
        return <Upload className={iconClass} />;
      case 'map':
        return <FileSpreadsheet className={iconClass} />;
      case 'configure':
        return <Settings className={iconClass} />;
      case 'simulate':
        return <LineChart className={iconClass} />;
      default:
        return null;
    }
  };

  // Helper to determine if a tab should be disabled
  const isTabDisabled = (tab: string) => {
    switch (tab) {
      case 'upload':
        return false;
      case 'map':
        return !csvData.length;
      case 'configure':
        return !mappedData.length;
      case 'simulate':
        return !pricingConfig;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" closeButton richColors />
      
      <header className="gradient-bg text-white py-8 animate-fade-in">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center">
            <PieChart className="h-8 w-8 mr-3" />
            Price Prism Builder
          </h1>
          <p className="text-lg opacity-90">
            Dynamic real estate pricing simulation tool
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={(value) => changeTab(value, value === 'upload' ? 'backward' : 'forward')}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-8 p-1 bg-gray-100 rounded-lg shadow-inner">
            {['upload', 'map', 'configure', 'simulate'].map((step, index) => {
              const isActive = activeTab === step;
              const isPast = (
                (step === 'upload' && ['map', 'configure', 'simulate'].includes(activeTab)) ||
                (step === 'map' && ['configure', 'simulate'].includes(activeTab)) ||
                (step === 'configure' && activeTab === 'simulate')
              );
              
              return (
                <TabsTrigger 
                  key={step}
                  value={step} 
                  disabled={isTabDisabled(step)}
                  className={`
                    relative py-2 px-3 transition-all duration-300 
                    ${isActive ? 'bg-indigo-600 text-white shadow-md' : ''}
                    ${isPast ? 'bg-indigo-100 text-indigo-700' : ''}
                    ${index === 0 ? 'rounded-l-md' : ''}
                    ${index === 3 ? 'rounded-r-md' : ''}
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className={`
                      flex items-center justify-center rounded-full w-6 h-6 
                      ${isActive ? 'bg-indigo-500' : isPast ? 'bg-indigo-200' : 'bg-gray-200'}
                    `}>
                      {index + 1}
                    </div>
                    <span className="hidden md:inline">{step.charAt(0).toUpperCase() + step.slice(1)}</span>
                    {getStepIcon(step, isActive)}
                  </div>
                  {index < 3 && (
                    <div className="absolute top-1/2 -right-3 w-6 h-0.5 bg-gray-300 transform -translate-y-1/2 z-0 hidden md:block"></div>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className={`transition-all duration-300 ${tabChanging ? transitionDirection === 'forward' ? 'opacity-0 translate-x-10' : 'opacity-0 -translate-x-10' : 'opacity-100 translate-x-0'}`}>
            <TabsContent value="upload" className="mt-0 animate-fade-in">
              <CSVUploader onDataParsed={handleDataParsed} />
            </TabsContent>

            <TabsContent value="map" className="mt-0 animate-fade-in">
              {csvData.length > 0 && csvHeaders.length > 0 && (
                <ColumnMapper
                  headers={csvHeaders}
                  data={csvData}
                  onMappingComplete={handleMappingComplete}
                  onBack={handleBackToUpload}
                />
              )}
            </TabsContent>

            <TabsContent value="configure" className="mt-0 animate-fade-in">
              {mappedData.length > 0 && (
                <>
                  <div className="mb-4 flex justify-between">
                    <Button variant="outline" size="sm" onClick={handleBackToMap} className="hover-scale">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Map Columns
                    </Button>
                    
                    {/* Add the ConfigImporter component */}
                    <div>
                      <ConfigImporter />
                    </div>
                  </div>
                  <PricingConfiguration
                    data={mappedData}
                    onConfigurationComplete={handleConfigurationComplete}
                    maxFloor={maxFloor}
                    additionalCategories={additionalCategories}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="simulate" className="mt-0 animate-fade-in">
              {pricingConfig && (
                <>
                  <div className="mb-4">
                    <Button variant="outline" size="sm" onClick={handleBackToConfigure} className="hover-scale">
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
          </div>
        </Tabs>
      </main>

      <footer className="bg-gray-800 text-white p-6 mt-10">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0 animate-fade-in">
              <h2 className="text-xl font-bold flex items-center">
                <PieChart className="h-5 w-5 mr-2" />
                Price Prism Builder
              </h2>
              <p className="text-sm opacity-75">
                Advanced real estate pricing simulation
              </p>
            </div>
            <div className="text-sm opacity-75 animate-fade-in">
              &copy; {new Date().getFullYear()} Price Prism Builder. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
