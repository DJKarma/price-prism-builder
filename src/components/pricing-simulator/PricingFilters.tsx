
import React from "react";
import Select, { MenuPlacement } from "react-select";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
    
  // Function to determine menu placement based on the number of options
  const getMenuPlacement = (optionsLength: number): MenuPlacement => 
    optionsLength > 10 ? "top" : "auto";

  return (
    <>
      {/* Sticky toolbar with control buttons */}
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
                        <Label className="text-xs font-medium text-gray-700">
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
                          menuPlacement={getMenuPlacement(getUniqueAdditionalValues(column).length)}
                        />
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>

      {/* Primary filter area with compact layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
        <div className="md:col-span-4">
          <Label className="mb-2 block text-sm font-medium text-gray-700">
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
            menuPlacement={getMenuPlacement(uniqueTypes.length)}
            menuPortalTarget={document.body}
            styles={{
              menuPortal: base => ({ ...base, zIndex: 9999 }),
              menu: base => ({ ...base, zIndex: 9999 })
            }}
          />
        </div>

        <div className="md:col-span-4">
          <Label className="mb-2 block text-sm font-medium text-gray-700">
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
            menuPlacement={getMenuPlacement(uniqueViews.length)}
            menuPortalTarget={document.body}
            styles={{
              menuPortal: base => ({ ...base, zIndex: 9999 }),
              menu: base => ({ ...base, zIndex: 9999 })
            }}
          />
        </div>

        <div className="md:col-span-4">
          <Label className="mb-2 block text-sm font-medium text-gray-700">
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
            menuPlacement={getMenuPlacement(uniqueFloors.length)}
            menuPortalTarget={document.body}
            styles={{
              menuPortal: base => ({ ...base, zIndex: 9999 }),
              menu: base => ({ ...base, zIndex: 9999 })
            }}
          />
        </div>
      </div>
    </>
  );
};

export default PricingFilters;
