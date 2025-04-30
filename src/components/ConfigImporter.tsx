// src/components/pricing-simulator/ConfigImporter.tsx
import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileJson } from "lucide-react";
import ConfigMappingDialog from "./ConfigMappingDialog";
import { importConfig } from "@/utils/configUtils";

interface ConfigImporterProps {
  onConfigImported: (config: any) => void;
  currentConfig: any;
}

const ConfigImporter: React.FC<ConfigImporterProps> = ({
  onConfigImported,
  currentConfig,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [importedConfig, setImportedConfig] = useState<any>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { config, unmatched } = await importConfig(file);
      if (unmatched.length) {
        toast.warning(
          `Ignored unknown fields: ${unmatched.join(", ")}`
        );
      }
      setImportedConfig(config);
      setShowMappingDialog(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to parse configuration");
    } finally {
      e.target.value = "";
    }
  };

  const handleMappingComplete = (mappings: Record<string, any>) => {
    if (!importedConfig) return;

    // 1) Deep copy your current config so we don't mutate it
    const merged = JSON.parse(JSON.stringify(currentConfig));

    // 2) Bedroom types mapping… (unchanged)
    if (
      merged.bedroomTypePricing &&
      importedConfig.bedroomTypePricing &&
      mappings.bedroomTypes
    ) {
      merged.bedroomTypePricing = merged.bedroomTypePricing.map((item: any) => {
        const mappedKey = mappings.bedroomTypes[item.type];
        if (mappedKey && mappedKey !== "no-match") {
          const imp = importedConfig.bedroomTypePricing.find(
            (b: any) => b.type === mappedKey
          );
          if (imp) {
            return {
              ...item,
              ...Object.fromEntries(
                Object.entries(imp).filter(([k]) => k !== "type")
              ),
            };
          }
        }
        return item;
      });
    }

    // 3) View pricing mapping… (unchanged)
    if (
      merged.viewPricing &&
      importedConfig.viewPricing &&
      mappings.views
    ) {
      merged.viewPricing = merged.viewPricing.map((item: any) => {
        const mappedKey = mappings.views[item.view];
        if (mappedKey && mappedKey !== "no-match") {
          const imp = importedConfig.viewPricing.find(
            (v: any) => v.view === mappedKey
          );
          if (imp) {
            return { ...item, psfAdjustment: imp.psfAdjustment };
          }
        }
        return item;
      });
    }

    // 4) Additional categories mapping… (unchanged)
    if (
      Array.isArray(merged.additionalCategoryPricing) &&
      Array.isArray(importedConfig.additionalCategoryPricing) &&
      mappings.additionalCategories
    ) {
      merged.additionalCategoryPricing = merged.additionalCategoryPricing.map(
        (item: any) => {
          const key = `${item.column}: ${item.category}`;
          const mapped = mappings.additionalCategories[key];
          if (mapped && mapped !== "no-match") {
            const [col, cat] = mapped.split(": ");
            const imp = importedConfig.additionalCategoryPricing.find(
              (c: any) =>
                c.column === col.trim() && c.category === cat.trim()
            );
            if (imp) {
              return { ...item, psfAdjustment: imp.psfAdjustment };
            }
          }
          return item;
        }
      );
    }

    // 5) Scalars (basePsf, maxFloor, targetOverallPsf) mapping… (unchanged)
    if (mappings.scalarFields) {
      const scalarMappings = mappings.scalarFields as Record<string, string>;
      for (const [cur, impField] of Object.entries(scalarMappings)) {
        if (
          impField &&
          impField !== "no-match" &&
          impField in importedConfig
        ) {
          merged[cur] = importedConfig[impField];
        }
      }
    }

    // 6) FLOOR -- replace current rules with chosen imported ones
    const toApply: string[] = mappings.floorRiseRulesApply || [];
    if (Array.isArray(toApply) && toApply.length > 0) {
      merged.floorRiseRules = importedConfig.floorRiseRules.filter(
        (rule: any) => {
          const key = `${rule.startFloor}-${
            rule.endFloor == null
              ? merged.maxFloor || rule.endFloor
              : rule.endFloor
          }`;
          return toApply.includes(key);
        }
      );
    }

    // ── NEW ── 7) Balcony
    if (mappings.importBalcony && importedConfig.balconyPricing) {
      merged.balconyPricing = {
        ...importedConfig.balconyPricing,
      };
    }

    // ── NEW ── 8) Flat-price adders
    if (
      mappings.importFlatAdders &&
      Array.isArray(importedConfig.flatPriceAdders)
    ) {
      merged.flatPriceAdders = importedConfig.flatPriceAdders;
    }

    // Done
    onConfigImported(merged);
    toast.success("Configuration imported successfully");
    setShowMappingDialog(false);
  };

  return (
    <>
      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        onClick={(e) => e.stopPropagation()}
      />

      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="hover-scale"
      >
        <FileJson className="mr-2 h-4 w-4" />
        Import Config
      </Button>

      {showMappingDialog && (
        <ConfigMappingDialog
          isOpen={showMappingDialog}
          onClose={() => setShowMappingDialog(false)}
          currentConfig={currentConfig}
          importedConfig={importedConfig}
          onMappingComplete={handleMappingComplete}
        />
      )}
    </>
  );
};

export default ConfigImporter;
