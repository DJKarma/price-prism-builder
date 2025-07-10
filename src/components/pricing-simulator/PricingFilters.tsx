
import React, { useState } from "react";
import Select from "react-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RotateCcw, Settings, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface SelectOption {
  label: string;
  value: string;
}

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

const PricingFilters: React.FC<PricingFiltersProps> = ({
  uniqueTypes,
  uniqueViews,
  uniqueFloors,
  selectedTypes,
  setSelectedTypes,
  selectedViews,
  setSelectedViews,
  selectedFloors,
  setSelectedFloors,
  additionalColumns,
  getUniqueAdditionalValues,
  selectedAdditionalFilters,
  setSelectedAdditionalFilters,
  resetFilters,
  visibleColumns,
  allColumns,
  toggleColumnVisibility,
  resetColumnVisibility,
}) => {
  const createOptions = (values: string[]): SelectOption[] =>
    values.map(v => ({ label: v, value: v }));

  const typeOptions = createOptions(uniqueTypes);
  const viewOptions = createOptions(uniqueViews);
  const floorOptions = createOptions(uniqueFloors);

  const createSelectedOptions = (values: string[], options: SelectOption[]) =>
    options.filter(opt => values.includes(opt.value));
    
  const selectStyles = {
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
    menu: (base: any) => ({ ...base, zIndex: 9999 })
  };

  return (
    <div className="sticky top-0 z-10 bg-white pb-3 border-b mb-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-3">
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="mb-1 block text-sm font-medium text-gray-700">
              Bedroom Types
            </Label>
            <Select
              options={typeOptions}
              value={createSelectedOptions(selectedTypes, typeOptions)}
              onChange={(selected) => 
                setSelectedTypes(selected ? selected.map(s => s.value) : [])
              }
              isMulti
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder="Select bedroom types..."
              menuPortalTarget={document.body}
              menuPlacement="auto"
              menuPosition="fixed"
              styles={selectStyles}
            />
          </div>

          <div>
            <Label className="mb-1 block text-sm font-medium text-gray-700">
              Views
            </Label>
            <Select
              options={viewOptions}
              value={createSelectedOptions(selectedViews, viewOptions)}
              onChange={(selected) => 
                setSelectedViews(selected ? selected.map(s => s.value) : [])
              }
              isMulti
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder="Select views..."
              menuPortalTarget={document.body}
              menuPlacement="auto"
              menuPosition="fixed"
              styles={selectStyles}
            />
          </div>

          <div>
            <Label className="mb-1 block text-sm font-medium text-gray-700">
              Floors
            </Label>
            <Select
              options={floorOptions}
              value={createSelectedOptions(selectedFloors, floorOptions)}
              onChange={(selected) => 
                setSelectedFloors(selected ? selected.map(s => s.value) : [])
              }
              isMulti
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder="Select floors..."
              menuPortalTarget={document.body}
              menuPlacement="auto"
              menuPosition="fixed"
              styles={selectStyles}
            />
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col justify-end">
          <div className="flex items-center justify-end gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="h-8"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Settings className="h-3.5 w-3.5 mr-1" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-56 max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-300" align="end">
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
            </div>
          </div>
        </div>
      </div>

      {additionalColumns.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {additionalColumns.map((column) => (
            <div key={column}>
              <Label className="mb-1 block text-sm font-medium text-gray-700">
                {column}
              </Label>
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
                menuPortalTarget={document.body}
                menuPlacement="auto"
                menuPosition="fixed"
                styles={selectStyles}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PricingFilters;
