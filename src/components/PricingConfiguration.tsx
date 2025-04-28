// src/components/pricing-simulator/PricingConfiguration.tsx

import React, { useState, useEffect, useMemo } from "react";
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
import ReactSelect from "react-select";

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

// New interface for flat-price adders
export interface FlatPriceAdder {
  units?: string[];                     // exact unit names
  columns?: Record<string, string[]>;   // e.g. { bedroom: ['2 BR'], view: ['Sea View'] }
  amount: number;                       // flat AED to add
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
  flatPriceAdders?: FlatPriceAdder[];   // ← added
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
  /* ───────────────────────── state ───────────────────────── */
  const [basePsf, setBasePsf] = useState<number>(
    initialConfig?.basePsf ?? 1000
  );
  const [floorRiseRules, setFloorRiseRules] = useState<FloorRiseRule[]>(
    initialConfig?.floorRiseRules?.map((r: any) => ({ ...r })) || [
      {
        startFloor: 1,
        endFloor: maxFloor,
        psfIncrement: 0,
        jumpEveryFloor: 0,
        jumpIncrement: 0,
      },
    ]
  );
  const [bedroomTypes, setBedroomTypes] = useState<BedroomTypePricing[]>(
    initialConfig?.bedroomTypePricing || []
  );
  const [viewTypes, setViewTypes] = useState<ViewPricing[]>(
    initialConfig?.viewPricing || []
  );
  const [additionalCategoryPricing, setAdditionalCategoryPricing] = useState<
    AdditionalCategoryPricing[]
  >(
    initialConfig?.additionalCategoryPricing ||
      (additionalCategories.length
        ? additionalCategories.flatMap((cat) =>
            cat.categories.map((c) => ({
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

  // New flat-adders state
  const [flatAdders, setFlatAdders] = useState<FlatPriceAdder[]>(
    initialConfig?.flatPriceAdders?.map((a: any) => ({ ...a })) || []
  );

  /* ───────────────────── detect balcony ───────────────────── */
  useEffect(() => {
    if (!data.length) return;
    const hasExplicit = data.some((u) => u.balcony !== undefined);
    const hasImplicit = data.some(
      (u) => (parseFloat(u.sellArea) || 0) > (parseFloat(u.acArea) || 0)
    );
    setHasBalcony(hasExplicit || hasImplicit);
  }, [data]);

  /* ─────────── init additionalCategoryPricing ─────────── */
  useEffect(() => {
    if (initialConfig?.additionalCategoryPricing?.length) {
      setAdditionalCategoryPricing(initialConfig.additionalCategoryPricing);
    } else if (additionalCategories.length) {
      setAdditionalCategoryPricing(
        additionalCategories.flatMap((cat) =>
          cat.categories.map((c) => ({
            column: cat.column,
            category: c,
            psfAdjustment: 0,
          }))
        )
      );
    } else {
      setAdditionalCategoryPricing([]);
    }
  }, [initialConfig, additionalCategories]);

  /* ────────── hydrate from initialConfig ────────── */
  useEffect(() => {
    if (!initialConfig) return;
    if (initialConfig.basePsf) setBasePsf(initialConfig.basePsf);
    if (initialConfig.floorRiseRules?.length)
      setFloorRiseRules(
        initialConfig.floorRiseRules.map((rule: any) => ({
          startFloor: rule.startFloor,
          endFloor: rule.endFloor == null ? maxFloor : rule.endFloor,
          psfIncrement: rule.psfIncrement,
          jumpEveryFloor: rule.jumpEveryFloor ?? 0,
          jumpIncrement: rule.jumpIncrement ?? 0,
        }))
      );
    if (initialConfig.bedroomTypePricing?.length)
      setBedroomTypes(initialConfig.bedroomTypePricing);
    if (initialConfig.viewPricing?.length)
      setViewTypes(initialConfig.viewPricing);
    if (initialConfig.balconyPricing)
      setBalconyPricing({
        fullAreaPct: initialConfig.balconyPricing.fullAreaPct,
        remainderRate: initialConfig.balconyPricing.remainderRate,
      });
    else setBalconyPricing({ fullAreaPct: 100, remainderRate: 0 });

    if (initialConfig.flatPriceAdders?.length)
      setFlatAdders(initialConfig.flatPriceAdders);
  }, [initialConfig, maxFloor]);

  /* ───────── ensure last rule endFloor ───────── */
  useEffect(() => {
    if (!floorRiseRules.length) return;
    const last = floorRiseRules[floorRiseRules.length - 1];
    if (last.endFloor == null) {
      setFloorRiseRules((r) =>
        r.map((rule, i) =>
          i === r.length - 1 ? { ...rule, endFloor: maxFloor } : rule
        )
      );
    }
  }, [floorRiseRules, maxFloor]);

  /* ──── derive bedroomTypes/viewTypes if none ──── */
  useEffect(() => {
    if (!data.length) return;
    if (!initialConfig?.bedroomTypePricing?.length) {
      const types = Array.from(new Set(data.map((u) => u.type))).filter(
        Boolean
      );
      setBedroomTypes(
        types.map((t) => ({ type: t, basePsf, targetAvgPsf: basePsf }))
      );
    }
    if (!initialConfig?.viewPricing?.length) {
      const views = Array.from(new Set(data.map((u) => u.view))).filter(
        Boolean
      );
      setViewTypes(views.map((v) => ({ view: v, psfAdjustment: 0 })));
    }
  }, [data, basePsf, initialConfig]);

  /* ─────────────────── handlers ─────────────────── */
  const handleBasePsfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value) || 0;
    setBasePsf(v);
    if (!initialConfig) {
      setBedroomTypes((prev) =>
        prev.map((b) => ({ ...b, basePsf: v, targetAvgPsf: v }))
      );
    }
  };

  const handleBalconyChange = (
    f: keyof BalconyPricing,
    v: number
  ) => setBalconyPricing((p) => ({ ...p, [f]: v }));

  const handleAddFloorRiseRule = () => {
    const last = floorRiseRules[floorRiseRules.length - 1];
    const nextStart = (last.endFloor ?? maxFloor) + 1;
    setFloorRiseRules((r) => [
      ...r,
      {
        startFloor: nextStart,
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
    setFloorRiseRules((r) => r.filter((_, idx) => idx !== i));
  };
  const updateFloorRiseRule = (
    i: number,
    field: keyof FloorRiseRule,
    value: number | null
  ) => {
    setFloorRiseRules((r) =>
      r.map((rule, idx) =>
        idx === i ? { ...rule, [field]: value } : rule
      )
    );
  };
  const updateBedroomTypePrice = (
    i: number,
    field: keyof BedroomTypePricing,
    value: number
  ) => {
    setBedroomTypes((b) =>
      b.map((bt, idx) => (idx === i ? { ...bt, [field]: value } : bt))
    );
  };
  const updateViewPricing = (i: number, v: number) => {
    setViewTypes((vts) =>
      vts.map((vt, idx) => (idx === i ? { ...vt, psfAdjustment: v } : vt))
    );
  };
  const updateAdditionalCategoryPricing = (i: number, v: number) => {
    setAdditionalCategoryPricing((acp) =>
      acp.map((cat, idx) => (idx === i ? { ...cat, psfAdjustment: v } : cat))
    );
  };

  /* ───────── handlers for flat-adders ───────── */
  const addFlatAdder = () =>
    setFlatAdders((a) => [...a, { units: [], columns: {}, amount: 0 }]);
  const removeFlatAdder = (i: number) =>
    setFlatAdders((a) => a.filter((_, idx) => idx !== i));
  const updateFlatAdder = (
    i: number,
    key: keyof FlatPriceAdder,
    val: any
  ) =>
    setFlatAdders((a) =>
      a.map((adder, idx) =>
        idx === i ? { ...adder, [key]: val } : adder
      )
    );

  /* ───────────────────── submit ───────────────────── */
  const handleSubmit = () => {
    if (basePsf <= 0) {
      toast.error("Base PSF > 0 required");
      return;
    }
    // validate overlaps omitted for brevity...
    const processed = floorRiseRules.map((rule) => ({
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
      flatPriceAdders: flatAdders,   // ← included
      maxFloor,
      ...(initialConfig && {
        targetOverallPsf: initialConfig.targetOverallPsf,
        isOptimized: initialConfig.isOptimized,
        optimizedTypes: initialConfig.optimizedTypes,
      }),
    };
    onConfigurationComplete(finalConfig);
  };

  const groupedAdditional = additionalCategoryPricing.reduce((acc, c) => {
    acc[c.column] = acc[c.column] || [];
    acc[c.column].push(c);
    return acc;
  }, {} as Record<string, AdditionalCategoryPricing[]>);

  /* ─────────── memoized options ─────────── */
  const unitOptions = useMemo(
    () => data.map((u) => ({ label: u.name, value: u.name })),
    [data]
  );
  const categoryOptions = useMemo(
    () =>
      additionalCategories.reduce((acc, { column, categories }) => {
        acc[column] = categories.map((c) => ({ label: c, value: c }));
        return acc;
      }, {} as Record<string, { label: string; value: string }[]>),
    [additionalCategories]
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
        {/* … existing Floor, Balcony, Bedroom, View, Additional-Category panels … */}

        {/* ─── Flat-Price Adders ───────────────────────────── */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-indigo-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-indigo-700 flex items-center gap-2">
              <Hash className="h-5 w-5 text-indigo-600" />
              Additional Flat-Price Rules
            </h3>
            <Button variant="outline" size="sm" onClick={addFlatAdder}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Start typing to select specific units or use the category filters below—then enter the flat AED to add.
          </p>
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
                  <TableCell className="w-1/4">
                    <ReactSelect
                      options={unitOptions}
                      isMulti
                      placeholder="Select units…"
                      value={unitOptions.filter((o) =>
                        adder.units?.includes(o.value)
                      )}
                      onChange={(sel) =>
                        updateFlatAdder(
                          i,
                          "units",
                          sel.map((s) => s.value)
                        )
                      }
                    />
                  </TableCell>

                  <TableCell className="w-1/2">
                    {Object.entries(categoryOptions).map(([col, opts]) => (
                      <div key={col} className="mb-2">
                        <Label className="text-sm font-medium">{col}:</Label>
                        <ReactSelect
                          options={opts}
                          isMulti
                          placeholder={`Filter ${col}…`}
                          value={opts.filter((o) =>
                            adder.columns?.[col]?.includes(o.value)
                          )}
                          onChange={(sel) => {
                            const vals = sel.map((s) => s.value);
                            updateFlatAdder(i, "columns", {
                              ...(adder.columns || {}),
                              [col]: vals,
                            });
                          }}
                        />
                      </div>
                    ))}
                  </TableCell>

                  <TableCell className="w-1/6">
                    <Input
                      type="number"
                      value={adder.amount}
                      onChange={(e) =>
                        updateFlatAdder(
                          i,
                          "amount",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="AED"
                    />
                  </TableCell>

                  <TableCell className="w-1/12 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFlatAdder(i)}
                    >
                      <MinusCircle className="h-4 w-4 text-red-500" />
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
