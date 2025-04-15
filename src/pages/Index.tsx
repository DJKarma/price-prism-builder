import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CSVUploader from "@/components/CSVUploader";
import ColumnMapper from "@/components/ColumnMapper";
import PricingSimulator from "@/components/PricingSimulator";
import MegaOptimize from "@/components/MegaOptimize";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, FileSpreadsheet, LineChart, ArrowRight, PieChart } from "lucide-react";
import { usePricingStore } from "@/store/pricingStore";
import { toast } from "sonner";

const Index = () => {
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [forceUpdate, setForceUpdate] = useState<number>(0);
  const [newFileUploaded, setNewFileUploaded] = useState<boolean>(false);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [tabChanging, setTabChanging] = useState<boolean>(false);

  const { 
    csvData, 
    csvHeaders, 
    mappedData, 
    pricingConfig,
    additionalCategories,
    setCsvData,
    setMappedData,
    setPricingConfig
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
    setNewFileUploaded(true);
    changeTab('map', 'forward');
  };

  const handleMappingComplete = (mapping: Record<string, string>, data: any[], categories: any[]) => {
    setMappedData(data, categories);
    changeTab('simulate', 'forward');
  };

  const handleConfigUpdate = useCallback((updatedConfig: any) => {
    setPricingConfig(updatedConfig);
    setForceUpdate(prev => prev + 1);
  }, [setPricingConfig]);

  const handleBackToUpload = () => {
    changeTab('upload', 'backward');
  };
  
  const handleBackToMap = () => {
    changeTab('map', 'backward');
  };

  const changeTab = (tab: string, direction: 'forward' | 'backward') => {
    setTransitionDirection(direction);
    setTabChanging(true);
    
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
      case 'simulate':
        return <LineChart className={iconClass} />;
      default:
        return null;
    }
  };

  const isTabDisabled = (tab: string) => {
    switch (tab) {
      case 'upload':
        return false;
      case 'map':
        return !csvData.length;
      case 'simulate':
        return !mappedData.length;
      default:
        return true;
    }
  };

  useEffect(() => {
    if (mappedData.length && !pricingConfig) {
      const defaultConfig = {
        basePsf: 1000,
        bedroomTypePricing: [],
        viewPricing: [],
        floorRiseRules: [{ startFloor: 1, endFloor: maxFloor, psfIncrement: 10 }],
        maxFloor
      };
      
      const uniqueTypes = Array.from(
        new Set(
          mappedData
            .map((item) => item.type)
            .filter((type) => type && type.trim() !== "")
        )
      ) as string[];
      
      defaultConfig.bedroomTypePricing = uniqueTypes.map(type => ({
        type,
        basePsf: 1000,
        targetAvgPsf: 1000
      }));
      
      const uniqueViews = Array.from(
        new Set(
          mappedData
            .map((item) => item.view)
            .filter((view) => view && view.trim() !== "")
        )
      ) as string[];
      
      defaultConfig.viewPricing = uniqueViews.map(view => ({
        view,
        psfAdjustment: 0
      }));
      
      setPricingConfig(defaultConfig);
    }
  }, [mappedData, pricingConfig, maxFloor, setPricingConfig]);

  const handleManualTabChange = (value: string) => {
    if (value !== 'upload') {
      if (!csvData.length) {
        toast.error("Please upload a file first");
        return;
      }
      if (value === 'simulate' && !mappedData.length) {
        toast.error("Please map your columns first");
        return;
      }
    }
    
    setTransitionDirection(value === 'upload' ? 'backward' : 'forward');
    setTabChanging(true);
    
    setTimeout(() => {
      setActiveTab(value);
      setTabChanging(false);
    }, 300);
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
        <Tabs value={activeTab} onValueChange={handleManualTabChange}>
          <TabsList className="grid w-full grid-cols-3 mb-8 p-1 bg-gray-100 rounded-lg shadow-inner">
            {['upload', 'map', 'simulate'].map((step, index) => {
              const isActive = activeTab === step;
              const isPast = (
                (step === 'upload' && ['map', 'simulate'].includes(activeTab)) ||
                (step === 'map' && activeTab === 'simulate')
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
                    ${index === 2 ? 'rounded-r-md' : ''}
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
                  {index < 2 && (
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

            <TabsContent value="simulate" className="mt-0 animate-fade-in">
              {mappedData.length > 0 && (
                <>
                  <div className="mb-4">
                    <Button variant="outline" size="sm" onClick={handleBackToMap} className="hover-scale">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Map Columns
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
                    additionalCategories={additionalCategories}
                    maxFloor={maxFloor}
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
