
import React from "react";
import Select from "react-select";
import { Button } from "@/components/ui/button";
import { RotateCcw, Settings, Filter } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FilterHeaderProps {
  resetFilters: () => void;
  visibleColumns: string[];
  allColumns: Array<{ id: string; label: string; required: boolean }>;
  toggleColumnVisibility: (columnId: string) => void;
  resetColumnVisibility: () => void;
  additionalColumns: string[];
  getUniqueAdditionalValues: (column: string) => string[];
  selectedAdditionalFilters: Record<string, string[]>;
  setSelectedAdditionalFilters: (filters: Record<string, string[]>) => void;
}

const FilterHeader: React.FC<FilterHeaderProps> = ({
  resetFilters,
  visibleColumns,
  allColumns,
  toggleColumnVisibility,
  resetColumnVisibility,
  additionalColumns,
  getUniqueAdditionalValues,
  selectedAdditionalFilters,
  setSelectedAdditionalFilters,
}) => {
  return (
    <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm py-2 border-b border-gray-100 mb-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-700">Filters:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="flex-shrink-0"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-shrink-0">
                <Settings className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56 max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-300" side="left">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {allColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={visibleColumns.includes(column.id)}
                  onCheckedChange={() => toggleColumnVisibility(column.id)}
                  disabled={column.required && visibleColumns.includes(column.id)}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}

              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={resetColumnVisibility}
                >
                  Reset to Default
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {additionalColumns.length > 0 && (
            <AdditionalFiltersPopover
              additionalColumns={additionalColumns}
              getUniqueAdditionalValues={getUniqueAdditionalValues}
              selectedAdditionalFilters={selectedAdditionalFilters}
              setSelectedAdditionalFilters={setSelectedAdditionalFilters}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Additional Filters Popover Component
interface AdditionalFiltersPopoverProps {
  additionalColumns: string[];
  getUniqueAdditionalValues: (column: string) => string[];
  selectedAdditionalFilters: Record<string, string[]>;
  setSelectedAdditionalFilters: (filters: Record<string, string[]>) => void;
}

const AdditionalFiltersPopover: React.FC<AdditionalFiltersPopoverProps> = ({
  additionalColumns,
  getUniqueAdditionalValues,
  selectedAdditionalFilters,
  setSelectedAdditionalFilters,
}) => {
  // Function to determine menu placement based on the number of options
  const getMenuPlacement = (optionsLength: number): "top" | "auto" => 
    optionsLength > 10 ? "top" : "auto";
    
  // Helper function to create select options
  const createOptions = (values: string[]) =>
    values.map(v => ({ label: v, value: v }));
    
  // Helper function to create selected options
  const createSelectedOptions = (values: string[], options: { label: string; value: string }[]) =>
    options.filter(opt => values.includes(opt.value));
    
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="flex-shrink-0">
          <Filter className="h-4 w-4 mr-2" />
          Additional Filters
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 z-50 max-h-96 overflow-y-auto" side="left">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Additional Category Filters</h4>
          {additionalColumns.map((column) => (
            <div key={column} className="space-y-2">
              <label className="text-xs font-medium text-gray-700">
                {column}
              </label>
              <Select
                options={createOptions(getUniqueAdditionalValues(column))}
                value={createSelectedOptions(
                  selectedAdditionalFilters[column] || [],
                  createOptions(getUniqueAdditionalValues(column))
                )}
                onChange={(selected) =>
                  setSelectedAdditionalFilters({
                    ...selectedAdditionalFilters,
                    [column]: selected ? selected.map(s => s.value) : [],
                  })
                }
                isMulti
                className="react-select-container"
                classNamePrefix="react-select"
                placeholder={`Select ${column}...`}
                menuPlacement={getMenuPlacement(getUniqueAdditionalValues(column).length)}
              />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FilterHeader;
