
import React, { useState } from "react";
import { X, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {safeSelectedTypes.length > 0
              ? `${safeSelectedTypes.length} ${safeSelectedTypes.length === 1 ? "type" : "types"} selected`
              : "Select bedroom types..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search bedroom types..." />
            <CommandEmpty>No bedroom type found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-[200px]">
                <div className="px-2 py-1">
                  <div 
                    className="flex items-center space-x-2 rounded-md px-2 py-2 cursor-pointer hover:bg-accent"
                    onClick={handleSelectAll}
                  >
                    <Checkbox 
                      checked={allSelected} 
                      className="h-4 w-4"
                    />
                    <span className="font-medium">{allSelected ? "Deselect All" : "Select All"}</span>
                  </div>
                </div>
                {safeBedroomTypes.length > 0 ? (
                  safeBedroomTypes.map((type) => (
                    <CommandItem
                      key={type}
                      value={type}
                      onSelect={() => handleTypeSelection(type)}
                      className="px-2 py-1 cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          checked={safeSelectedTypes.includes(type)} 
                          className="h-4 w-4"
                        />
                        <span>{type}</span>
                      </div>
                    </CommandItem>
                  ))
                ) : (
                  <div className="py-2 px-2 text-sm text-muted-foreground">
                    No bedroom types available
                  </div>
                )}
              </ScrollArea>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

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
