
import React from "react";
import Select from "react-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RotateCcw, Settings } from "lucide-react";
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

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        <div className="md:col-span-3">
          <Label className="mb-2 block text-sm font-medium text-gray-700">
            Filter by Bedroom Types
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
          />
        </div>

        <div className="md:col-span-3">
          <Label className="mb-2 block text-sm font-medium text-gray-700">
            Filter by Views
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
          />
        </div>

        <div className="md:col-span-3">
          <Label className="mb-2 block text-sm font-medium text-gray-700">
            Filter by Floors
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
          />
        </div>

        <div className="md:col-span-3 flex flex-col justify-end gap-2">
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="flex-shrink-0"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-shrink-0">
                  <Settings className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-56 max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-300">
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

      {additionalColumns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
          {additionalColumns.map((column) => (
            <div className="md:col-span-3" key={column}>
              <Label className="mb-2 block text-sm font-medium text-gray-700">
                Filter by {column}
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
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default PricingFilters;
