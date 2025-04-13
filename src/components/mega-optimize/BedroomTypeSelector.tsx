
import React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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

  const handleTypeSelection = (type: string) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
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
            {selectedTypes.length > 0
              ? `${selectedTypes.length} ${selectedTypes.length === 1 ? "type" : "types"} selected`
              : "Select bedroom types..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search bedroom types..." />
            <CommandEmpty>No bedroom type found.</CommandEmpty>
            <CommandGroup>
              {bedroomTypes.map((type) => (
                <CommandItem
                  key={type}
                  value={type}
                  onSelect={() => handleTypeSelection(type)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedTypes.includes(type) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {type}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedTypes.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedTypes.map((type) => (
            <Badge
              key={type}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {type}
              <button
                className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-offset-1"
                onClick={() => handleTypeSelection(type)}
              >
                <Check className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default BedroomTypeSelector;
