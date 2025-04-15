import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PlusCircle, MinusCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { calculateFloorPremium } from "@/utils/psfOptimizer";

export interface PremiumEditorProps {
  pricingConfig: any;
  onPricingConfigChange: (newConfig: any) => void;
}

const PremiumEditor: React.FC<PremiumEditorProps> = ({ 
  pricingConfig, 
  onPricingConfigChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState(pricingConfig);
  
  useEffect(() => {
    setLocalConfig(pricingConfig);
  }, [pricingConfig]);
  
  const handleBasePsfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setLocalConfig({
      ...localConfig,
      basePsf: value
    });
  };
  
  const handleBedroomPsfChange = (index: number, field: string, value: number) => {
    const updatedBedrooms = [...localConfig.bedroomTypePricing];
    updatedBedrooms[index] = {
      ...updatedBedrooms[index],
      [field]: value
    };
    
    setLocalConfig({
      ...localConfig,
      bedroomTypePricing: updatedBedrooms
    });
  };
  
  const handleViewPsfChange = (index: number, value: number) => {
    const updatedViews = [...localConfig.viewPricing];
    updatedViews[index] = {
      ...updatedViews[index],
      psfAdjustment: value
    };
    
    setLocalConfig({
      ...localConfig,
      viewPricing: updatedViews
    });
  };
  
  const handleFloorRuleChange = (index: number, field: string, value: number | null) => {
    const updatedRules = [...localConfig.floorRiseRules];
    updatedRules[index] = {
      ...updatedRules[index],
      [field]: value
    };
    
    setLocalConfig({
      ...localConfig,
      floorRiseRules: updatedRules
    });
  };
  
  const addFloorRule = () => {
    let maxEndFloor = 0;
    localConfig.floorRiseRules.forEach((rule: any) => {
      const endFloor = rule.endFloor === null ? (localConfig.maxFloor || 99) : rule.endFloor;
      if (endFloor > maxEndFloor) {
        maxEndFloor = endFloor;
      }
    });
    
    const newStartFloor = maxEndFloor + 1;
    const newEndFloor = null;
    
    setLocalConfig({
      ...localConfig,
      floorRiseRules: [
        ...localConfig.floorRiseRules,
        {
          startFloor: newStartFloor,
          endFloor: newEndFloor,
          psfIncrement: 0,
          jumpEveryFloor: 0,
          jumpIncrement: 0
        }
      ]
    });
  };
  
  const removeFloorRule = (index: number) => {
    const updatedRules = [...localConfig.floorRiseRules];
    updatedRules.splice(index, 1);
    
    setLocalConfig({
      ...localConfig,
      floorRiseRules: updatedRules
    });
  };
  
  const applyChanges = () => {
    const processedConfig = {
      ...localConfig,
      floorRiseRules: localConfig.floorRiseRules.map((rule: any) => ({
        ...rule,
        endFloor: rule.endFloor === null ? (localConfig.maxFloor || 99) : rule.endFloor
      }))
    };
    
    onPricingConfigChange(processedConfig);
    toast({
      title: "Changes Applied",
      description: "Premium values have been updated and prices recalculated."
    });
  };
  
  const calculateCumulativePsfForFloor = (floor: number) => {
    const processedRules = localConfig.floorRiseRules.map((rule: any) => ({
      ...rule,
      endFloor: rule.endFloor === null ? (localConfig.maxFloor || 99) : rule.endFloor
    }));
    
    const psfValue = calculateFloorPremium(floor, processedRules);
    
    let isJumpFloor = false;
    let appliedRule = null;
    
    const applicableRule = processedRules.find(
      (r: any) => floor >= r.startFloor && floor <= r.endFloor
    );
    
    if (applicableRule && applicableRule.jumpEveryFloor && applicableRule.jumpIncrement) {
      const floorsFromStart = floor - applicableRule.startFloor;
      isJumpFloor = floorsFromStart > 0 && 
                   floorsFromStart % applicableRule.jumpEveryFloor === 0;
      
      if (isJumpFloor) {
        appliedRule = applicableRule;
      }
    }
    
    return {
      psfValue,
      isJumpFloor,
      appliedRule
    };
  };
  
  const previewMaxFloor = localConfig.maxFloor || 50;
  
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full mb-4 border rounded-lg"
    >
      <CollapsibleTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full flex justify-between items-center p-4"
        >
          <span className="font-medium">Edit Premium PSF Values</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Card>
            <CardHeader>
              <CardTitle>Base PSF</CardTitle>
              <CardDescription>
                The baseline PSF value used for all units
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Label htmlFor="basePsf">Base PSF:</Label>
                <Input
                  id="basePsf"
                  type="number"
                  min="0"
                  step="0.01"
                  value={localConfig.basePsf}
                  onChange={handleBasePsfChange}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Bedroom Type Pricing</CardTitle>
              <CardDescription>
                Base PSF values by bedroom type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Base PSF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localConfig.bedroomTypePricing.map((type: any, index: number) => (
                    <TableRow key={type.type}>
                      <TableCell>{type.type}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={type.basePsf}
                          onChange={(e) => 
                            handleBedroomPsfChange(
                              index, 
                              "basePsf", 
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>View Pricing</CardTitle>
            <CardDescription>
              PSF adjustments by view type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>View</TableHead>
                  <TableHead>PSF Adjustment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localConfig.viewPricing.map((view: any, index: number) => (
                  <TableRow key={view.view}>
                    <TableCell>{view.view}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={view.psfAdjustment}
                        onChange={(e) => 
                          handleViewPsfChange(
                            index, 
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card className="mb-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Floor Rise Rules</CardTitle>
              <CardDescription>
                PSF increment by floor range with jump increments
              </CardDescription>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={addFloorRule}
              className="flex items-center gap-1"
            >
              <PlusCircle className="h-4 w-4" /> Add Rule
            </Button>
          </CardHeader>
          <CardContent>
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
                {localConfig.floorRiseRules.map((rule: any, index: number) => (
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
                        placeholder={`${localConfig.maxFloor || 99} (Default)`}
                        onChange={(e) => {
                          const value = e.target.value.trim() === '' ? null : parseInt(e.target.value) || rule.startFloor;
                          handleFloorRuleChange(
                            index, 
                            "endFloor", 
                            value
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="5"
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
                        onChange={(e) => 
                          handleFloorRuleChange(
                            index, 
                            "jumpEveryFloor", 
                            parseInt(e.target.value) || 0
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={rule.jumpIncrement || ''}
                        onChange={(e) => 
                          handleFloorRuleChange(
                            index, 
                            "jumpIncrement", 
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFloorRule(index)}
                        disabled={localConfig.floorRiseRules.length <= 1}
                      >
                        <MinusCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2">Floor PSF Preview (Cumulative)</h3>
              <div className="h-[250px] overflow-y-auto border rounded p-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Floor</TableHead>
                      <TableHead>PSF Adjustment</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: previewMaxFloor }, (_, i) => i + 1).map((floor) => {
                      const { psfValue, isJumpFloor, appliedRule } = calculateCumulativePsfForFloor(floor);
                      
                      return (
                        <TableRow key={floor} className={isJumpFloor ? "bg-green-50" : ""}>
                          <TableCell>{floor}</TableCell>
                          <TableCell>{psfValue.toFixed(2)}</TableCell>
                          <TableCell>
                            {isJumpFloor ? 
                              `Jump floor (+${appliedRule?.jumpIncrement})` : ""}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end mt-4">
          <Button 
            onClick={applyChanges}
            className="w-full md:w-auto"
          >
            Apply Premium Changes
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default PremiumEditor;
