// src/components/pricing-simulator/ConfigMappingDialog.tsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, AlertCircle, ImportIcon } from "lucide-react";

interface FieldOption {
  key: string;
  displayValue: string;
}

interface MappingSection {
  title: string;
  description: string;
  currentFields: FieldOption[];
  importedFields: FieldOption[];
  mappings: Record<string, string>;
}

interface ConfigMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: any;
  importedConfig: any;
  onMappingComplete: (
    mappings: Record<string, Record<string, string> | string[] | boolean>
  ) => void;
}

const ConfigMappingDialog: React.FC<ConfigMappingDialogProps> = ({
  isOpen,
  onClose,
  currentConfig,
  importedConfig,
  onMappingComplete,
}) => {
  const [sections, setSections] = useState<Record<string, MappingSection>>({
    bedroomTypes: {
      title: "Bedroom Types",
      description: "Match imported bedroom types to your current configuration",
      currentFields: [],
      importedFields: [],
      mappings: {},
    },
    views: {
      title: "Views",
      description: "Match imported views to your current configuration",
      currentFields: [],
      importedFields: [],
      mappings: {},
    },
    additionalCategories: {
      title: "Additional Categories",
      description:
        "Match imported additional categories to your current categories",
      currentFields: [],
      importedFields: [],
      mappings: {},
    },
    scalarFields: {
      title: "Basic Parameters",
      description: "Match imported basic parameters to your current config",
      currentFields: [],
      importedFields: [],
      mappings: {},
    },
  });

  // Floor-rise rule checkboxes
  const [floorOptions, setFloorOptions] = useState<FieldOption[]>([]);
  const [selectedFloorKeys, setSelectedFloorKeys] = useState<Set<string>>(
    new Set()
  );

  // ── NEW: state for our two new toggles
  const [importBalcony, setImportBalcony] = useState<boolean>(true);
  const [importFlatAdders, setImportFlatAdders] = useState<boolean>(true);

  // build the sections plus floor options
  useEffect(() => {
    if (!isOpen) return;

    const makeOpts = (arr: any[], keyField: string, valField: string) =>
      arr.map((item) => ({
        key: item[keyField].toString(),
        displayValue: `${item[valField] ?? ""}`,
      }));

    // bedrooms
    const currBeds = makeOpts(
      currentConfig.bedroomTypePricing || [],
      "type",
      "basePsf"
    );
    const impBeds = makeOpts(
      importedConfig.bedroomTypePricing || [],
      "type",
      "basePsf"
    );

    // views
    const currViews = makeOpts(
      currentConfig.viewPricing || [],
      "view",
      "psfAdjustment"
    );
    const impViews = makeOpts(
      importedConfig.viewPricing || [],
      "view",
      "psfAdjustment"
    );

    // additional categories
    const currAdd = (currentConfig.additionalCategoryPricing || []).map(
      (c: any) => ({
        key: `${c.column}: ${c.category}`,
        displayValue: `${c.psfAdjustment ?? ""}`,
      })
    );
    const impAdd = (importedConfig.additionalCategoryPricing || []).map(
      (c: any) => ({
        key: `${c.column}: ${c.category}`,
        displayValue: `${c.psfAdjustment ?? ""}`,
      })
    );

    // scalar fields
    const scalarKeys = ["basePsf", "maxFloor", "targetOverallPsf"].filter(
      (k) => k in importedConfig
    );
    const currScalar = scalarKeys.map((k) => ({
      key: k,
      displayValue: `${currentConfig[k] ?? ""}`,
    }));
    const impScalar = scalarKeys.map((k) => ({
      key: k,
      displayValue: `${importedConfig[k] ?? ""}`,
    }));

    // auto-match helper
    const initMapping = (
      curr: FieldOption[],
      imp: FieldOption[]
    ): Record<string, string> =>
      curr.reduce((m, f) => {
        const match = imp.find(
          (i) => i.key.toLowerCase() === f.key.toLowerCase()
        );
        m[f.key] = match ? match.key : "no-match";
        return m;
      }, {} as Record<string, string>);

    setSections({
      bedroomTypes: {
        title: "Bedroom Types",
        description: "Match imported bedroom types to your current configuration",
        currentFields: currBeds,
        importedFields: impBeds,
        mappings: initMapping(currBeds, impBeds),
      },
      views: {
        title: "Views",
        description: "Match imported views to your current configuration",
        currentFields: currViews,
        importedFields: impViews,
        mappings: initMapping(currViews, impViews),
      },
      additionalCategories: {
        title: "Additional Categories",
        description:
          "Match imported additional categories to your current categories",
        currentFields: currAdd,
        importedFields: impAdd,
        mappings: initMapping(currAdd, impAdd),
      },
      scalarFields: {
        title: "Basic Parameters",
        description:
          "Match imported basic parameters to your current configuration",
        currentFields: currScalar,
        importedFields: impScalar,
        mappings: initMapping(currScalar, impScalar),
      },
    });

    // floor-rise options
    const maxF = currentConfig.maxFloor ?? 999;
    const impFloors = (importedConfig.floorRiseRules || []).map((r: any) => ({
      key: `${r.startFloor}-${
        r.endFloor == null ? maxF : r.endFloor
      }`,
      displayValue: `+${r.psfIncrement} psf${
        r.jumpEveryFloor
          ? `, jump ${r.jumpIncrement} every ${r.jumpEveryFloor}`
          : ""
      }`,
    }));
    setFloorOptions(impFloors);
    setSelectedFloorKeys(new Set());
    // reset toggles
    setImportBalcony(true);
    setImportFlatAdders(true);
  }, [isOpen, currentConfig, importedConfig]);

  const anyToMap =
    Object.values(sections).some(
      (sec) => sec.currentFields.length && sec.importedFields.length
    ) || floorOptions.length > 0;

  const mappedCount =
    Object.values(sections).reduce(
      (sum, sec) =>
        sum +
        Object.values(sec.mappings).filter(
          (v) => v && v !== "no-match"
        ).length,
      0
    ) +
    selectedFloorKeys.size +
    (importBalcony ? 1 : 0) +
    (importFlatAdders ? 1 : 0);

  const handleValueChange = (
    sectionKey: string,
    currKey: string,
    impKey: string
  ) => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        mappings: {
          ...prev[sectionKey].mappings,
          [currKey]: impKey,
        },
      },
    }));
  };

  const toggleFloorRule = (key: string) => {
    setSelectedFloorKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleFinish = () => {
    const out: any = {};
    Object.keys(sections).forEach((k) => {
      out[k] = sections[k].mappings;
    });
    out.floorRiseRulesApply = Array.from(selectedFloorKeys);
    out.importBalcony = importBalcony;
    out.importFlatAdders = importFlatAdders;
    onMappingComplete(out);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ImportIcon className="h-5 w-5 text-indigo-600" />
            <DialogTitle>Map Configuration Fields</DialogTitle>
          </div>
          <DialogDescription>
            Match or import the fields you need.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 py-2 space-y-4 overflow-y-auto">
          {!anyToMap ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No fields to map</AlertTitle>
              <AlertDescription>
                Imported config didn't match any of your current settings.
              </AlertDescription>
            </Alert>
          ) : mappedCount === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No automatic matches</AlertTitle>
              <AlertDescription>
                Please manually select your mappings below.
              </AlertDescription>
            </Alert>
          ) : null}

          {Object.entries(sections).map(([key, sec]) =>
            sec.currentFields.length && sec.importedFields.length ? (
              <div key={key} className="space-y-3">
                <h3 className="text-lg font-medium text-indigo-700">
                  {sec.title}
                </h3>
                <p className="text-sm text-gray-500">{sec.description}</p>
                <div className="space-y-2">
                  {sec.currentFields.map((cf) => (
                    <div
                      key={cf.key}
                      className="flex items-center gap-3 border border-gray-100 p-2 rounded-md hover:bg-gray-50"
                    >
                      <div className="w-1/3">
                        <Label className="font-medium">
                          {cf.key}
                          <span className="block text-xs text-gray-500">
                            Current: {cf.displayValue}
                          </span>
                        </Label>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <Select
                          value={sec.mappings[cf.key] || ""}
                          onValueChange={(val) =>
                            handleValueChange(key, cf.key, val)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="No match" />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            className="max-h-[300px]"
                            side="top"
                          >
                            <SelectItem value="no-match">No match</SelectItem>
                            {sec.importedFields.map((imp) => (
                              <SelectItem key={imp.key} value={imp.key}>
                                <div>
                                  {imp.key}
                                  <span className="block text-xs text-gray-500">
                                    {imp.displayValue}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}

          {/* Floor-rise rule import */}
          {floorOptions.length > 0 && (
            <div className="space-y-3 border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-lg font-medium text-indigo-700">
                Floor Rise Rules
              </h3>
              <p className="text-sm text-gray-500">
                Check any imported rules you'd like to apply wholesale:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {floorOptions.map((opt) => (
                  <label
                    key={opt.key}
                    className="flex items-center gap-2 cursor-pointer p-2 border border-gray-100 rounded-md hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      className="text-indigo-600 rounded"
                      checked={selectedFloorKeys.has(opt.key)}
                      onChange={() => toggleFloorRule(opt.key)}
                    />
                    <div>
                      <span className="font-medium">{opt.key}</span>
                      <span className="block text-xs text-gray-500">
                        {opt.displayValue}
                      </span>
                    </div>
                  </label>
                ))}

                {/* ── NEW: Balcony import toggle ── */}
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-gray-100 rounded-md hover:bg-gray-50">
                  <input
                    type="checkbox"
                    className="text-indigo-600 rounded"
                    checked={importBalcony}
                    onChange={() => setImportBalcony(!importBalcony)}
                  />
                  <span>Import Balcony Pricing</span>
                </label>

                {/* ── NEW: Flat-Adders import toggle ── */}
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-gray-100 rounded-md hover:bg-gray-50">
                  <input
                    type="checkbox"
                    className="text-indigo-600 rounded"
                    checked={importFlatAdders}
                    onChange={() => setImportFlatAdders(!importFlatAdders)}
                  />
                  <span>Import Flat-Price Adders</span>
                </label>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleFinish} disabled={!anyToMap} className="bg-indigo-600">
            Apply Mappings ({mappedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfigMappingDialog;
