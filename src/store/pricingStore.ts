import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PricingMode = 'apartment' | 'villa';

export interface PricingState {
  csvData: any[];
  csvHeaders: string[];
  mappedData: any[];
  pricingConfig: any | null;
  additionalCategories: any[];
  pricingMode: PricingMode;
  
  // Actions
  setCsvData: (data: any[], headers: string[]) => void;
  setMappedData: (data: any[], categories: any[]) => void;
  setPricingConfig: (config: any) => void;
  setPricingMode: (mode: PricingMode) => void;
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
      pricingMode: 'apartment', // default mode
      
      setCsvData: (data, headers) => set({ 
        csvData: data, 
        csvHeaders: headers,
        mappedData: [],
        pricingConfig: null,
        additionalCategories: [],
        pricingMode: 'apartment'
      }),
      
      setMappedData: (data, categories) => set((state) => {
        const hasExplicitBalcony = data.some(item => item.balcony !== undefined);
        
        const hasImplicitBalcony = data.some(item => {
          const sellArea = parseFloat(item.sellArea) || 0;
          const acArea = parseFloat(item.acArea) || 0;
          return sellArea > acArea;
        });
        
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
      
      setPricingMode: (mode) => set({ pricingMode: mode }),
      
      clearState: () => set({ 
        csvData: [],
        csvHeaders: [],
        mappedData: [],
        pricingConfig: null,
        additionalCategories: [],
        pricingMode: 'apartment'
      }),
    }),
    {
      name: 'pricing-store',
    }
  )
);
