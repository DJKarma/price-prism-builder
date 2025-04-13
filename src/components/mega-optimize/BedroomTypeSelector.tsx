
import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface BedroomTypeSelectorProps {
  bedroomTypes: string[];
  selectedTypes: string[];
  setSelectedTypes: (types: string[]) => void;
}

// Helper function to sort bedroom types naturally
const sortBedroomTypes = (a: string, b: string) => {
  // Extract numeric parts (if any) from bedroom type strings
  const aMatch = a.match(/(\d+)/);
  const bMatch = b.match(/(\d+)/);
  
  // If both have numbers, sort numerically
  if (aMatch && bMatch) {
    return parseInt(aMatch[0], 10) - parseInt(bMatch[0], 10);
  }
  
  // If only one has a number or neither has numbers, sort alphabetically
  return a.localeCompare(b);
};

const BedroomTypeSelector: React.FC<BedroomTypeSelectorProps> = ({
  bedroomTypes,
  selectedTypes,
  setSelectedTypes,
}) => {
  const [open, setOpen] = useState(false);

  // Ensure bedroomTypes is always an array, even if it's undefined, and sort it
  const safeBedroomTypes = Array.isArray(bedroomTypes) 
    ? [...bedroomTypes].sort(sortBedroomTypes) 
    : [];
    
  // Ensure selectedTypes is always an array
  const safeSelectedTypes = Array.isArray(selectedTypes) ? selectedTypes : [];

  const handleTypeSelection = (type: string) => {
    if (safeSelectedTypes.includes(type)) {
      setSelectedTypes(safeSelectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...safeSelectedTypes, type]);
    }
  };
  
  // Select all types
  const handleSelectAll = () => {
    if (safeSelectedTypes.length === safeBedroomTypes.length) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes([...safeBedroomTypes]);
    }
  };

  // Sort the selected types for display
  const sortedSelectedTypes = [...safeSelectedTypes].sort(sortBedroomTypes);
  
  // Check if all types are selected
  const allSelected = safeSelectedTypes.length === safeBedroomTypes.length && safeBedroomTypes.length > 0;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Select Bedroom Types to Optimize</label>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
          >
            {safeSelectedTypes.length > 0
              ? `${safeSelectedTypes.length} ${safeSelectedTypes.length === 1 ? "type" : "types"} selected`
              : "Select bedroom types..."}
            <span className="ml-2">▼</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full min-w-[200px] bg-popover p-2">
          <DropdownMenuLabel>Bedroom Types</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* Select All option */}
          <DropdownMenuCheckboxItem
            checked={allSelected}
            onSelect={(e) => {
              e.preventDefault();
              handleSelectAll();
            }}
            className="font-medium"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {/* List all bedroom types */}
          {safeBedroomTypes.length > 0 ? (
            safeBedroomTypes.map((type) => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={safeSelectedTypes.includes(type)}
                onSelect={(e) => {
                  e.preventDefault();
                  handleTypeSelection(type);
                }}
              >
                {type}
              </DropdownMenuCheckboxItem>
            ))
          ) : (
            <div className="px-2 py-1 text-sm text-muted-foreground">No bedroom types available</div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {safeSelectedTypes.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {sortedSelectedTypes.map((type) => (
            <Badge
              key={type}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {type}
              <button
                type="button"
                className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-offset-1"
                onClick={() => handleTypeSelection(type)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default BedroomTypeSelector;
