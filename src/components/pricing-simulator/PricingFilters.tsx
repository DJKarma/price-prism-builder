
import React from "react";
import { Label } from "@/components/ui/label";
import Select from "react-select";
import FilterHeader from "./FilterHeader";
import FilterControls from "./FilterControls";

interface PricingFiltersProps {
  uniqueTypes: string[];
  uniqueViews: string[];
  uniqueFloors: string[];
  selectedTypes: string[];
  setSelectedTypes: (types: string[]) => void;
  selectedViews: string[];
  setSelectedViews: (views: string[]) => void;
  selectedFloors: string[];
  setSelectedFloors: (floors: string[]) => void;
  additionalColumns: string[];
  getUniqueAdditionalValues: (column: string) => string[];
  selectedAdditionalFilters: Record<string, string[]>;
  setSelectedAdditionalFilters: (filters: Record<string, string[]>) => void;
  resetFilters: () => void;
  visibleColumns: string[];
  allColumns: Array<{ id: string; label: string; required: boolean }>;
  toggleColumnVisibility: (columnId: string) => void;
  resetColumnVisibility: () => void;
}

const PricingFilters: React.FC<PricingFiltersProps> = (props) => {
  return (
    <>
      {/* Sticky toolbar with control buttons */}
      <FilterHeader
        resetFilters={props.resetFilters}
        visibleColumns={props.visibleColumns}
        allColumns={props.allColumns}
        toggleColumnVisibility={props.toggleColumnVisibility}
        resetColumnVisibility={props.resetColumnVisibility}
        additionalColumns={props.additionalColumns}
        getUniqueAdditionalValues={props.getUniqueAdditionalValues}
        selectedAdditionalFilters={props.selectedAdditionalFilters}
        setSelectedAdditionalFilters={props.setSelectedAdditionalFilters}
      />

      {/* Primary filter area with compact layout */}
      <FilterControls
        uniqueTypes={props.uniqueTypes}
        uniqueViews={props.uniqueViews}
        uniqueFloors={props.uniqueFloors}
        selectedTypes={props.selectedTypes}
        setSelectedTypes={props.setSelectedTypes}
        selectedViews={props.selectedViews}
        setSelectedViews={props.setSelectedViews}
        selectedFloors={props.selectedFloors}
        setSelectedFloors={props.setSelectedFloors}
      />
    </>
  );
};

export default PricingFilters;
