
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PricingConfig } from '@/components/PricingConfiguration';

interface PricingState {
  csvData: any[];
  csvHeaders: string[];
  mappedData: any[];
  pricingConfig: PricingConfig | null;
  additionalCategories: any[];
  
  // Actions
  setCsvData: (data: any[], headers: string[]) => void;
  setMappedData: (data: any[], categories: any[]) => void;
  setPricingConfig: (config: PricingConfig) => void;
  updatePricingConfig: (config: PricingConfig) => void;
  resetOnNewFile: () => void;
}

// Create the store with persistence
export const usePricingStore = create<PricingState>()(
  persist(
    (set) => ({
      csvData: [],
      csvHeaders: [],
      mappedData: [],
      pricingConfig: null,
      additionalCategories: [],
      
      // Actions
      setCsvData: (data, headers) => set({
        csvData: data,
        csvHeaders: headers,
        // Reset other state when a new file is uploaded
        mappedData: [],
        pricingConfig: null,
        additionalCategories: []
      }),
      
      setMappedData: (data, categories) => set({
        mappedData: data,
        additionalCategories: categories
      }),
      
      setPricingConfig: (config) => set({
        pricingConfig: config
      }),
      
      updatePricingConfig: (config) => set({
        pricingConfig: config
      }),
      
      resetOnNewFile: () => set({
        csvData: [],
        csvHeaders: [],
        mappedData: [],
        pricingConfig: null,
        additionalCategories: []
      })
    }),
    {
      name: 'pricing-store', // unique name for localStorage
    }
  )
);
