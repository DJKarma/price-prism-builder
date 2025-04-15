import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, MinusCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface PricingConfigurationProps {
  data: any[];
  onConfigurationComplete: (config: any) => void;
  maxFloor?: number;
  additionalCategories?: any[];
  initialConfig?: any; // New prop for initial configuration when embedded
  embedded?: boolean;  // New prop to indicate if the component is embedded in another view
}

const PricingConfiguration: React.FC<PricingConfigurationProps> = ({
  data,
  onConfigurationComplete,
  maxFloor = 50,
  additionalCategories = [],
  initialConfig,
  embedded
}) => {
  const [basePsf, setBasePsf] = useState(1000);
  const [bedroomTypes, setBedroomTypes] = useState<any[]>([]);
  const [viewTypes, setViewTypes] = useState<any[]>([]);
  const [floorRules, setFloorRules] = useState<any[]>([]);
  const [additionalCategoryPricing, setAdditionalCategoryPricing] = useState<any[]>([]);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (initialConfig && !hasInitialized.current) {
      // If we have an initial config and haven't initialized yet, use it
      setBedroomTypes(initialConfig.bedroomTypePricing || []);
      setViewTypes(initialConfig.viewPricing || []);
      setFloorRules(initialConfig.floorRiseRules || []);
      setBasePsf(initialConfig.basePsf || 1000);
      setAdditionalCategoryPricing(initialConfig.additionalCategoryPricing || []);
      
      hasInitialized.current = true;
    }
  }, [initialConfig]);

  const uniqueBedroomTypes = useMemo(() => {
    const types = new Set(data.map((item) => item.type));
    return Array.from(types);
  }, [data]);

  const uniqueViewTypes = useMemo(() => {
    const views = new Set(data.map((item) => item.view));
    return Array.from(views);
  }, [data]);

  const handleBasePsfChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBasePsf(parseFloat(e.target.value));
  }, []);

  const addBedroomType = useCallback(() => {
    setBedroomTypes((prevTypes) => [
      ...prevTypes,
      { type: `Type ${prevTypes.length + 1}`, basePsf: 800, targetAvgPsf: 1200 },
    ]);
  }, []);

  const updateBedroomType = useCallback((index: number, field: string, value: any) => {
    setBedroomTypes((prevTypes) => {
      const newTypes = [...prevTypes];
      newTypes[index] = { ...newTypes[index], [field]: value };
      return newTypes;
    });
  }, []);

  const removeBedroomType = useCallback((index: number) => {
    setBedroomTypes((prevTypes) => {
      const newTypes = [...prevTypes];
      newTypes.splice(index, 1);
      return newTypes;
    });
  }, []);

  const addViewType = useCallback(() => {
    setViewTypes((prevViews) => [
      ...prevViews,
      { view: `View ${prevViews.length + 1}`, psfAdjustment: 100 },
    ]);
  }, []);

  const updateViewType = useCallback((index: number, field: string, value: any) => {
    setViewTypes((prevViews) => {
      const newViews = [...prevViews];
      newViews[index] = { ...newViews[index], [field]: value };
      return newViews;
    });
  }, []);

  const removeViewType = useCallback((index: number) => {
    setViewTypes((prevViews) => {
      const newViews = [...prevViews];
      newViews.splice(index, 1);
      return newViews;
    });
  }, []);

  const addFloorRule = useCallback(() => {
    setFloorRules((prevRules) => [
      ...prevRules,
      {
        startFloor: 1,
        endFloor: maxFloor,
        psfIncrement: 5,
        jumpEveryFloor: 10,
        jumpIncrement: 20,
      },
    ]);
  }, [maxFloor]);

  const updateFloorRule = useCallback((index: number, field: string, value: any) => {
    setFloorRules((prevRules) => {
      const newRules = [...prevRules];
      newRules[index] = { ...newRules[index], [field]: value };
      return newRules;
    });
  }, []);

  const removeFloorRule = useCallback((index: number) => {
    setFloorRules((prevRules) => {
      const newRules = [...prevRules];
      newRules.splice(index, 1);
      return newRules;
    });
  }, []);

  const addAdditionalCategory = useCallback(() => {
    setAdditionalCategoryPricing(prev => [
      ...prev,
      { column: '', category: '', psfAdjustment: 0 }
    ]);
  }, []);

  const updateAdditionalCategory = useCallback((index: number, field: string, value: any) => {
    setAdditionalCategoryPricing(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const removeAdditionalCategory = useCallback((index: number) => {
    setAdditionalCategoryPricing(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  const handleSave = useCallback(() => {
    const config = {
      basePsf,
      bedroomTypePricing: bedroomTypes,
      viewPricing: viewTypes,
      floorRiseRules: floorRules,
      additionalCategoryPricing: additionalCategoryPricing
    };
    onConfigurationComplete(config);

    toast({
      title: "Configuration Saved",
      description: "Pricing configuration has been saved."
    });
  }, [basePsf, bedroomTypes, viewTypes, floorRules, additionalCategoryPricing, onConfigurationComplete]);

  return (
    <div className="space-y-6">
      {!embedded && (
        <h2 className="text-2xl font-bold mb-6">Configure Pricing Strategy</h2>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Base PSF</CardTitle>
          <CardDescription>Set the base price per square foot.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="base-psf" className="text-right">
                Base PSF
              </Label>
              <Input
                type="number"
                id="base-psf"
                value={basePsf}
                onChange={handleBasePsfChange}
                className="col-span-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bedroom Type Pricing</CardTitle>
          <CardDescription>
            Define pricing adjustments based on bedroom type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Base PSF</TableHead>
                <TableHead>Target Avg PSF</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bedroomTypes.map((type, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Select
                      value={type.type}
                      onValueChange={(value) => updateBedroomType(index, 'type', value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueBedroomTypes.map((bedType) => (
                          <SelectItem key={bedType} value={bedType}>
                            {bedType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={type.basePsf}
                      onChange={(e) => updateBedroomType(index, 'basePsf', parseFloat(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={type.targetAvgPsf}
                      onChange={(e) => updateBedroomType(index, 'targetAvgPsf', parseFloat(e.target.value))}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => removeBedroomType(index)}>
                      <MinusCircle className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button variant="outline" size="sm" className="mt-2" onClick={addBedroomType}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Type
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>View Type Pricing</CardTitle>
          <CardDescription>
            Adjust pricing based on the view type of the unit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>View</TableHead>
                <TableHead>PSF Adjustment</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewTypes.map((view, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Select
                      value={view.view}
                      onValueChange={(value) => updateViewType(index, 'view', value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select a view" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueViewTypes.map((viewType) => (
                          <SelectItem key={viewType} value={viewType}>
                            {viewType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={view.psfAdjustment}
                      onChange={(e) => updateViewType(index, 'psfAdjustment', parseFloat(e.target.value))}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => removeViewType(index)}>
                      <MinusCircle className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button variant="outline" size="sm" className="mt-2" onClick={addViewType}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Add View
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Floor Rules</CardTitle>
          <CardDescription>
            Define rules for price adjustments based on floor level.
          </CardDescription>
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
              {floorRules.map((rule, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      type="number"
                      value={rule.startFloor}
                      onChange={(e) => updateFloorRule(index, 'startFloor', parseInt(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={rule.endFloor}
                      onChange={(e) => updateFloorRule(index, 'endFloor', parseInt(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={rule.psfIncrement}
                      onChange={(e) => updateFloorRule(index, 'psfIncrement', parseFloat(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={rule.jumpEveryFloor}
                      onChange={(e) => updateFloorRule(index, 'jumpEveryFloor', parseInt(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={rule.jumpIncrement}
                      onChange={(e) => updateFloorRule(index, 'jumpIncrement', parseFloat(e.target.value))}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => removeFloorRule(index)}>
                      <MinusCircle className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button variant="outline" size="sm" className="mt-2" onClick={addFloorRule}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Category Pricing</CardTitle>
          <CardDescription>Adjust pricing based on additional categories.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Column</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>PSF Adjustment</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {additionalCategoryPricing.map((category, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Select
                      value={category.column}
                      onValueChange={(value) => updateAdditionalCategory(index, 'column', value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select a column" />
                      </SelectTrigger>
                      <SelectContent>
                        {additionalCategories.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={category.category}
                      onChange={(e) => updateAdditionalCategory(index, 'category', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={category.psfAdjustment}
                      onChange={(e) => updateAdditionalCategory(index, 'psfAdjustment', parseFloat(e.target.value))}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => removeAdditionalCategory(index)}>
                      <MinusCircle className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button variant="outline" size="sm" className="mt-2" onClick={addAdditionalCategory}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end mt-8">
        <Button 
          onClick={handleSave}
          size={embedded ? "sm" : "default"}
          className={embedded ? "w-auto" : "w-full md:w-auto"}
        >
          {embedded ? "Apply Configuration" : "Save & Continue to Simulation"}
        </Button>
      </div>
    </div>
  );
};

export default PricingConfiguration;
