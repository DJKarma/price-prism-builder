// src/components/pricing-simulator/PricingConfiguration.tsx
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
  TableRow,
} from "@/components/ui/table";
import {
  Settings,
  PlusCircle,
  MinusCircle,
  Ruler,
  Building2,
  Eye,
  Tag,
  DollarSign,
  Hash,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import AsyncSelect from "react-select/async";
import { buildValueMap, asyncUnitOptions } from "@/components/pricing-simulator/helper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface PricingConfigurationProps {
  data: any[];
  initialConfig?: any;
  onConfigurationComplete: (config: PricingConfig) => void;
  maxFloor?: number;
  additionalCategories?: Array<{ column: string; categories: string[] }>;
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

export interface BalconyPricing {
  fullAreaPct: number;
  remainderRate: number;
}

export interface FlatPriceAdder {
  units?: string[];
  columns?: Record<string, string[]>;
  amount: number;
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
  balconyPricing?: BalconyPricing;
  flatPriceAdders?: FlatPriceAdder[];
  targetOverallPsf?: number;
  isOptimized?: boolean;
  maxFloor?: number;
  optimizedTypes?: string[];
}

const PricingConfiguration: React.FC<PricingConfigurationProps> = ({
  data,
  initialConfig,
  onConfigurationComplete,
  maxFloor = 50,
  additionalCategories = [],
}) => {
  // ───────────────────────── state ─────────────────────────
  const [basePsf, setBasePsf] = useState<number>(
    initialConfig?.basePsf ?? 1000
  );
  const [floorRiseRules, setFloorRiseRules] = useState<FloorRiseRule[]>(
    initialConfig?.floorRiseRules?.map(r => ({ ...r })) || [
      { startFloor: 1, endFloor: maxFloor, psfIncrement: 0, jumpEveryFloor: 0, jumpIncrement: 0 },
    ]
  );
  const [bedroomTypes, setBedroomTypes] = useState<BedroomTypePricing[]>(
    initialConfig?.bedroomTypePricing || []
  );
  const [viewTypes, setViewTypes] = useState<ViewPricing[]>(
    initialConfig?.viewPricing || []
  );
  const [additionalCategoryPricing, setAdditionalCategoryPricing] = useState<AdditionalCategoryPricing[]>(
    initialConfig?.additionalCategoryPricing ||
      (additionalCategories.length
        ? additionalCategories.flatMap(cat =>
            cat.categories.map(c => ({
              column: cat.column,
              category: c,
              psfAdjustment: 0,
            }))
          )
        : [])
  );
  const [hasBalcony, setHasBalcony] = useState<boolean>(false);
  const [balconyPricing, setBalconyPricing] = useState<BalconyPricing>(
    initialConfig?.balconyPricing ?? { fullAreaPct: 100, remainderRate: 0 }
  );

  // flat‐adder state
  const [flatAdders, setFlatAdders] = useState<FlatPriceAdder[]>(
    initialConfig?.flatPriceAdders?.map(a => ({ ...a })) || []
  );

  // build a map of every category → values for our multi‐selects
  const valueMap = buildValueMap(data);

  // ─────────────────── handlers ───────────────────
  const handleBasePsfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value) || 0;
    setBasePsf(v);
    if (!initialConfig) {
      setBedroomTypes(bs => bs.map(b => ({ ...b, basePsf: v, targetAvgPsf: v })));
    }
  };

  const handleBalconyChange = (f: keyof BalconyPricing, v: number) =>
    setBalconyPricing(p => ({ ...p, [f]: v }));

  const handleAddFloorRiseRule = () => {
    const last = floorRiseRules[floorRiseRules.length - 1];
    setFloorRiseRules(r => [
      ...r,
      {
        startFloor: (last.endFloor ?? maxFloor) + 1,
        endFloor: maxFloor,
        psfIncrement: 0,
        jumpEveryFloor: 0,
        jumpIncrement: 0,
      },
    ]);
  };
  const handleRemoveFloorRiseRule = (i: number) => {
    if (floorRiseRules.length <= 1) {
      toast.error("At least one rule required");
      return;
    }
    setFloorRiseRules(r => r.filter((_, idx) => idx !== i));
  };
  const updateFloorRiseRule = (
    i: number,
    field: keyof FloorRiseRule,
    value: number | null
  ) =>
    setFloorRiseRules(r =>
      r.map((rule, idx) => (idx === i ? { ...rule, [field]: value } : rule))
    );

  const updateBedroomTypePrice = (
    i: number,
    field: keyof BedroomTypePricing,
    value: number
  ) =>
    setBedroomTypes(bs =>
      bs.map((b, idx) => (idx === i ? { ...b, [field]: value } : b))
    );

  const updateViewPricing = (i: number, v: number) =>
    setViewTypes(vs =>
      vs.map((vt, idx) => (idx === i ? { ...vt, psfAdjustment: v } : vt))
    );

  const updateAdditionalCategoryPricing = (i: number, v: number) =>
    setAdditionalCategoryPricing(acps =>
      acps.map((cat, idx) => (idx === i ? { ...cat, psfAdjustment: v } : cat))
    );

  // ───────── handlers for flat-adders ─────────
  const addFlatAdder = () =>
    setFlatAdders(a => [...a, { units: [], columns: {}, amount: 0 }]);
  const removeFlatAdder = (i: number) =>
    setFlatAdders(a => a.filter((_, idx) => idx !== i));
  const updateFlatAdder = (
    i: number,
    key: keyof FlatPriceAdder,
    val: any
  ) =>
    setFlatAdders(a =>
      a.map((adder, idx) =>
        idx === i ? { ...adder, [key]: val } : adder
      )
    );

  // ───────────────────── submit ─────────────────────
  const handleSubmit = () => {
    if (basePsf <= 0) {
      toast.error("Base PSF > 0 required");
      return;
    }
    const processed = floorRiseRules.map(rule => ({
      ...rule,
      endFloor: rule.endFloor == null ? maxFloor : rule.endFloor,
    }));
    const finalConfig: PricingConfig = {
      basePsf,
      floorRiseRules: processed,
      bedroomTypePricing: bedroomTypes,
      viewPricing: viewTypes,
      additionalCategoryPricing,
      ...(hasBalcony && { balconyPricing }),
      flatPriceAdders: flatAdders,
      maxFloor,
      ...(initialConfig && {
        targetOverallPsf: initialConfig.targetOverallPsf,
        isOptimized: initialConfig.isOptimized,
        optimizedTypes: initialConfig.optimizedTypes,
      }),
    };
    onConfigurationComplete(finalConfig);
  };

  const groupedAdditional = additionalCategoryPricing.reduce(
    (acc, c) => {
      acc[c.column] = acc[c.column] || [];
      acc[c.column].push(c);
      return acc;
    },
    {} as Record<string, AdditionalCategoryPricing[]>
  );

  /* ─────────────────────── render ─────────────────────── */
  return (
    <Card className="w-full border-2 border-indigo-100 shadow-md">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
        <CardTitle className="flex items-center gap-2 text-xl text-indigo-800">
          <Settings className="h-5 w-5 text-indigo-600" />
          Pricing Configuration
        </CardTitle>
        <CardDescription className="text-indigo-600">
          Set up base pricing, premiums, balcony & flat-price rules
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4">
        <Tabs defaultValue="primary" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="primary">Primary Settings</TabsTrigger>
            <TabsTrigger value="premiums">View & Premiums</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Rules</TabsTrigger>
          </TabsList>

          {/* Primary Settings Tab */}
          <TabsContent value="primary" className="space-y-4">
            {/* Base PSF Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-indigo-50/30 rounded-lg border border-indigo-100">
              <div className="space-y-2">
                <Label htmlFor="basePsf" className="text-indigo-700 font-medium">Base PSF (AED)</Label>
                <Input
                  id="basePsf"
                  type="number"
                  value={basePsf}
                  onChange={handleBasePsfChange}
                  className="border-indigo-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-indigo-700 font-medium">Balcony Pricing</Label>
                <div className="flex items-center space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className={`${hasBalcony ? 'bg-indigo-100 border-indigo-300' : ''}`}
                    onClick={() => setHasBalcony(!hasBalcony)}
                  >
                    {hasBalcony ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Floor Rise Rules - Collapsible */}
            <Accordion type="single" defaultValue="floorRules" collapsible className="border rounded-lg">
              <AccordionItem value="floorRules" className="border-none">
                <AccordionTrigger className="px-4 py-3 hover:no-underline bg-indigo-50/50">
                  <div className="flex items-center space-x-2 text-indigo-700">
                    <Ruler className="h-5 w-5 text-indigo-600" />
                    <span className="font-medium">Floor Rise PSF Rules</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-3">
                  <div className="flex justify-end mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddFloorRiseRule}
                      className="h-9 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-700"
                    >
                      <PlusCircle className="h-4 w-4 mr-2 text-indigo-600" />
                      Add Rule
                    </Button>
                  </div>
                  <div className="rounded-lg border border-indigo-100 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-indigo-50">
                        <TableRow>
                          <TableHead className="text-indigo-700">Start</TableHead>
                          <TableHead className="text-indigo-700">End</TableHead>
                          <TableHead className="text-indigo-700">PSF+</TableHead>
                          <TableHead className="text-indigo-700">Jump Every</TableHead>
                          <TableHead className="text-indigo-700">Jump PSF</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {floorRiseRules.map((rule, i) => (
                          <TableRow
                            key={i}
                            className={i % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}
                          >
                            <TableCell className="py-2">
                              <Input
                                type="number"
                                min={1}
                                value={rule.startFloor}
                                onChange={e =>
                                  updateFloorRiseRule(
                                    i,
                                    "startFloor",
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="border-indigo-200 h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Input
                                type="number"
                                min={rule.startFloor}
                                value={rule.endFloor ?? ""}
                                placeholder={`${maxFloor}`}
                                onChange={e =>
                                  updateFloorRiseRule(
                                    i,
                                    "endFloor",
                                    e.target.value.trim() === "" ? null : parseInt(e.target.value)
                                  )
                                }
                                className="border-indigo-200 h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Input
                                type="number"
                                value={rule.psfIncrement}
                                onChange={e =>
                                  updateFloorRiseRule(
                                    i,
                                    "psfIncrement",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="border-indigo-200 h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Input
                                type="number"
                                min={1}
                                value={rule.jumpEveryFloor || 0}
                                onChange={e =>
                                  updateFloorRiseRule(
                                    i,
                                    "jumpEveryFloor",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="border-indigo-200 h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Input
                                type="number"
                                value={rule.jumpIncrement || 0}
                                onChange={e =>
                                  updateFloorRiseRule(
                                    i,
                                    "jumpIncrement",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="border-indigo-200 h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveFloorRiseRule(i)}
                                className="h-8 w-8 hover:bg-red-50 hover:text-red-500"
                              >
                                <MinusCircle className="h-4 w-4 text-red-400 hover:text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Balcony Pricing (Conditionally Rendered) */}
            {hasBalcony && (
              <div className="border rounded-lg overflow-hidden">
                <Collapsible className="w-full">
                  <div className="flex items-center justify-between px-4 py-3 bg-indigo-50/50">
                    <div className="flex items-center space-x-2 text-indigo-700">
                      <DollarSign className="h-5 w-5 text-indigo-600" />
                      <span className="font-medium">Balcony Pricing</span>
                    </div>
                    <CollapsibleTrigger className="hover:bg-indigo-100 p-1 rounded">
                      <ChevronDown className="h-5 w-5 text-indigo-700" />
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullAreaPct" className="text-indigo-700">
                          % at full Base PSF
                        </Label>
                        <Input
                          id="fullAreaPct"
                          type="number"
                          min={0}
                          max={100}
                          value={balconyPricing.fullAreaPct}
                          onChange={e =>
                            handleBalconyChange(
                              "fullAreaPct",
                              Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                            )
                          }
                          className="border-indigo-200"
                        />
                        <p className="text-xs text-gray-500">
                          % of balcony at full Base PSF
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="remainderRate" className="text-indigo-700">
                          Rate on remaining area (%)
                        </Label>
                        <Input
                          id="remainderRate"
                          type="number"
                          min={0}
                          max={100}
                          value={balconyPricing.remainderRate}
                          onChange={e =>
                            handleBalconyChange(
                              "remainderRate",
                              Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                            )
                          }
                          className="border-indigo-200"
                        />
                        <p className="text-xs text-gray-500">
                          Remaining % of Base PSF
                        </p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Bedroom Type Pricing */}
            {bedroomTypes.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Collapsible className="w-full">
                  <div className="flex items-center justify-between px-4 py-3 bg-indigo-50/50">
                    <div className="flex items-center space-x-2 text-indigo-700">
                      <Building2 className="h-5 w-5 text-indigo-600" />
                      <span className="font-medium">Bedroom Type Pricing</span>
                    </div>
                    <CollapsibleTrigger className="hover:bg-indigo-100 p-1 rounded">
                      <ChevronDown className="h-5 w-5 text-indigo-700" />
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="p-3">
                    <div className="rounded-lg border border-indigo-100 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-indigo-50">
                          <TableRow>
                            <TableHead className="text-indigo-700">Type</TableHead>
                            <TableHead className="text-indigo-700">Base PSF</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bedroomTypes.map((type, i) => (
                            <TableRow
                              key={i}
                              className={i % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}
                            >
                              <TableCell className="font-medium py-2">{type.type}</TableCell>
                              <TableCell className="py-2">
                                <Input
                                  type="number"
                                  min={0}
                                  value={type.basePsf}
                                  onChange={e =>
                                    updateBedroomTypePrice(
                                      i,
                                      "basePsf",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="border-indigo-200 h-8 text-sm"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </TabsContent>

          {/* Premiums Tab */}
          <TabsContent value="premiums" className="space-y-4">
            {/* View Pricing */}
            {viewTypes.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Collapsible className="w-full" defaultOpen={true}>
                  <div className="flex items-center justify-between px-4 py-3 bg-indigo-50/50">
                    <div className="flex items-center space-x-2 text-indigo-700">
                      <Eye className="h-5 w-5 text-indigo-600" />
                      <span className="font-medium">View Pricing Adjustments</span>
                    </div>
                    <CollapsibleTrigger className="hover:bg-indigo-100 p-1 rounded">
                      <ChevronDown className="h-5 w-5 text-indigo-700" />
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="p-3">
                    <div className="rounded-lg border border-indigo-100 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-indigo-50">
                          <TableRow>
                            <TableHead className="text-indigo-700">View Type</TableHead>
                            <TableHead className="text-indigo-700">PSF Adjustment</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewTypes.map((vt, i) => (
                            <TableRow
                              key={i}
                              className={i % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}
                            >
                              <TableCell className="font-medium py-2">{vt.view}</TableCell>
                              <TableCell className="py-2">
                                <Input
                                  type="number"
                                  value={vt.psfAdjustment}
                                  onChange={e =>
                                    updateViewPricing(i, parseFloat(e.target.value) || 0)
                                  }
                                  className="border-indigo-200 h-8 text-sm"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Additional Category Pricing */}
            {Object.keys(groupedAdditional).length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Accordion type="multiple" className="w-full">
                  {Object.entries(groupedAdditional).map(([col, cats], idx) => (
                    <AccordionItem key={col} value={col} className="border-b last:border-0">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline bg-indigo-50/50">
                        <div className="flex items-center space-x-2 text-indigo-700">
                          <Tag className="h-5 w-5 text-indigo-600" />
                          <span className="font-medium">{col} Pricing</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-3">
                        <div className="rounded-lg border border-indigo-100 overflow-hidden">
                          <Table>
                            <TableHeader className="bg-indigo-50">
                              <TableRow>
                                <TableHead className="text-indigo-700">Category</TableHead>
                                <TableHead className="text-indigo-700">PSF Adjustment</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cats.map((item, idx) => {
                                const idxInArr = additionalCategoryPricing.findIndex(
                                  c => c.column === item.column && c.category === item.category
                                );
                                return (
                                  <TableRow
                                    key={idx}
                                    className={idx % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}
                                  >
                                    <TableCell className="font-medium py-2">{item.category}</TableCell>
                                    <TableCell className="py-2">
                                      <Input
                                        type="number"
                                        value={item.psfAdjustment}
                                        onChange={e =>
                                          updateAdditionalCategoryPricing(
                                            idxInArr,
                                            parseFloat(e.target.value) || 0
                                          )
                                        }
                                        className="border-indigo-200 h-8 text-sm"
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </TabsContent>

          {/* Advanced Rules Tab */}
          <TabsContent value="advanced" className="space-y-4">
            {/* Flat-Price Adders */}
            <div className="border rounded-lg overflow-hidden">
              <Collapsible className="w-full" defaultOpen={true}>
                <div className="flex items-center justify-between px-4 py-3 bg-indigo-50/50">
                  <div className="flex items-center space-x-2 text-indigo-700">
                    <Hash className="h-5 w-5 text-indigo-600" />
                    <span className="font-medium">Additional Flat-Price Rules</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={addFlatAdder}>
                      <PlusCircle className="h-4 w-4 mr-1" />
                      Add Rule
                    </Button>
                    <CollapsibleTrigger className="hover:bg-indigo-100 p-1 rounded">
                      <ChevronDown className="h-5 w-5 text-indigo-700" />
                    </CollapsibleTrigger>
                  </div>
                </div>
                <CollapsibleContent className="p-3">
                  <Table>
                    <TableHeader className="bg-indigo-50">
                      <TableRow>
                        <TableHead>Units</TableHead>
                        <TableHead>Category Filters</TableHead>
                        <TableHead>Flat AED</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flatAdders.map((adder, i) => (
                        <TableRow
                          key={i}
                          className={i % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}
                        >
                          {/* Unit Autocomplete */}
                          <TableCell className="py-2">
                            <AsyncSelect
                              cacheOptions
                              defaultOptions
                              loadOptions={asyncUnitOptions(data)}
                              value={adder.units?.map(u => ({ label: u, value: u })) || []}
                              isMulti
                              onChange={opts =>
                                updateFlatAdder(i, "units", opts.map(o => o.value))
                              }
                              placeholder="Select units..."
                              className="text-sm"
                              classNamePrefix="react-select"
                            />
                          </TableCell>

                          {/* Category Multi-Selects */}
                          <TableCell className="py-2">
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {Object.entries(valueMap).map(([col, vals]) => (
                                <div key={col} className="mb-1 last:mb-0">
                                  <Label className="text-xs font-medium mb-1 block">{col}:</Label>
                                  <AsyncSelect
                                    isMulti
                                    defaultOptions={vals.map(v => ({ label: v, value: v }))}
                                    loadOptions={(input, cb) =>
                                      cb(
                                        vals
                                          .filter(v =>
                                            v.toLowerCase().includes(input.toLowerCase())
                                          )
                                          .map(v => ({ label: v, value: v }))
                                      )
                                    }
                                    value={(adder.columns?.[col] || []).map(v => ({
                                      label: v,
                                      value: v,
                                    }))}
                                    onChange={opts =>
                                      updateFlatAdder(i, "columns", {
                                        ...(adder.columns || {}),
                                        [col]: opts.map(o => o.value),
                                      })
                                    }
                                    placeholder={`Select ${col}`}
                                    className="text-sm"
                                    classNamePrefix="react-select"
                                  />
                                </div>
                              ))}
                            </div>
                          </TableCell>

                          {/* Flat AED amount */}
                          <TableCell className="py-2">
                            <Input
                              type="number"
                              value={adder.amount}
                              onChange={e =>
                                updateFlatAdder(
                                  i,
                                  "amount",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="border-indigo-200 h-8 text-sm"
                            />
                          </TableCell>

                          {/* Remove button */}
                          <TableCell className="py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFlatAdder(i)}
                              className="h-8 w-8 hover:text-red-500"
                            >
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-end p-4 bg-gradient-to-r from-indigo-50/70 to-blue-50/70">
        <Button
          onClick={handleSubmit}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Apply Configuration
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PricingConfiguration;
