
import React from "react";
import { Info, Layers, Ruler } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
      <RadioGroup
        value={optimizationMode}
        onValueChange={(value) => onModeChange(value as "basePsf" | "allParams")}
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        <div>
          <label
            htmlFor="basePsf"
            className={`flex items-start space-x-3 space-y-0 rounded-md border p-4 cursor-pointer ${
              optimizationMode === "basePsf" 
                ? "bg-indigo-50 border-indigo-200" 
                : "hover:bg-slate-50"
            }`}
          >
            <RadioGroupItem value="basePsf" id="basePsf" className="mt-1" />
            <div className="space-y-2">
              <div className="flex items-center">
                <Ruler className="h-4 w-4 mr-2 text-indigo-600" />
                <span className="font-medium">Base PSF Only</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Adjusts only bedroom type base PSF values to achieve target overall PSF.
              </p>
            </div>
          </label>
        </div>
        
        <div>
          <label
            htmlFor="allParams"
            className={`flex items-start space-x-3 space-y-0 rounded-md border p-4 cursor-pointer ${
              optimizationMode === "allParams" 
                ? "bg-indigo-50 border-indigo-200" 
                : "hover:bg-slate-50"
            }`}
          >
            <RadioGroupItem value="allParams" id="allParams" className="mt-1" />
            <div className="space-y-2">
              <div className="flex items-center">
                <Layers className="h-4 w-4 mr-2 text-indigo-600" />
                <span className="font-medium">All Parameters</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Optimizes bedroom PSF, floor premiums, and view adjustments together.
              </p>
            </div>
          </label>
        </div>
      </RadioGroup>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-sm text-muted-foreground flex items-center mt-2 cursor-help">
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
  );
};

export default OptimizationModeSelector;
