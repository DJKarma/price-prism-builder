import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Settings, PlusCircle, MinusCircle } from "lucide-react";
import { toast } from "sonner";

interface PricingConfigurationProps {
  data: any[];
  onConfigurationComplete: (config: PricingConfig) => void;
}

export interface FloorRiseRule {
  startFloor: number;
  endFloor: number;
  psfIncrement: number;
}

export interface BedroomTypePricing {
  type: string;
  basePsf: number;
  targetAvgPsf: number;
}

export interface ViewPricing {
  view: string;
  psfAdjustment: number;
}

export interface PricingConfig {
  basePsf: number;
  bedroomTypePricing: Array<{
    type: string;
    basePsf: number;
    targetAvgPsf: number;
    originalBasePsf?: number;
  }>;
  viewPricing: Array<{
    view: string;
    psfAdjustment: number;
    originalPsfAdjustment?: number;
  }>;
  floorRiseRules: Array<{
    startFloor: number;
    endFloor: number;
    psfIncrement: number;
    jumpEveryFloor?: number;
    jumpIncrement?: number;
  }>;
  targetOverallPsf?: number;
  isOptimized?: boolean;
}

const PricingConfiguration: React.FC<PricingConfigurationProps> = ({
  data,
  onConfigurationComplete,
}) => {
  const [basePsf, setBasePsf] = useState<number>(1000);
  const [floorRiseRules, setFloorRiseRules] = useState<FloorRiseRule[]>([
    { startFloor: 1, endFloor: 10, psfIncrement: 10 },
  ]);
  const [bedroomTypes, setBedroomTypes] = useState<BedroomTypePricing[]>([]);
  const [viewTypes, setViewTypes] = useState<ViewPricing[]>([]);

  useEffect(() => {
    if (!data.length) return;

    const uniqueTypes = Array.from(
      new Set(
        data
          .map((item) => item.type)
          .filter((type) => type && type.trim() !== "")
      )
    ) as string[];

    setBedroomTypes(
      uniqueTypes.map((type) => ({
        type,
        basePsf: basePsf,
        targetAvgPsf: basePsf,
      }))
    );

    const uniqueViews = Array.from(
      new Set(
        data
          .map((item) => item.view)
          .filter((view) => view && view.trim() !== "")
      )
    ) as string[];

    setViewTypes(
      uniqueViews.map((view) => ({
        view,
        psfAdjustment: 0,
      }))
    );
  }, [data, basePsf]);

  const handleBasePsfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setBasePsf(value);
      setBedroomTypes(prev =>
        prev.map(item => ({
          ...item,
          basePsf: value,
          targetAvgPsf: value
        }))
      );
    }
  };

  const handleAddFloorRiseRule = () => {
    const lastRule = floorRiseRules[floorRiseRules.length - 1];
    const newStartFloor = lastRule ? lastRule.endFloor + 1 : 1;
    
    setFloorRiseRules([
      ...floorRiseRules,
      {
        startFloor: newStartFloor,
        endFloor: newStartFloor + 9,
        psfIncrement: 10,
      },
    ]);
  };

  const handleRemoveFloorRiseRule = (index: number) => {
    if (floorRiseRules.length <= 1) {
      toast.error("You must have at least one floor rise rule");
      return;
    }
    setFloorRiseRules(floorRiseRules.filter((_, i) => i !== index));
  };

  const updateFloorRiseRule = (index: number, field: keyof FloorRiseRule, value: number) => {
    const newRules = [...floorRiseRules];
    newRules[index] = { ...newRules[index], [field]: value };
    setFloorRiseRules(newRules);
  };

  const updateBedroomTypePrice = (index: number, field: keyof BedroomTypePricing, value: number) => {
    const newPricing = [...bedroomTypes];
    newPricing[index] = { ...newPricing[index], [field]: value };
    setBedroomTypes(newPricing);
  };

  const updateViewPricing = (index: number, value: number) => {
    const newViewPricing = [...viewTypes];
    newViewPricing[index] = { ...newViewPricing[index], psfAdjustment: value };
    setViewTypes(newViewPricing);
  };

  const handleSubmit = () => {
    if (basePsf <= 0) {
      toast.error("Base PSF must be greater than zero");
      return;
    }

    for (let i = 0; i < floorRiseRules.length; i++) {
      const rule = floorRiseRules[i];
      
      if (rule.startFloor > rule.endFloor) {
        toast.error(`Floor rise rule #${i+1} has start floor greater than end floor`);
        return;
      }
      
      for (let j = i + 1; j < floorRiseRules.length; j++) {
        const otherRule = floorRiseRules[j];
        
        if (
          (rule.startFloor <= otherRule.endFloor && rule.endFloor >= otherRule.startFloor) ||
          (otherRule.startFloor <= rule.endFloor && otherRule.endFloor >= rule.startFloor)
        ) {
          toast.error(`Floor rise rules #${i+1} and #${j+1} have overlapping floor ranges`);
          return;
        }
      }
    }

    onConfigurationComplete({
      basePsf,
      floorRiseRules,
      bedroomTypePricing: bedroomTypes,
      viewPricing: viewTypes,
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Pricing Configuration
        </CardTitle>
        <CardDescription>
          Set up base pricing and adjustment factors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="base-psf">Base PSF ($/sqft)</Label>
          <Input
            id="base-psf"
            type="number"
            min="0"
            value={basePsf}
            onChange={handleBasePsfChange}
            className="w-full md:w-64"
          />
          <p className="text-sm text-muted-foreground mt-1">
            This is the starting point for all price calculations
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Floor Rise PSF Rules</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddFloorRiseRule}
              className="h-8"
            >
              <PlusCircle className="h-4 w-4 mr-1" /> Add Rule
            </Button>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start Floor</TableHead>
                <TableHead>End Floor</TableHead>
                <TableHead>PSF Increment</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {floorRiseRules.map((rule, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={rule.startFloor}
                      onChange={(e) =>
                        updateFloorRiseRule(
                          index,
                          "startFloor",
                          parseInt(e.target.value)
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={rule.startFloor}
                      value={rule.endFloor}
                      onChange={(e) =>
                        updateFloorRiseRule(
                          index,
                          "endFloor",
                          parseInt(e.target.value)
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={rule.psfIncrement}
                      onChange={(e) =>
                        updateFloorRiseRule(
                          index,
                          "psfIncrement",
                          parseFloat(e.target.value)
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFloorRiseRule(index)}
                    >
                      <MinusCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {bedroomTypes.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3">Bedroom Type Pricing</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bedroom Type</TableHead>
                  <TableHead>Base PSF</TableHead>
                  <TableHead>Target Average PSF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bedroomTypes.map((type, index) => (
                  <TableRow key={index}>
                    <TableCell>{type.type}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={type.basePsf}
                        onChange={(e) =>
                          updateBedroomTypePrice(
                            index,
                            "basePsf",
                            parseFloat(e.target.value)
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={type.targetAvgPsf}
                        onChange={(e) =>
                          updateBedroomTypePrice(
                            index,
                            "targetAvgPsf",
                            parseFloat(e.target.value)
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {viewTypes.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3">View Pricing Adjustments</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>View Type</TableHead>
                  <TableHead>PSF Adjustment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewTypes.map((view, index) => (
                  <TableRow key={index}>
                    <TableCell>{view.view}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={view.psfAdjustment}
                        onChange={(e) =>
                          updateViewPricing(
                            index,
                            parseFloat(e.target.value)
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSubmit} className="w-full sm:w-auto">
          Apply Configuration
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PricingConfiguration;
