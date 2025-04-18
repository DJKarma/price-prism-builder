import React from "react";
import BedroomTypeSelector from "../mega-optimize/BedroomTypeSelector";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { RotateCcw, Settings } from "lucide-react";

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
  return (
    <>
      {/* primary filter row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        <div className="md:col-span-3">
          <BedroomTypeSelector
            bedroomTypes={uniqueTypes}
            selectedTypes={selectedTypes}
            setSelectedTypes={setSelectedTypes}
            label="Filter by Bedroom Types"
            placeholder="Select bedroom types..."
          />
        </div>
        <div className="md:col-span-3">
          <BedroomTypeSelector
            bedroomTypes={uniqueViews}
            selectedTypes={selectedViews}
            setSelectedTypes={setSelectedViews}
            label="Filter by Views"
            placeholder="Select views..."
          />
        </div>
        <div className="md:col-span-3">
          <BedroomTypeSelector
            bedroomTypes={uniqueFloors}
            selectedTypes={selectedFloors}
            setSelectedTypes={setSelectedFloors}
            label="Filter by Floors"
            placeholder="Select floors..."
          />
        </div>

        {/* reset + columns menu */}
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

              {/* menu now scrolls after ~5 items */}
              <DropdownMenuContent className="w-56 max-h-56 overflow-y-auto scrollbar-thin">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {allColumns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={visibleColumns.includes(column.id)}
                    onCheckedChange={() => toggleColumnVisibility(column.id)}
                    disabled={
                      column.required && visibleColumns.includes(column.id)
                    }
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}

                {/* additional factor columns */}
                {additionalColumns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column}
                    checked={visibleColumns.includes(column)}
                    onCheckedChange={() => toggleColumnVisibility(column)}
                  >
                    {column}
                  </DropdownMenuCheckboxItem>
                ))}

                {/* premiums for additional factors */}
                {additionalColumns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={`${column}_premium`}
                    checked={visibleColumns.includes(`${column}_premium`)}
                    onCheckedChange={() =>
                      toggleColumnVisibility(`${column}_premium`)
                    }
                  >
                    {column} Premium
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

      {/* additional category filters */}
      {additionalColumns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
          {additionalColumns.map((column) => (
            <div className="md:col-span-3" key={column}>
              <BedroomTypeSelector
                bedroomTypes={getUniqueAdditionalValues(column)}
                selectedTypes={selectedAdditionalFilters[column] || []}
                setSelectedTypes={(selected) =>
                  setSelectedAdditionalFilters({
                    ...selectedAdditionalFilters,
                    [column]: selected,
                  })
                }
                label={`Filter by ${column}`}
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
