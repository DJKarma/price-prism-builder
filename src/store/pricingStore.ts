
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PricingState {
  csvData: any[];
  csvHeaders: string[];
  mappedData: any[];
  pricingConfig: any | null;
  additionalCategories: any[];
  
  // Actions
  setCsvData: (data: any[], headers: string[]) => void;
  setMappedData: (data: any[], categories: any[]) => void;
  setPricingConfig: (config: any) => void;
  clearState: () => void;
}

export const usePricingStore = create<PricingState>()(
  persist(
    (set) => ({
      csvData: [],
      csvHeaders: [],
      mappedData: [],
      pricingConfig: null,
      additionalCategories: [],
      
      setCsvData: (data, headers) => set({ 
        csvData: data, 
        csvHeaders: headers,
        // Clear other state when new CSV is uploaded
        mappedData: [],
        pricingConfig: null,
        additionalCategories: []
      }),
      
      setMappedData: (data, categories) => set((state) => {
        // Check if data has balcony or if sellArea - acArea > 0
        const hasExplicitBalcony = data.some(item => item.balcony !== undefined);
        
        const hasImplicitBalcony = data.some(item => {
          const sellArea = parseFloat(item.sellArea) || 0;
          const acArea = parseFloat(item.acArea) || 0;
          return sellArea > acArea;
        });
        
        // If there's a balcony, make sure balconyPricing is initialized in config
        let updatedConfig = state.pricingConfig;
        if ((hasExplicitBalcony || hasImplicitBalcony) && updatedConfig) {
          if (!updatedConfig.balconyPricing) {
            updatedConfig = {
              ...updatedConfig,
              balconyPricing: {
                fullAreaPct: 0,
                remainderRate: 0
              }
            };
          }
        }
        
        return { 
          mappedData: data,
          additionalCategories: categories,
          pricingConfig: updatedConfig
        };
      }),
      
      setPricingConfig: (config) => set({ pricingConfig: config }),
      
      clearState: () => set({ 
        csvData: [],
        csvHeaders: [],
        mappedData: [],
        pricingConfig: null,
        additionalCategories: []
      }),
    }),
    {
      name: 'pricing-store',
    }
  )
);
