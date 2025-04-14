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
import { Settings, PlusCircle, MinusCircle, Ruler, Building2, Eye, Tag } from "lucide-react";
import { toast } from "sonner";

interface PricingConfigurationProps {
  data: any[];
  onConfigurationComplete: (config: PricingConfig) => void;
  maxFloor?: number;
  additionalCategories?: Array<{column: string, categories: string[]}>;
}

export interface FloorRiseRule {
  startFloor: number;
  endFloor: number | null;
  psfIncrement: number;
  jumpEveryFloor?: number;
  jumpIncrement?: number;
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

export interface AdditionalCategoryPricing {
  column: string;
  category: string;
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
    endFloor: number | null;
    psfIncrement: number;
    jumpEveryFloor?: number;
    jumpIncrement?: number;
  }>;
  additionalCategoryPricing?: AdditionalCategoryPricing[];
  targetOverallPsf?: number;
  isOptimized?: boolean;
  maxFloor?: number;
}

const PricingConfiguration: React.FC<PricingConfigurationProps> = ({
  data,
  onConfigurationComplete,
  maxFloor = 50,
  additionalCategories = []
}) => {
  const [basePsf, setBasePsf] = useState<number>(1000);
  const [floorRiseRules, setFloorRiseRules] = useState<FloorRiseRule[]>([
    { startFloor: 1, endFloor: maxFloor, psfIncrement: 10, jumpEveryFloor: 10, jumpIncrement: 20 },
  ]);
  const [bedroomTypes, setBedroomTypes] = useState<BedroomTypePricing[]>([]);
  const [viewTypes, setViewTypes] = useState<ViewPricing[]>([]);
  const [additionalCategoryPricing, setAdditionalCategoryPricing] = useState<AdditionalCategoryPricing[]>([]);

  useEffect(() => {
    if (floorRiseRules.length > 0) {
      const updatedRules = [...floorRiseRules];
      if (updatedRules[updatedRules.length - 1].endFloor === null) {
        updatedRules[updatedRules.length - 1].endFloor = maxFloor;
        setFloorRiseRules(updatedRules);
      }
    }
  }, [maxFloor]);

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

    const initialAdditionalCategories: AdditionalCategoryPricing[] = [];
    
    if (additionalCategories && additionalCategories.length > 0) {
      additionalCategories.forEach(category => {
        if (category.categories && category.categories.length > 0) {
          category.categories.forEach(value => {
            initialAdditionalCategories.push({
              column: category.column,
              category: value,
              psfAdjustment: 0
            });
          });
        }
      });
    }
    
    setAdditionalCategoryPricing(initialAdditionalCategories);
    
  }, [data, basePsf, additionalCategories]);

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
    const newStartFloor = lastRule ? 
      (lastRule.endFloor === null ? maxFloor : lastRule.endFloor) + 1 : 1;
    
    setFloorRiseRules([
      ...floorRiseRules,
      {
        startFloor: newStartFloor,
        endFloor: maxFloor,
        psfIncrement: 10,
        jumpEveryFloor: 10,
        jumpIncrement: 20,
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

  const updateFloorRiseRule = (index: number, field: keyof FloorRiseRule, value: number | null) => {
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

  const updateAdditionalCategoryPricing = (index: number, value: number) => {
    const newCategoryPricing = [...additionalCategoryPricing];
    newCategoryPricing[index] = { ...newCategoryPricing[index], psfAdjustment: value };
    setAdditionalCategoryPricing(newCategoryPricing);
  };

  const handleSubmit = () => {
    if (basePsf <= 0) {
      toast.error("Base PSF must be greater than zero");
      return;
    }

    for (let i = 0; i < floorRiseRules.length; i++) {
      const rule = floorRiseRules[i];
      
      if (rule.endFloor !== null && rule.startFloor > rule.endFloor) {
        toast.error(`Floor rise rule #${i+1} has start floor greater than end floor`);
        return;
      }
      
      for (let j = i + 1; j < floorRiseRules.length; j++) {
        const otherRule = floorRiseRules[j];
        const ruleEnd = rule.endFloor === null ? maxFloor : rule.endFloor;
        const otherRuleEnd = otherRule.endFloor === null ? maxFloor : otherRule.endFloor;
        
        if (
          (rule.startFloor <= otherRuleEnd && ruleEnd >= otherRule.startFloor) ||
          (otherRule.startFloor <= ruleEnd && otherRuleEnd >= rule.startFloor)
        ) {
          toast.error(`Floor rise rules #${i+1} and #${j+1} have overlapping floor ranges`);
          return;
        }
      }
    }

    const processedRules = floorRiseRules.map(rule => ({
      ...rule,
      endFloor: rule.endFloor === null ? maxFloor : rule.endFloor
    }));

    onConfigurationComplete({
      basePsf,
      floorRiseRules: processedRules,
      bedroomTypePricing: bedroomTypes,
      viewPricing: viewTypes,
      additionalCategoryPricing: additionalCategoryPricing,
      maxFloor,
    });
  };

  const groupedAdditionalCategories = additionalCategoryPricing.reduce((acc, item) => {
    if (!acc[item.column]) {
      acc[item.column] = [];
    }
    acc[item.column].push(item);
    return acc;
  }, {} as Record<string, AdditionalCategoryPricing[]>);

  return (
    <Card className="w-full border-2 border-indigo-100 shadow-md">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
        <CardTitle className="flex items-center gap-2 text-xl text-indigo-800">
          <Settings className="h-5 w-5 text-indigo-600" />
          Pricing Configuration
        </CardTitle>
        <CardDescription className="text-indigo-600">
          Set up base pricing and adjustment factors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 p-6">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-indigo-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-indigo-700 flex items-center">
              <Ruler className="h-5 w-5 mr-2 text-indigo-600" />
              Floor Rise PSF Rules
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddFloorRiseRule}
              className="h-9 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-700"
            >
              <PlusCircle className="h-4 w-4 mr-2 text-indigo-600" /> Add Rule
            </Button>
          </div>
          
          <div className="rounded-lg border border-indigo-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-indigo-50">
                <TableRow>
                  <TableHead className="text-indigo-700">Start Floor</TableHead>
                  <TableHead className="text-indigo-700">End Floor</TableHead>
                  <TableHead className="text-indigo-700">PSF Increment</TableHead>
                  <TableHead className="text-indigo-700">Jump Every</TableHead>
                  <TableHead className="text-indigo-700">Jump PSF</TableHead>
                  <TableHead className="w-24 text-indigo-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {floorRiseRules.map((rule, index) => (
                  <TableRow key={index} className={index % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={rule.startFloor}
                        onChange={(e) =>
                          updateFloorRiseRule(
                            index,
                            "startFloor",
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="border-indigo-200"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={rule.startFloor}
                        value={rule.endFloor === null ? '' : rule.endFloor}
                        placeholder={`${maxFloor} (Default)`}
                        onChange={(e) => {
                          const value = e.target.value.trim() === '' ? null : parseInt(e.target.value);
                          updateFloorRiseRule(
                            index,
                            "endFloor",
                            value
                          );
                        }}
                        className="border-indigo-200"
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
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="border-indigo-200"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={rule.jumpEveryFloor || 10}
                        onChange={(e) =>
                          updateFloorRiseRule(
                            index,
                            "jumpEveryFloor",
                            parseInt(e.target.value) || 10
                          )
                        }
                        placeholder="e.g., 10"
                        className="border-indigo-200"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={rule.jumpIncrement || 20}
                        onChange={(e) =>
                          updateFloorRiseRule(
                            index,
                            "jumpIncrement",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="e.g., 20"
                        className="border-indigo-200"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFloorRiseRule(index)}
                        className="hover:bg-red-50 hover:text-red-500"
                      >
                        <MinusCircle className="h-4 w-4 text-red-400 hover:text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {bedroomTypes.length > 0 && (
          <div className="bg-white p-5 rounded-lg shadow-sm border border-indigo-50">
            <h3 className="text-lg font-medium text-indigo-700 mb-4 flex items-center">
              <Building2 className="h-5 w-5 mr-2 text-indigo-600" />
              Bedroom Type Pricing
            </h3>
            <div className="rounded-lg border border-indigo-100 overflow-hidden">
              <Table>
                <TableHeader className="bg-indigo-50">
                  <TableRow>
                    <TableHead className="text-indigo-700">Bedroom Type</TableHead>
                    <TableHead className="text-indigo-700">Base PSF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bedroomTypes.map((type, index) => (
                    <TableRow key={index} className={index % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}>
                      <TableCell className="font-medium">{type.type}</TableCell>
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
                          className="border-indigo-200"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {viewTypes.length > 0 && (
          <div className="bg-white p-5 rounded-lg shadow-sm border border-indigo-50">
            <h3 className="text-lg font-medium text-indigo-700 mb-4 flex items-center">
              <Eye className="h-5 w-5 mr-2 text-indigo-600" />
              View Pricing Adjustments
            </h3>
            <div className="rounded-lg border border-indigo-100 overflow-hidden">
              <Table>
                <TableHeader className="bg-indigo-50">
                  <TableRow>
                    <TableHead className="text-indigo-700">View Type</TableHead>
                    <TableHead className="text-indigo-700">PSF Adjustment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewTypes.map((view, index) => (
                    <TableRow key={index} className={index % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}>
                      <TableCell className="font-medium">{view.view}</TableCell>
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
                          className="border-indigo-200"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {Object.keys(groupedAdditionalCategories).length > 0 && (
          <div className="bg-white p-5 rounded-lg shadow-sm border border-indigo-50">
            <h3 className="text-lg font-medium text-indigo-700 mb-4 flex items-center">
              <Tag className="h-5 w-5 mr-2 text-indigo-600" />
              Additional Category Pricing
            </h3>
            
            {Object.entries(groupedAdditionalCategories).map(([column, categories]) => (
              <div key={column} className="mb-6">
                <h4 className="text-md font-medium text-indigo-600 mb-3 flex items-center">
                  {column}
                </h4>
                <div className="rounded-lg border border-indigo-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-indigo-50">
                      <TableRow>
                        <TableHead className="text-indigo-700">Category</TableHead>
                        <TableHead className="text-indigo-700">PSF Adjustment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((item, idx) => {
                        const index = additionalCategoryPricing.findIndex(
                          c => c.column === item.column && c.category === item.category
                        );
                        return (
                          <TableRow key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}>
                            <TableCell className="font-medium">{item.category}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.psfAdjustment}
                                onChange={(e) =>
                                  updateAdditionalCategoryPricing(
                                    index,
                                    parseFloat(e.target.value)
                                  )
                                }
                                className="border-indigo-200"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end p-6 bg-gradient-to-r from-indigo-50/70 to-blue-50/70">
        <Button 
          onClick={handleSubmit} 
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Apply Configuration
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PricingConfiguration;
