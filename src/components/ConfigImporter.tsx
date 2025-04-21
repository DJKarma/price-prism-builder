import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileJson } from "lucide-react";
import ConfigMappingDialog from "./ConfigMappingDialog";

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

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const txt = ev.target?.result as string;
        try {
          const parsed = JSON.parse(txt);
          const required = ["bedroomTypePricing", "viewPricing", "floorRiseRules"];
          const missing = required.filter((r) => !parsed[r]);
          if (missing.length) {
            toast.error(`Missing sections: ${missing.join(", ")}`);
            return;
          }
          setImportedConfig(parsed);
          setShowMappingDialog(true);
          fileInputRef.current!.value = "";
        } catch {
          toast.error("Failed to parse JSON");
        }
      };
      reader.readAsText(file);
    } catch {
      toast.error("Failed to read file");
    }
  };

  const handleMappingComplete = (mappings: Record<string, any>) => {
    if (!importedConfig) return;
    try {
      const mapped = JSON.parse(JSON.stringify(currentConfig));

      // bedroomTypes mapping…
      if (mapped.bedroomTypePricing && importedConfig.bedroomTypePricing) {
        mapped.bedroomTypePricing = mapped.bedroomTypePricing.map((item: any) => {
          const m = mappings.bedroomTypes[item.type];
          if (!m || m === "no-match") return item;
          const imp = importedConfig.bedroomTypePricing.find(
            (x: any) => x.type === m
          );
          if (imp) {
            Object.keys(item).forEach((k) => {
              if (k in imp && k !== "type") item[k] = imp[k];
            });
          }
          return item;
        });
      }

      // viewPricing mapping…
      if (mapped.viewPricing && importedConfig.viewPricing) {
        mapped.viewPricing = mapped.viewPricing.map((item: any) => {
          const m = mappings.views[item.view];
          if (!m || m === "no-match") return item;
          const imp = importedConfig.viewPricing.find((x: any) => x.view === m);
          if (imp) {
            Object.keys(item).forEach((k) => {
              if (k in imp && k !== "view") item[k] = imp[k];
            });
          }
          return item;
        });
      }

      // additionalCategoryPricing mapping…
      if (
        mapped.additionalCategoryPricing &&
        importedConfig.additionalCategoryPricing &&
        mappings.additionalCategories
      ) {
        mapped.additionalCategoryPricing = mapped.additionalCategoryPricing.map(
          (item: any) => {
            const key = `${item.column}: ${item.category}`;
            const m = mappings.additionalCategories[key];
            if (!m || m === "no-match") return item;
            const [col, cat] = m.split(": ");
            const imp = importedConfig.additionalCategoryPricing.find(
              (x: any) => x.column === col && x.category === cat
            );
            if (imp) {
              Object.keys(item).forEach((k) => {
                if (k in imp && k !== "column" && k !== "category") {
                  item[k] = imp[k];
                }
              });
            }
            return item;
          }
        );
      }

      // floorRiseRules mapping…
      if (mapped.floorRiseRules && importedConfig.floorRiseRules) {
        mapped.floorRiseRules = mapped.floorRiseRules.map((rule: any) => {
          const key = `${rule.startFloor}-${rule.endFloor}`;
          const m = mappings.floorRiseRules[key];
          if (!m || m === "no-match") return rule;
          const [s, e] = m.split("-").map(Number);
          const imp = importedConfig.floorRiseRules.find(
            (x: any) => x.startFloor === s && x.endFloor === e
          );
          if (imp) {
            Object.keys(rule).forEach((k) => {
              if (k in imp && k !== "startFloor" && k !== "endFloor") {
                rule[k] = imp[k];
              }
            });
          }
          return rule;
        });
      }

      // scalarFields mapping (including balconyPricing)
      if (mappings.scalarFields) {
        Object.entries(mappings.scalarFields).forEach(
          ([dest, src]) => {
            if (src && src !== "no-match" && src in importedConfig) {
              mapped[dest] = importedConfig[src];
            }
          }
        );
      }

      // **ensure balconyPricing** is carried over if present
      if (importedConfig.balconyPricing) {
        mapped.balconyPricing = {
          fullAreaPct:
            importedConfig.balconyPricing.fullAreaPct ??
            mapped.balconyPricing?.fullAreaPct ??
            100,
          remainderRate:
            importedConfig.balconyPricing.remainderRate ??
            mapped.balconyPricing?.remainderRate ??
            0,
        };
      }

      onConfigImported(mapped);
      toast.success("Configuration imported");
    } catch (err) {
      console.error(err);
      toast.error("Failed to apply mappings");
    } finally {
      setShowMappingDialog(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
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
      <ConfigMappingDialog
        isOpen={showMappingDialog}
        onClose={() => setShowMappingDialog(false)}
        currentConfig={currentConfig}
        importedConfig={importedConfig}
        onMappingComplete={handleMappingComplete}
      />
    </div>
  );
};

export default ConfigImporter;
