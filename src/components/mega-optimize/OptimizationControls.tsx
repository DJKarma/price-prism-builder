
import React, { useState, useEffect } from "react";
import { Wand2, RotateCcw, Target, Edit } from "lucide-react";
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
  
  // Auto-enable input when component mounts
  useEffect(() => {
    setShowTargetInput(true);
  }, []);
  
  // Calculate the difference between target and current PSF
  const psfDifference = targetPsf - currentOverallPsf;
  const psfDifferencePercentage = (psfDifference / currentOverallPsf) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div className="space-y-2">
        <Label htmlFor="current-psf">Current Overall PSF</Label>
        <div className="flex items-center gap-2">
          <Input
            id="current-psf"
            value={`$${currentOverallPsf.toFixed(2)}`}
            disabled
            className="bg-muted font-medium"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="target-psf" className="flex justify-between">
          <span>Target Overall PSF</span>
          {psfDifference !== 0 && (
            <span className={`text-xs font-medium ${psfDifference > 0 ? 'text-green-600' : 'text-amber-600'}`}>
              {psfDifference > 0 ? '+' : ''}{psfDifference.toFixed(2)} ({psfDifferencePercentage.toFixed(1)}%)
            </span>
          )}
        </Label>
        <div className="flex items-center gap-2">
          {showTargetInput ? (
            <div className="relative w-full">
              <Input
                id="target-psf"
                type="number"
                min="0"
                step="0.01"
                value={targetPsf}
                onChange={onTargetPsfChange}
                className="pl-7 pr-4"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-muted-foreground">
                $
              </div>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowTargetInput(true)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Set Target PSF
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
                Mega Optimize
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={onRevert}
            disabled={!isOptimized}
            className={!isOptimized ? "opacity-50" : ""}
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
