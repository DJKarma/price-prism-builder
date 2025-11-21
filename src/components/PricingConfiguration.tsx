
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import AsyncSelect from "react-select/async";
import { buildValueMap, asyncUnitOptions } from "@/components/pricing-simulator/helper";


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
  percentageIncrease?: number;
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
    initialConfig?.basePsf || 1000
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
  const [hasBalcony, setHasBalcony] = useState<boolean>(!!initialConfig?.balconyPricing);
  const [balconyPricing, setBalconyPricing] = useState<BalconyPricing>(
    initialConfig?.balconyPricing ?? { fullAreaPct: 100, remainderRate: 0 }
  );

  // flat‐adder state
  const [flatAdders, setFlatAdders] = useState<FlatPriceAdder[]>(
    initialConfig?.flatPriceAdders?.map(a => ({ ...a })) || []
  );

  // percentage increase state
  const [percentageIncrease, setPercentageIncrease] = useState<number>(
    initialConfig?.percentageIncrease ?? 0
  );

  // build a map of every category → values for our multi‐selects
  const valueMap = buildValueMap(data);

  // ─────────────────── handlers ───────────────────


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
      percentageIncrease,
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
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 py-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl text-indigo-800">
              <Settings className="h-5 w-5 text-indigo-600" />
              Pricing Configuration
            </CardTitle>
            <CardDescription className="text-indigo-600">
              Set up base pricing, premiums, balcony & flat-price rules
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
          
            <div className="flex items-center space-x-2 ml-4">
              <Checkbox 
                id="has-balcony" 
                checked={hasBalcony} 
                onCheckedChange={(checked) => setHasBalcony(!!checked)}
              />
              <Label htmlFor="has-balcony" className="text-indigo-700">Has Balcony</Label>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <Tabs defaultValue="floor" className="w-full">
          <TabsList className="grid grid-cols-6 mb-4">
            <TabsTrigger value="floor" className="text-xs sm:text-sm">
              <Ruler className="h-4 w-4 mr-1 hidden sm:inline" />
              Floor Rise
            </TabsTrigger>
            {bedroomTypes.length > 0 && (
              <TabsTrigger value="bedroom" className="text-xs sm:text-sm">
                <Building2 className="h-4 w-4 mr-1 hidden sm:inline" />
                Bedroom Types
              </TabsTrigger>
            )}
            {viewTypes.length > 0 && (
              <TabsTrigger value="view" className="text-xs sm:text-sm">
                <Eye className="h-4 w-4 mr-1 hidden sm:inline" />
                Views
              </TabsTrigger>
            )}
            {Object.keys(groupedAdditional).length > 0 && (
              <TabsTrigger value="additional" className="text-xs sm:text-sm">
                <Tag className="h-4 w-4 mr-1 hidden sm:inline" />
                Categories
              </TabsTrigger>
            )}
            <TabsTrigger value="flat" className="text-xs sm:text-sm">
              <Hash className="h-4 w-4 mr-1 hidden sm:inline" />
              Flat Adders
            </TabsTrigger>
            <TabsTrigger value="percentage" className="text-xs sm:text-sm">
              <Percent className="h-4 w-4 mr-1 hidden sm:inline" />
              Percentage
            </TabsTrigger>
          </TabsList>
          
          {/* Floor Rise Rules Tab */}
          <TabsContent value="floor" className="space-y-4">
            <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-medium text-indigo-700 flex items-center">
                  <Ruler className="h-5 w-5 mr-2 text-indigo-600" />
                  Floor Rise PSF Rules
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddFloorRiseRule}
                  className="h-8 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-700"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                  Add Rule
                </Button>
              </div>
              <div className="rounded-lg border border-indigo-100 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-indigo-50">
                    <TableRow>
                      <TableHead className="text-indigo-700 whitespace-nowrap">Start Flr</TableHead>
                      <TableHead className="text-indigo-700 whitespace-nowrap">End Flr</TableHead>
                      <TableHead className="text-indigo-700 whitespace-nowrap">PSF +</TableHead>
                      <TableHead className="text-indigo-700 whitespace-nowrap">Jump Every</TableHead>
                      <TableHead className="text-indigo-700 whitespace-nowrap">Jump PSF</TableHead>
                      <TableHead className="w-12 text-indigo-700"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {floorRiseRules.map((rule, i) => (
                      <TableRow
                        key={i}
                        className={i % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}
                      >
                        <TableCell className="p-1">
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
                            className="border-indigo-200 h-8"
                          />
                        </TableCell>
                        <TableCell className="p-1">
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
                            className="border-indigo-200 h-8"
                          />
                        </TableCell>
                        <TableCell className="p-1">
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
                            className="border-indigo-200 h-8"
                          />
                        </TableCell>
                        <TableCell className="p-1">
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
                            className="border-indigo-200 h-8"
                          />
                        </TableCell>
                        <TableCell className="p-1">
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
                            className="border-indigo-200 h-8"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFloorRiseRule(i)}
                            className="h-8 w-8 hover:bg-red-50 hover:text-red-500"
                          >
                            <MinusCircle className="h-3.5 w-3.5 text-red-400 hover:text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Balcony Pricing in Floor Tab */}
            {hasBalcony && (
              <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-50">
                <h3 className="text-md font-medium text-indigo-700 mb-3 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-indigo-600" />
                  Balcony Pricing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullAreaPct" className="text-indigo-700 text-sm flex items-center gap-2">
                      % of balcony area at full Calculated PSF
                      <span className="text-xs text-muted-foreground font-normal" title="Uses final PSF after all adjustments (base + view + floor + category premiums)">
                        ⓘ
                      </span>
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="remainderRate" className="text-indigo-700 text-sm flex items-center gap-2">
                      Discount rate on remaining area (% of Calculated PSF)
                      <span className="text-xs text-muted-foreground font-normal" title="Applies to the remaining balcony area. Uses final PSF after all adjustments.">
                        ⓘ
                      </span>
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
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Bedroom Type Pricing Tab */}
          {bedroomTypes.length > 0 && (
            <TabsContent value="bedroom">
              <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-50">
                <h3 className="text-md font-medium text-indigo-700 mb-3 flex items-center">
                  <Building2 className="h-5 w-5 mr-2 text-indigo-600" />
                  Bedroom Type Pricing
                </h3>
                <div className="rounded-lg border border-indigo-100 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-indigo-50">
                      <TableRow>
                        <TableHead className="text-indigo-700">Bedroom Type</TableHead>
                        <TableHead className="text-indigo-700">Base PSF</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bedroomTypes.map((type, i) => (
                        <TableRow
                          key={i}
                          className={i % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}
                        >
                          <TableCell className="font-medium">{type.type}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={type.basePsf}
                              onChange={e =>
                                updateBedroomTypePrice(
                                  i,
                                  "basePsf",
                                  parseFloat(e.target.value)
                                )
                              }
                              className="border-indigo-200 w-36"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          )}
          
          {/* View Pricing Tab */}
          {viewTypes.length > 0 && (
            <TabsContent value="view">
              <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-50">
                <h3 className="text-md font-medium text-indigo-700 mb-3 flex items-center">
                  <Eye className="h-5 w-5 mr-2 text-indigo-600" />
                  View Pricing Adjustments
                </h3>
                <div className="rounded-lg border border-indigo-100 overflow-x-auto">
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
                          <TableCell className="font-medium">{vt.view}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={vt.psfAdjustment}
                              onChange={e =>
                                updateViewPricing(i, parseFloat(e.target.value))
                              }
                              className="border-indigo-200 w-36"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          )}
          
          {/* Additional Category Pricing Tab */}
          {Object.keys(groupedAdditional).length > 0 && (
            <TabsContent value="additional">
              <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-50">
                <h3 className="text-md font-medium text-indigo-700 mb-3 flex items-center">
                  <Tag className="h-5 w-5 mr-2 text-indigo-600" />
                  Additional Category Pricing
                </h3>
                
                {Object.entries(groupedAdditional).length > 1 ? (
                  <div className="space-y-4">
                    {Object.entries(groupedAdditional).map(([col, cats], idx) => (
                      <Collapsible key={col}>
                        <CollapsibleTrigger className="flex w-full items-center justify-between bg-indigo-50/50 px-3 py-2 rounded-t-md border border-indigo-100">
                          <h4 className="text-sm font-medium text-indigo-700">{col}</h4>
                          <ChevronDown className="h-4 w-4 text-indigo-400" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="border border-t-0 border-indigo-100 rounded-b-md">
                          <Table>
                            <TableHeader className="bg-indigo-50/50">
                              <TableRow>
                                <TableHead className="text-indigo-700">Category</TableHead>
                                <TableHead className="text-indigo-700">PSF Adjustment</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cats.map((item, catIdx) => {
                                const idxInArr = additionalCategoryPricing.findIndex(
                                  c => c.column === item.column && c.category === item.category
                                );
                                return (
                                  <TableRow
                                    key={catIdx}
                                    className={catIdx % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}
                                  >
                                    <TableCell className="font-medium">{item.category}</TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        value={item.psfAdjustment}
                                        onChange={e =>
                                          updateAdditionalCategoryPricing(
                                            idxInArr,
                                            parseFloat(e.target.value)
                                          )
                                        }
                                        className="border-indigo-200 w-36"
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                ) : (
                  // Single category case - no collapsible needed
                  Object.entries(groupedAdditional).map(([col, cats]) => (
                    <div key={col} className="mb-2">
                      <h4 className="text-md font-medium text-indigo-600 mb-2">{col}</h4>
                      <div className="rounded-lg border border-indigo-100 overflow-x-auto">
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
                                  <TableCell className="font-medium">{item.category}</TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      value={item.psfAdjustment}
                                      onChange={e =>
                                        updateAdditionalCategoryPricing(
                                          idxInArr,
                                          parseFloat(e.target.value)
                                        )
                                      }
                                      className="border-indigo-200 w-36"
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          )}
          
          {/* Flat-Price Adders Tab */}
          <TabsContent value="flat">
            <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-medium text-indigo-700 flex items-center">
                  <Hash className="h-5 w-5 mr-2 text-indigo-600" />
                  Additional Flat-Price Rules
                </h3>
                <Button variant="outline" size="sm" onClick={addFlatAdder}>
                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                  Add Rule
                </Button>
              </div>
              
              <div className="space-y-4">
                {flatAdders.length > 0 ? (
                  flatAdders.map((adder, i) => (
                    <div key={i} className="border border-indigo-100 rounded-md p-3">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-indigo-700">Rule #{i + 1}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFlatAdder(i)}
                          className="hover:text-red-500"
                        >
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Units (names)</Label>
                          <AsyncSelect
                            cacheOptions
                            defaultOptions
                            loadOptions={asyncUnitOptions(data)}
                            value={adder.units?.map(u => ({ label: u, value: u })) || []}
                            isMulti
                            onChange={opts =>
                              updateFlatAdder(i, "units", opts.map(o => o.value))
                            }
                            placeholder="Start typing unit…"
                            menuPlacement="auto"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Flat AED Amount</Label>
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
                            className="border-indigo-200"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <Label className="text-sm font-medium">Category Filters</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 mt-2">
                          {Object.entries(valueMap).map(([col, vals]) => (
                            <div key={col} className="space-y-1">
                              <Label className="text-xs font-medium">{col}:</Label>
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
                                menuPlacement="auto"
                                className="text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    No flat price adders. Click "Add Rule" to create one.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Percentage Increase Tab */}
          <TabsContent value="percentage">
            <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-50">
              <h3 className="text-md font-medium text-indigo-700 mb-3 flex items-center">
                <Percent className="h-5 w-5 mr-2 text-indigo-600" />
                Percentage Increase
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="percentageIncrease" className="text-indigo-700 text-sm">
                      Overall Price Adjustment (%)
                    </Label>
                    <Input
                      id="percentageIncrease"
                      type="number"
                      step="0.1"
                      value={percentageIncrease}
                      onChange={e =>
                        setPercentageIncrease(parseFloat(e.target.value) || 0)
                      }
                      placeholder="Enter percentage (positive or negative)"
                      className="border-indigo-200"
                    />
                    <p className="text-xs text-indigo-600">
                      Positive values increase prices, negative values decrease them.
                      Example: 5 = +5%, -3 = -3%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-indigo-700 text-sm">Preview</Label>
                    <div className="p-3 bg-indigo-50/50 rounded border border-indigo-100">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Base Price:</span>
                          <span>1,000,000 AED</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Adjustment ({percentageIncrease}%):</span>
                          <span className={percentageIncrease >= 0 ? "text-green-600" : "text-red-600"}>
                            {percentageIncrease >= 0 ? "+" : ""}{((1000000 * percentageIncrease) / 100).toLocaleString()} AED
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1 font-medium">
                          <span>Final Price:</span>
                          <span>{(1000000 * (1 + percentageIncrease / 100)).toLocaleString()} AED</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-end p-4 bg-gradient-to-r from-indigo-50/70 to-blue-50/70">
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
