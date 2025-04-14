import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PricingConfigurationProps {
  data: any[];
  onConfigurationComplete: (config: PricingConfig) => void;
  maxFloor: number;
  additionalCategories: any[];
}

export interface PricingConfig {
  basePsf: number;
  bedroomTypePricing: BedroomTypePricing[];
  viewPricing: ViewPricing[];
  floorRiseRules: FloorRiseRule[];
  additionalCategoryPricing: AdditionalCategoryPricing[];
  targetOverallPsf: number;
  optimizedTypes: string[];
  maxFloor: number;
}

interface BedroomTypePricing {
  type: string;
  basePsf: number;
  targetAvgPsf: number;
  isOptimized?: boolean;
}

interface ViewPricing {
  view: string;
  psfAdjustment: number;
}

interface FloorRiseRule {
  startFloor: number;
  endFloor: number | null;
  psfIncrement: number;
  jumpEveryFloor?: number;
  jumpIncrement?: number;
}

interface AdditionalCategoryPricing {
  column: string;
  category: string;
  psfAdjustment: number;
}

const PricingConfiguration: React.FC<PricingConfigurationProps> = ({
  data,
  onConfigurationComplete,
  maxFloor,
  additionalCategories,
}) => {
  const [basePsf, setBasePsf] = useState<number>(650);
  const [bedroomTypePricing, setBedroomTypePricing] = useState<BedroomTypePricing[]>([]);
  const [viewPricing, setViewPricing] = useState<ViewPricing[]>([]);
  const [floorRiseRules, setFloorRiseRules] = useState<FloorRiseRule[]>([
    { startFloor: 1, endFloor: 10, psfIncrement: 5 },
  ]);
  const [additionalCategoryPricing, setAdditionalCategoryPricing] = useState<AdditionalCategoryPricing[]>([]);
  const [targetOverallPsf, setTargetOverallPsf] = useState<number>(0);
  const [optimizedTypes, setOptimizedTypes] = useState<string[]>([]);

  useEffect(() => {
    if (data.length > 0) {
      // Extract unique bedroom types from the data
      const uniqueBedroomTypes = [...new Set(data.map((item) => item.type))];

      // Initialize bedroom type pricing with default values
      const initialBedroomTypePricing = uniqueBedroomTypes.map((type) => ({
        type,
        basePsf: basePsf,
        targetAvgPsf: basePsf,
        isOptimized: false,
      }));
      setBedroomTypePricing(initialBedroomTypePricing);

      // Extract unique views from the data
      const uniqueViews = [...new Set(data.map((item) => item.view))];

      // Initialize view pricing with default values
      const initialViewPricing = uniqueViews.map((view) => ({
        view,
        psfAdjustment: 0,
      }));
      setViewPricing(initialViewPricing);
    }
  }, [data, basePsf]);

  const handleBasePsfChange = (index: number, value: number) => {
    const updatedBedroomTypePricing = [...bedroomTypePricing];
    updatedBedroomTypePricing[index] = {
      ...updatedBedroomTypePricing[index],
      basePsf: value,
    };
    setBedroomTypePricing(updatedBedroomTypePricing);
  };

  const handleTargetAvgPsfChange = (index: number, value: number) => {
    const updatedBedroomTypePricing = [...bedroomTypePricing];
    updatedBedroomTypePricing[index] = {
      ...updatedBedroomTypePricing[index],
      targetAvgPsf: value,
    };
    setBedroomTypePricing(updatedBedroomTypePricing);
  };

  const handleViewPsfChange = (index: number, value: number) => {
    const updatedViewPricing = [...viewPricing];
    updatedViewPricing[index] = {
      ...updatedViewPricing[index],
      psfAdjustment: value,
    };
    setViewPricing(updatedViewPricing);
  };

  const handleFloorRuleChange = (
    index: number,
    field: string,
    value: number | null
  ) => {
    const updatedFloorRiseRules = [...floorRiseRules];
    updatedFloorRiseRules[index] = {
      ...updatedFloorRiseRules[index],
      [field]: value,
    };
    setFloorRiseRules(updatedFloorRiseRules);
  };

  const addFloorRule = () => {
    setFloorRiseRules([
      ...floorRiseRules,
      { startFloor: 1, endFloor: 10, psfIncrement: 5 },
    ]);
  };

  const removeFloorRule = (index: number) => {
    const updatedFloorRiseRules = [...floorRiseRules];
    updatedFloorRiseRules.splice(index, 1);
    setFloorRiseRules(updatedFloorRiseRules);
  };

  const handleAdditionalCategoryChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const updatedCategoryPricing = [...additionalCategoryPricing];
    updatedCategoryPricing[index] = {
      ...updatedCategoryPricing[index],
      [field]: value,
    };
    setAdditionalCategoryPricing(updatedCategoryPricing);
  };

  const addAdditionalCategory = () => {
    setAdditionalCategoryPricing([
      ...additionalCategoryPricing,
      { column: "", category: "", psfAdjustment: 0 },
    ]);
  };

  const removeAdditionalCategory = (index: number) => {
    const updatedCategoryPricing = [...additionalCategoryPricing];
    updatedCategoryPricing.splice(index, 1);
    setAdditionalCategoryPricing(updatedCategoryPricing);
  };

  const handleSubmit = () => {
    // Validate that all bedroom types have a targetAvgPsf
    if (bedroomTypePricing.some((type) => type.targetAvgPsf === undefined)) {
      toast.error("Please set a Target Avg PSF for all bedroom types.");
      return;
    }

    // Validate that all floor rise rules have valid values
    if (floorRiseRules.some((rule) => rule.startFloor === undefined || rule.psfIncrement === undefined)) {
      toast.error("Please set valid values for all floor rise rules.");
      return;
    }

    // Validate that all additional category pricing rules have valid values
    if (additionalCategoryPricing.some((rule) => rule.column === "" || rule.category === "" || rule.psfAdjustment === undefined)) {
      toast.error("Please set valid values for all additional category pricing rules.");
      return;
    }

    const config: PricingConfig = {
      basePsf,
      bedroomTypePricing,
      viewPricing,
      floorRiseRules,
      additionalCategoryPricing,
      targetOverallPsf,
      optimizedTypes,
      maxFloor: maxFloor
    };
    onConfigurationComplete(config);
    toast.success("Pricing configuration saved successfully!");
  };

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Base Pricing Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {bedroomTypePricing.map((typeConfig, index) => (
              <Card 
                key={typeConfig.type} 
                className="hover:shadow-sm transition-shadow"
              >
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{typeConfig.type}</Badge>
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm">Target Avg PSF</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={typeConfig.targetAvgPsf}
                        onChange={(e) => handleTargetAvgPsfChange(index, parseFloat(e.target.value))}
                        className="w-24 h-8 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Base PSF</Label>
                    <div className="flex items-center space-x-4">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={typeConfig.basePsf}
                        onChange={(e) => handleBasePsfChange(index, parseFloat(e.target.value))}
                        className="flex-1 h-8 text-sm"
                      />
                      <Badge variant="outline" className="px-2 py-1">
                        Current: {typeConfig.basePsf.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Floor Rise Rules Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Floor Rise Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {floorRiseRules.map((rule, index) => (
                <div 
                  key={index} 
                  className="grid grid-cols-4 gap-4 items-center"
                >
                  <div>
                    <Label>Start Floor</Label>
                    <Input
                      type="number"
                      value={rule.startFloor}
                      onChange={(e) => handleFloorRuleChange(index, 'startFloor', parseInt(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label>End Floor</Label>
                    <Input
                      type="number"
                      value={rule.endFloor || ''}
                      onChange={(e) => handleFloorRuleChange(index, 'endFloor', e.target.value ? parseInt(e.target.value) : null)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label>PSF Increment</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={rule.psfIncrement}
                      onChange={(e) => handleFloorRuleChange(index, 'psfIncrement', parseFloat(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => removeFloorRule(index)}
                      className="mt-6"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                onClick={addFloorRule}
                className="w-full"
              >
                Add Floor Rule
              </Button>
            </CardContent>
          </Card>

          {/* View Based Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">View Based Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {viewPricing.map((viewConfig, index) => (
                <div key={viewConfig.view} className="grid grid-cols-3 gap-4 items-center">
                  <div>
                    <Label>{viewConfig.view}</Label>
                  </div>
                  <div>
                    <Input
                      type="number"
                      step="0.01"
                      value={viewConfig.psfAdjustment}
                      onChange={(e) => handleViewPsfChange(index, parseFloat(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Badge variant="outline" className="px-2 py-1">
                      Current: {viewConfig.psfAdjustment.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Additional Categories Pricing */}
          {additionalCategories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Categories Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {additionalCategoryPricing.map((categoryConfig, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 items-center">
                    <div>
                      <Label>Column</Label>
                      <Input
                        type="text"
                        value={categoryConfig.column}
                        onChange={(e) => handleAdditionalCategoryChange(index, 'column', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Input
                        type="text"
                        value={categoryConfig.category}
                        onChange={(e) => handleAdditionalCategoryChange(index, 'category', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label>PSF Adjustment</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={categoryConfig.psfAdjustment}
                        onChange={(e) => handleAdditionalCategoryChange(index, 'psfAdjustment', parseFloat(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeAdditionalCategory(index)}
                        className="mt-6"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={addAdditionalCategory}
                  className="w-full"
                >
                  Add Additional Category
                </Button>
              </CardContent>
            </Card>
          )}

          <Button onClick={handleSubmit}>Submit Configuration</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingConfiguration;
