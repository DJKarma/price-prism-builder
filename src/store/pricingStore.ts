
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
      
      setMappedData: (data, categories) => set({ 
        mappedData: data,
        additionalCategories: categories
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
