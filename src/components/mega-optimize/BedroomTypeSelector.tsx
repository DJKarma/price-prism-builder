
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

const BedroomTypeSelector: React.FC<BedroomTypeSelectorProps> = ({
  bedroomTypes,
  selectedTypes,
  setSelectedTypes,
}) => {
  const [open, setOpen] = useState(false);

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
          {safeBedroomTypes.map((type) => (
            <DropdownMenuCheckboxItem
              key={type || "empty-key"}
              checked={safeSelectedTypes.includes(type)}
              onSelect={(e) => {
                e.preventDefault();
                handleTypeSelection(type);
              }}
            >
              {type || ""}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

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
