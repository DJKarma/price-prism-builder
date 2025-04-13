
import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, MinusCircle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface PricingConfig {
  basePsf: number;
  targetOverallPsf: number;
  bedroomTypePricing: {
    type: string;
    basePsf: number;
    targetAvgPsf: number;
  }[];
  viewPricing: {
    view: string;
    psfAdjustment: number;
  }[];
  floorRiseRules: {
    startFloor: number;
    endFloor: number | null;
    psfIncrement: number;
    jumpEveryFloor?: number;
    jumpIncrement?: number;
  }[];
  maxFloor?: number;
}

const PricingConfiguration = ({ 
  data, 
  onConfigurationComplete,
  maxFloor = 50
}) => {
  // Extract unique bedroom types and views
  const bedroomTypes = [...new Set(data.map(unit => unit.bedrooms))].sort();
  const viewTypes = [...new Set(data.map(unit => unit.view))].sort();
  
  // Calculate average area by bedroom type for target PSF calculations
  const bedroomAreaAverages = bedroomTypes.reduce((acc, type) => {
    const unitsOfType = data.filter(unit => unit.bedrooms === type);
    const totalArea = unitsOfType.reduce((sum, unit) => sum + parseFloat(unit.area), 0);
    const avgArea = totalArea / unitsOfType.length;
    
    return {
      ...acc,
      [type]: avgArea
    };
  }, {});
  
  // Initialize pricing state
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>({
    basePsf: 800,
    targetOverallPsf: 1000,
    bedroomTypePricing: bedroomTypes.map(type => ({
      type,
      basePsf: 800,
      targetAvgPsf: 1000
    })),
    viewPricing: viewTypes.map(view => ({
      view,
      psfAdjustment: 0
    })),
    floorRiseRules: [
      {
        startFloor: 1,
        endFloor: null,
        psfIncrement: 5,
        jumpEveryFloor: 5,
        jumpIncrement: 20
      }
    ]
  });
  
  // Update base PSF for all bedroom types
  const handleBasePsfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBasePsf = parseFloat(e.target.value);
    if (isNaN(newBasePsf)) return;
    
    setPricingConfig({
      ...pricingConfig,
      basePsf: newBasePsf,
      bedroomTypePricing: pricingConfig.bedroomTypePricing.map(type => ({
        ...type,
        basePsf: newBasePsf
      }))
    });
  };

  // Update overall target PSF
  const handleTargetOverallPsfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTargetPsf = parseFloat(e.target.value);
    if (isNaN(newTargetPsf)) return;
    
    setPricingConfig({
      ...pricingConfig,
      targetOverallPsf: newTargetPsf
    });
  };
  
  // Handle bedroom type pricing change
  const handleBedroomPsfChange = (index: number, field: string, value: number) => {
    const updatedPricing = [...pricingConfig.bedroomTypePricing];
    updatedPricing[index] = {
      ...updatedPricing[index],
      [field]: value
    };
    
    setPricingConfig({
      ...pricingConfig,
      bedroomTypePricing: updatedPricing
    });
  };
  
  // Handle view pricing change
  const handleViewPsfChange = (index: number, value: number) => {
    const updatedPricing = [...pricingConfig.viewPricing];
    updatedPricing[index] = {
      ...updatedPricing[index],
      psfAdjustment: value
    };
    
    setPricingConfig({
      ...pricingConfig,
      viewPricing: updatedPricing
    });
  };
  
  // Handle floor rule changes
  const handleFloorRuleChange = (index: number, field: string, value: any) => {
    const updatedRules = [...pricingConfig.floorRiseRules];
    updatedRules[index] = {
      ...updatedRules[index],
      [field]: value
    };
    
    setPricingConfig({
      ...pricingConfig,
      floorRiseRules: updatedRules
    });
  };
  
  // Add a new floor rule
  const addFloorRule = () => {
    // Determine the start floor for the new rule (one after the end of the last rule)
    let startFloor = 1;
    if (pricingConfig.floorRiseRules.length > 0) {
      const lastRule = pricingConfig.floorRiseRules[pricingConfig.floorRiseRules.length - 1];
      startFloor = (lastRule.endFloor || maxFloor) + 1;
    }
    
    setPricingConfig({
      ...pricingConfig,
      floorRiseRules: [
        ...pricingConfig.floorRiseRules,
        {
          startFloor,
          endFloor: null,
          psfIncrement: 5,
          jumpEveryFloor: 5,
          jumpIncrement: 20
        }
      ]
    });
  };
  
  // Remove a floor rule
  const removeFloorRule = (index: number) => {
    const updatedRules = [...pricingConfig.floorRiseRules];
    updatedRules.splice(index, 1);
    
    setPricingConfig({
      ...pricingConfig,
      floorRiseRules: updatedRules
    });
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Add maxFloor to the configuration
    const configWithMaxFloor = {
      ...pricingConfig,
      maxFloor
    };
    
    onConfigurationComplete(configWithMaxFloor);
  };
  
  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Configure Pricing Parameters</CardTitle>
            <CardDescription>
              Set base PSF, bedroom type premiums, view adjustments, and floor rise rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Base PSF and Overall Target PSF Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="basePsf">Base PSF for All Units</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="basePsf"
                    type="number"
                    min="0"
                    step="10"
                    value={pricingConfig.basePsf}
                    onChange={handleBasePsfChange}
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Info className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The starting PSF value for all unit types.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <div className="pt-1">
                  <Slider
                    value={[pricingConfig.basePsf]}
                    min={500}
                    max={2000}
                    step={10}
                    onValueChange={(value) => {
                      handleBasePsfChange({ target: { value: value[0].toString() } } as React.ChangeEvent<HTMLInputElement>);
                    }}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>$500</span>
                    <span>$2,000</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="targetOverallPsf">Target Overall Average PSF</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="targetOverallPsf"
                    type="number"
                    min="0"
                    step="10"
                    value={pricingConfig.targetOverallPsf}
                    onChange={handleTargetOverallPsfChange}
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Info className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The target overall average PSF for all units. This will be used for the Mega Optimize feature in the simulation.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <div className="pt-1">
                  <Slider
                    value={[pricingConfig.targetOverallPsf]}
                    min={500}
                    max={2000}
                    step={10}
                    onValueChange={(value) => {
                      handleTargetOverallPsfChange({ target: { value: value[0].toString() } } as React.ChangeEvent<HTMLInputElement>);
                    }}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>$500</span>
                    <span>$2,000</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bedroom Type Pricing */}
            <div>
              <h3 className="text-lg font-medium mb-3">Bedroom Type Pricing</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bedroom Type</TableHead>
                    <TableHead>Base PSF</TableHead>
                    <TableHead>Target Avg PSF</TableHead>
                    <TableHead>Avg Area</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricingConfig.bedroomTypePricing.map((type, index) => (
                    <TableRow key={type.type}>
                      <TableCell>{type.type}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="10"
                            value={type.basePsf}
                            onChange={(e) => 
                              handleBedroomPsfChange(
                                index, 
                                "basePsf", 
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="10"
                            value={type.targetAvgPsf}
                            onChange={(e) => 
                              handleBedroomPsfChange(
                                index, 
                                "targetAvgPsf", 
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {bedroomAreaAverages[type.type] 
                          ? Math.round(bedroomAreaAverages[type.type]) 
                          : "N/A"} sqft
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* View Pricing */}
            <div>
              <h3 className="text-lg font-medium mb-3">View PSF Adjustments</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>View</TableHead>
                    <TableHead>PSF Adjustment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricingConfig.viewPricing.map((view, index) => (
                    <TableRow key={view.view}>
                      <TableCell>{view.view}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="10"
                            value={view.psfAdjustment}
                            onChange={(e) => 
                              handleViewPsfChange(
                                index, 
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Floor Rise Rules */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium">Floor Rise Rules</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={addFloorRule}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>
              
              <div className="rounded-md border">
                <ScrollArea className="max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Start Floor</TableHead>
                        <TableHead>End Floor</TableHead>
                        <TableHead>PSF Increment</TableHead>
                        <TableHead>Jump Every</TableHead>
                        <TableHead>Jump Increment</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pricingConfig.floorRiseRules.map((rule, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={rule.startFloor}
                              onChange={(e) => 
                                handleFloorRuleChange(
                                  index, 
                                  "startFloor", 
                                  parseInt(e.target.value) || 1
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={rule.startFloor}
                              value={rule.endFloor === null ? '' : rule.endFloor}
                              placeholder="(Max)"
                              onChange={(e) => {
                                const value = e.target.value.trim() === '' 
                                  ? null 
                                  : parseInt(e.target.value);
                                handleFloorRuleChange(index, "endFloor", value);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="1"
                              value={rule.psfIncrement}
                              onChange={(e) => 
                                handleFloorRuleChange(
                                  index, 
                                  "psfIncrement", 
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={rule.jumpEveryFloor || ''}
                              placeholder="Optional"
                              onChange={(e) => {
                                const value = e.target.value.trim() === '' 
                                  ? undefined 
                                  : parseInt(e.target.value);
                                handleFloorRuleChange(index, "jumpEveryFloor", value);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="1"
                              value={rule.jumpIncrement || ''}
                              placeholder="Optional"
                              onChange={(e) => {
                                const value = e.target.value.trim() === '' 
                                  ? undefined 
                                  : parseFloat(e.target.value);
                                handleFloorRuleChange(index, "jumpIncrement", value);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFloorRule(index)}
                              disabled={pricingConfig.floorRiseRules.length <= 1}
                            >
                              <MinusCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Leave end floor empty to apply rule to all remaining floors. Jump settings are optional.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              Complete Configuration & Continue to Simulation
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default PricingConfiguration;
