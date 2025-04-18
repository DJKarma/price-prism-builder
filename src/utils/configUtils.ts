// src/utils/configIO.ts
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { toast } from "sonner";

/**
 * Export configuration to JSON
 * - Deep‑clones config
 * - Ensures balconyPricing + floorRiseRules are present (defaults if missing)
 * - Adds simple metadata for easier re‑imports
 */
export function exportConfig(config: any): string {
  // Deep copy
  const cfg = JSON.parse(JSON.stringify(config));

  // Ensure balconyPricing always exists
  cfg.balconyPricing = {
    fullAreaPct: cfg.balconyPricing?.fullAreaPct ?? 0,
    remainderRate: cfg.balconyPricing?.remainderRate ?? 0,
  };

  // Ensure floorRiseRules always exists
  cfg.floorRiseRules = Array.isArray(cfg.floorRiseRules)
    ? cfg.floorRiseRules
    : [];

  // Metadata
  cfg._metadata = {
    exportVersion: "1.0.0",
    exportDate: new Date().toISOString(),
    availableParameters: [
      ...Object.keys(cfg),
      "balconyPricing",
      "floorRiseRules",
    ],
  };

  return JSON.stringify(cfg, null, 2);
}

/**
 * Export all data + optional config + summary into either
 *  • a single XLSX
 *  • or a ZIP containing pricing_data.xlsx + config.json
 */
export async function exportToExcel(
  data: any[],
  includeConfig: boolean,
  config: any,
  summaryData: any[] | null = null
) {
  try {
    const book = XLSX.utils.book_new();
    // Units sheet
    const unitsWs = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(book, unitsWs, "Units");

    // Summary sheet
    if (summaryData) {
      const sumWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(book, sumWs, "Summary");
    }

    const excelBuffer = XLSX.write(book, {
      bookType: "xlsx",
      type: "array",
    });

    if (includeConfig && config) {
      const zip = new JSZip();
      zip.file("pricing_data.xlsx", excelBuffer);

      const cfgJson = exportConfig(config);
      zip.file("config.json", cfgJson);

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, "price_prism_export.zip");
      toast.success("Exported ZIP with data + configuration");
    } else {
      const blob = new Blob([excelBuffer], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "pricing_data.xlsx");
      toast.success("Exported pricing data successfully");
    }
  } catch (err) {
    console.error(err);
    toast.error("Failed to export data");
  }
}

/**
 * Import a JSON config file.
 * — parses
 * — validates required fields (including balconyPricing + floorRiseRules)
 * — lower‑cases keys for case‑insensitive match
 * — fills missing balconyPricing with zeros
 */
export async function importConfig(
  file: File
): Promise<{ config: any; unmatched: string[] }> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const raw = r.result as string;
        const imp = JSON.parse(raw);

        // Must be an object
        if (!imp || typeof imp !== "object") {
          throw new Error("Invalid file format");
        }

        // Required top‑level
        const need = [
          "basePsf",
          "bedroomTypePricing",
          "viewPricing",
          "floorRiseRules",
          "balconyPricing",
        ];
        const missing = need.filter((k) => !(k in imp));
        if (missing.length) {
          throw new Error(
            `Missing required fields: ${missing.join(", ")}`
          );
        }

        // Fill defaults
        imp.floorRiseRules = Array.isArray(imp.floorRiseRules)
          ? imp.floorRiseRules
          : [];
        imp.balconyPricing = {
          fullAreaPct: imp.balconyPricing?.fullAreaPct ?? 0,
          remainderRate: imp.balconyPricing?.remainderRate ?? 0,
        };

        // Known keys (case‑insensitive)
        const known = new Set([
          ...need,
          "targetOverallPsf",
          "additionalCategoryPricing",
          "optimizedTypes",
          "isOptimized",
        ]);

        // Filter out metadata + unknown
        const result: any = {};
        const unmatched: string[] = [];
        Object.entries(imp).forEach(([k, v]) => {
          const lower = k.toLowerCase();
          const match = Array.from(known).find(
            (x) => x.toLowerCase() === lower
          );
          if (match) {
            result[match] = v;
          } else if (!k.startsWith("_")) {
            unmatched.push(k);
          }
        });

        res({ config: result, unmatched });
      } catch (e: any) {
        rej(e);
      }
    };
    r.onerror = () => rej(new Error("Failed to read file"));
    r.readAsText(file);
  });
}

/**
 * Merge an imported config into your current one,
 * only overwriting recognized fields, preserving defaults elsewhere.
 */
export function mergeConfigSelectively(
  current: any,
  incoming: any
): { merged: any; unmatched: string[] } {
  const merged = { ...current };
  const unmatched: string[] = [];
  const skip = new Set(["_metadata"]);

  // Top‑level
  Object.entries(incoming).forEach(([k, v]) => {
    if (skip.has(k)) return;
    if (!(k in current)) {
      unmatched.push(k);
      return;
    }

    // Special: balconyPricing
    if (k === "balconyPricing" && typeof v === "object") {
      merged.balconyPricing = {
        fullAreaPct: v.fullAreaPct ?? current.balconyPricing.fullAreaPct ?? 0,
        remainderRate: v.remainderRate ?? current.balconyPricing.remainderRate ?? 0,
      };
      return;
    }

    // Special: floorRiseRules
    if (k === "floorRiseRules" && Array.isArray(v)) {
      merged.floorRiseRules = v.map((r: any) => ({
        startFloor: r.startFloor,
        endFloor: r.endFloor === null ? null : r.endFloor,
        psfIncrement: r.psfIncrement,
        jumpEveryFloor: r.jumpEveryFloor,
        jumpIncrement: r.jumpIncrement,
      }));
      return;
    }

    // Arrays of objects we match by key-case (bedroomTypePricing, viewPricing, additionalCategoryPricing)
    if (
      Array.isArray(current[k]) &&
      Array.isArray(v) &&
      k !== "floorRiseRules"
    ) {
      // simple replace for now:
      merged[k] = v;
      return;
    }

    // Otherwise, scalar or object – just overwrite
    merged[k] = v;
  });

  return { merged, unmatched };
}
