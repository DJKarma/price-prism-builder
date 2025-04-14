
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PricingConfig } from '@/components/PricingConfiguration';

export interface AppState {
  csvData: any[];
  csvHeaders: string[];
  mappedData: any[];
  pricingConfig: PricingConfig | null;
  additionalCategories: any[];
  newFileUploaded: boolean;
  
  // Actions
  setCsvData: (data: any[], headers: string[]) => void;
  setMappedData: (data: any[], categories: any[]) => void;
  setPricingConfig: (config: PricingConfig) => void;
  updatePricingConfig: (config: PricingConfig) => void;
  resetState: () => void;
}

const initialState = {
  csvData: [],
  csvHeaders: [],
  mappedData: [],
  pricingConfig: null,
  additionalCategories: [],
  newFileUploaded: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setCsvData: (data, headers) => set({ 
        csvData: data, 
        csvHeaders: headers,
        newFileUploaded: true,
        // Reset other state when new file is uploaded
        mappedData: [],
        pricingConfig: null,
        additionalCategories: []
      }),
      
      setMappedData: (data, categories) => set({ 
        mappedData: data,
        additionalCategories: categories,
        newFileUploaded: false
      }),
      
      setPricingConfig: (config) => set({ 
        pricingConfig: config
      }),
      
      updatePricingConfig: (config) => set({ 
        pricingConfig: config 
      }),
      
      resetState: () => set(initialState)
    }),
    {
      name: 'price-prism-storage',
      partialize: (state) => ({
        csvData: state.csvData,
        csvHeaders: state.csvHeaders,
        mappedData: state.mappedData,
        pricingConfig: state.pricingConfig,
        additionalCategories: state.additionalCategories
      }),
    }
  )
);
