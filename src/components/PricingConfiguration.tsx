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
} from "lucide-react";
import { toast } from "sonner";
import AsyncSelect from "react-select/async";
import { buildValueMap, asyncUnitOptions } from "@/components/pricing-simulator/helpers";


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

    <CardContent className="space-y-8 p-6">
      {/* ─── Floor Rise Rules ─── */}
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
            <PlusCircle className="h-4 w-4 mr-2 text-indigo-600" />
            Add Rule
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
              {floorRiseRules.map((rule, i) => (
                <TableRow
                  key={i}
                  className={i % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}
                >
                  <TableCell>
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
                      className="border-indigo-200"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={rule.startFloor}
                      value={rule.endFloor ?? ""}
                      placeholder={`${maxFloor} (Default)`}
                      onChange={e =>
                        updateFloorRiseRule(
                          i,
                          "endFloor",
                          e.target.value.trim() === "" ? null : parseInt(e.target.value)
                        )
                      }
                      className="border-indigo-200"
                    />
                  </TableCell>
                  <TableCell>
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
                      className="border-indigo-200"
                    />
                  </TableCell>
                  <TableCell>
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
                      placeholder="e.g., 10"
                      className="border-indigo-200"
                    />
                  </TableCell>
                  <TableCell>
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
                      placeholder="e.g., 20"
                      className="border-indigo-200"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFloorRiseRule(i)}
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

      {/* ─── Balcony Pricing ─── */}
      {hasBalcony && (
        <div className="bg-white p-5 rounded-lg shadow-sm border border-indigo-50">
          <h3 className="text-lg font-medium text-indigo-700 mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-indigo-600" />
            Balcony Pricing
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="fullAreaPct" className="text-indigo-700">
                % of balcony area at full Base PSF
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
                This percentage of the balcony area will be priced at 100% of
                the Base PSF
              </p>
            </div>
            <div className="space-y-3">
              <Label htmlFor="remainderRate" className="text-indigo-700">
                Discount rate on remaining area (% of Base PSF)
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
                The remaining balcony area will be priced at this percentage of
                the Base PSF
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bedroom Type Pricing ─── */}
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

      {/* ─── View Pricing ─── */}
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

      {/* ─── Additional Category Pricing ─── */}
      {Object.keys(groupedAdditional).length > 0 && (
        <div className="bg-white p-5 rounded-lg shadow-sm border border-indigo-50">
          <h3 className="text-lg font-medium text-indigo-700 mb-4 flex items-center">
            <Tag className="h-5 w-5 mr-2 text-indigo-600" />
            Additional Category Pricing
          </h3>
          {Object.entries(groupedAdditional).map(([col, cats]) => (
            <div key={col} className="mb-6">
              <h4 className="text-md font-medium text-indigo-600 mb-3 flex items-center">
                {col}
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

      {/* ─── Flat-Price Adders ─── */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-indigo-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-indigo-700 flex items-center">
            <Hash className="h-5 w-5 mr-2 text-indigo-600" />
            Additional Flat-Price Rules
          </h3>
          <Button variant="outline" size="sm" onClick={addFlatAdder}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>

        <Table>
          <TableHeader className="bg-indigo-50">
            <TableRow>
              <TableHead>Units (names)</TableHead>
              <TableHead>Category Filters</TableHead>
              <TableHead>Flat AED</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flatAdders.map((adder, i) => (
              <TableRow
                key={i}
                className={i % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}
              >
                {/* Unit Autocomplete */}
                <TableCell>
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
                  />
                </TableCell>

                {/* Category Multi-Selects */}
                <TableCell className="space-y-2">
                  {Object.entries(valueMap).map(([col, vals]) => (
                    <div key={col}>
                      <Label className="text-sm font-medium">{col}:</Label>
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
                      />
                    </div>
                  ))}
                </TableCell>

                {/* Flat AED amount */}
                <TableCell>
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
                  />
                </TableCell>

                {/* Remove button */}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFlatAdder(i)}
                    className="hover:text-red-500"
                  >
                    <MinusCircle className="h-5 w-5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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

