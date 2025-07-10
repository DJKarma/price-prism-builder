
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Sparkles } from "lucide-react";

interface OptimizationControlsProps {
  currentOverallPsf: number;
  targetPsf: number;
  isOptimizing: boolean;
  isOptimized: boolean;
  onTargetPsfChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOptimize: () => void;
  onRevert: () => void;
  psfTypeLabel?: string;
}

const OptimizationControls: React.FC<OptimizationControlsProps> = ({
  currentOverallPsf,
  targetPsf,
  isOptimizing,
  isOptimized,
  onTargetPsfChange,
  onOptimize,
  onRevert,
  psfTypeLabel = "SA"
}) => {
  // Calculate a reasonable min/max range for the slider
  const minPsf = Math.max(currentOverallPsf * 0.8, 10);
  const maxPsf = currentOverallPsf * 1.2;
  
  const handleSliderChange = (value: number[]) => {
    const event = {
      target: { value: value[0].toString() },
    } as React.ChangeEvent<HTMLInputElement>;
    onTargetPsfChange(event);
  };
  
  return (
    <Card className="border border-indigo-100">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Target {psfTypeLabel} PSF
            </label>
            <span className="text-sm text-muted-foreground">
              Current: {Math.round(currentOverallPsf)}
            </span>
          </div>
          
          <div className="flex space-x-2">
            <Input
              type="number"
              min={0}
              max={9999}
              step={0.1}
              value={targetPsf}
              onChange={onTargetPsfChange}
              className="w-24 text-right"
            />
            
            <div className="flex-1">
              <Slider
                value={[targetPsf]}
                min={minPsf}
                max={maxPsf}
                step={0.1}
                onValueChange={handleSliderChange}
              />
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="default"
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={onOptimize}
            disabled={isOptimizing}
          >
            {isOptimizing ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Optimize
              </>
            )}
          </Button>
          
          {isOptimized && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={onRevert}
              disabled={isOptimizing}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Revert
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OptimizationControls;
