
import React from "react";
import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OptimizationModeSelectorProps {
  optimizationMode: "basePsf" | "allParams";
  onModeChange: (value: "basePsf" | "allParams") => void;
}

const OptimizationModeSelector: React.FC<OptimizationModeSelectorProps> = ({
  optimizationMode,
  onModeChange,
}) => {
  return (
    <div className="mb-6">
      <Label className="mb-2 block">Optimization Mode</Label>
      <div className="flex flex-col space-y-2">
        <ToggleGroup 
          type="single" 
          value={optimizationMode}
          onValueChange={(value) => {
            if (value) onModeChange(value as "basePsf" | "allParams");
          }}
          className="justify-start"
        >
          <ToggleGroupItem value="basePsf" className="flex-grow">
            Optimize Base PSF Only
          </ToggleGroupItem>
          <ToggleGroupItem value="allParams" className="flex-grow">
            Optimize All Parameters
          </ToggleGroupItem>
        </ToggleGroup>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-sm text-muted-foreground flex items-center mt-1">
              <Info className="h-4 w-4 mr-1 inline-block" />
              Learn more about optimization modes
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[350px] p-4 text-sm">
            <p className="font-medium mb-2">Optimization Mode Comparison:</p>
            <ul className="list-disc pl-4 space-y-2">
              <li><span className="font-medium">Base PSF Only:</span> Adjusts only the bedroom type base PSF values to achieve target overall PSF.</li>
              <li><span className="font-medium">All Parameters:</span> Optimizes bedroom base PSF, floor premium values, and view adjustments together. This mode preserves the cumulative nature of floor premiums while achieving the target PSF with minimal changes.</li>
            </ul>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default OptimizationModeSelector;
