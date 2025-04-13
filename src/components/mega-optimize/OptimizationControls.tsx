
import React, { useState } from "react";
import { Wand2, RotateCcw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OptimizationControlsProps {
  currentOverallPsf: number;
  targetPsf: number;
  isOptimizing: boolean;
  isOptimized: boolean;
  onTargetPsfChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOptimize: () => void;
  onRevert: () => void;
}

const OptimizationControls: React.FC<OptimizationControlsProps> = ({
  currentOverallPsf,
  targetPsf,
  isOptimizing,
  isOptimized,
  onTargetPsfChange,
  onOptimize,
  onRevert,
}) => {
  const [showTargetInput, setShowTargetInput] = useState(false);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div className="space-y-2">
        <Label htmlFor="current-psf">Current Overall PSF</Label>
        <div className="flex items-center gap-2">
          <Input
            id="current-psf"
            value={currentOverallPsf.toFixed(2)}
            disabled
            className="bg-muted"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="target-psf">Target Overall PSF</Label>
        <div className="flex items-center gap-2">
          {showTargetInput ? (
            <Input
              id="target-psf"
              type="number"
              min="0"
              step="0.01"
              value={targetPsf}
              onChange={onTargetPsfChange}
              className="flex-1"
            />
          ) : (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowTargetInput(true)}
            >
              <Target className="mr-2 h-4 w-4" />
              Set Target PSF ({targetPsf.toFixed(2)})
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex items-end">
        <div className="flex gap-2 w-full">
          <Button
            onClick={onOptimize}
            disabled={isOptimizing}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
          >
            {isOptimizing ? (
              "Optimizing..."
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Mega Optimize Overall PSF
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={onRevert}
            disabled={!isOptimized}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Revert
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OptimizationControls;
