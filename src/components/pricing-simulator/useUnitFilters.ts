
import { useState, useEffect } from 'react';
import { UnitWithPricing } from '../PricingSimulator';
import { toast } from 'sonner';

export const useUnitFilters = (units: UnitWithPricing[]) => {
  const [filteredUnits, setFilteredUnits] = useState<UnitWithPricing[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  }>({ key: "floor", direction: "ascending" }); // Set default sort to floor ascending
  
  // Multi-select filters
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedViews, setSelectedViews] = useState<string[]>([]);
  const [selectedFloors, setSelectedFloors] = useState<string[]>([]);
  const [selectedAdditionalFilters, setSelectedAdditionalFilters] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let result = [...units];
    
    // Apply multi-select filters
    if (selectedTypes.length > 0) {
      result = result.filter((unit) => selectedTypes.includes(unit.type));
    }
    if (selectedViews.length > 0) {
      result = result.filter((unit) => selectedViews.includes(unit.view));
    }
    if (selectedFloors.length > 0) {
      result = result.filter((unit) => selectedFloors.includes(unit.floor));
    }
    
    // Apply additional category filters
    Object.entries(selectedAdditionalFilters).forEach(([column, selectedValues]) => {
      if (selectedValues.length > 0) {
        const columnKey = `${column}_value`;
        result = result.filter(unit => 
          selectedValues.includes(unit[columnKey])
        );
      }
    });
    
    if (sortConfig) {
      result.sort((a, b) => {
        if (sortConfig.key === 'floor') {
          const floorA = parseInt(a.floor) || 0;
          const floorB = parseInt(b.floor) || 0;
          return sortConfig.direction === "ascending" ? floorA - floorB : floorB - floorA;
        }
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    setFilteredUnits(result);
  }, [units, selectedTypes, selectedViews, selectedFloors, selectedAdditionalFilters, sortConfig]);

  const resetFilters = () => {
    setSelectedTypes([]);
    setSelectedViews([]);
    setSelectedFloors([]);
    
    // Reset additional category filters
    const resetAdditionalFilters: Record<string, string[]> = {};
    Object.keys(selectedAdditionalFilters).forEach(col => {
      resetAdditionalFilters[col] = [];
    });
    setSelectedAdditionalFilters(resetAdditionalFilters);
    
    toast.success("Filters have been reset");
  };

  return {
    filteredUnits,
    selectedTypes,
    setSelectedTypes,
    selectedViews,
    setSelectedViews,
    selectedFloors,
    setSelectedFloors,
    selectedAdditionalFilters,
    setSelectedAdditionalFilters,
    sortConfig,
    setSortConfig,
    resetFilters
  };
};
