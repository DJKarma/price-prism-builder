
import React, { useState } from "react";
import { X, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface BedroomTypeSelectorProps {
  bedroomTypes: string[];
  selectedTypes: string[];
  setSelectedTypes: (types: string[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
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
  label = "Select Bedroom Types to Optimize",
  placeholder = "Select bedroom types...",
  className = "",
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
  
  // Toggle selection - if all selected, deselect all; otherwise select all
  const handleToggleAll = () => {
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
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium">{label}</label>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
          >
            {safeSelectedTypes.length > 0
              ? `${safeSelectedTypes.length} ${safeSelectedTypes.length === 1 ? "type" : "types"} selected`
              : placeholder}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full min-w-[200px] p-2 bg-background">
          <DropdownMenuLabel>Bedroom Types</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* Toggle All option */}
          <DropdownMenuCheckboxItem
            checked={allSelected}
            onSelect={(e) => {
              e.preventDefault();
              handleToggleAll();
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
