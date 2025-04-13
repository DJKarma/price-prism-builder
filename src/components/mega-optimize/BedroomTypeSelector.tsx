
import React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface BedroomTypeSelectorProps {
  bedroomTypes: string[];
  selectedTypes: string[];
  setSelectedTypes: (types: string[]) => void;
}

const BedroomTypeSelector: React.FC<BedroomTypeSelectorProps> = ({
  bedroomTypes,
  selectedTypes,
  setSelectedTypes,
}) => {
  const [open, setOpen] = React.useState(false);

  // Ensure bedroomTypes is always an array, even if it's undefined
  const safeBedroomTypes = Array.isArray(bedroomTypes) ? bedroomTypes : [];
  // Ensure selectedTypes is always an array
  const safeSelectedTypes = Array.isArray(selectedTypes) ? selectedTypes : [];

  const handleTypeSelection = (type: string) => {
    if (safeSelectedTypes.includes(type)) {
      setSelectedTypes(safeSelectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...safeSelectedTypes, type]);
    }
  };

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
              {safeBedroomTypes.map((type) => (
                <CommandItem
                  key={type || "empty-key"}
                  value={type || "empty-value"}
                  onSelect={() => handleTypeSelection(type)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      safeSelectedTypes.includes(type) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {type || ""}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {safeSelectedTypes.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {safeSelectedTypes.map((type) => (
            <Badge
              key={type || "empty-key"}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {type || ""}
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
