// src/utils/configIO.ts
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { toast } from "sonner";

// Define types for balcony pricing to avoid property access errors
interface BalconyPricing {
  fullAreaPct: number;
  remainderRate: number;
}

/**
 * Export configuration to JSON
 * - Deep-clones config
 * - Ensures balconyPricing + floorRiseRules are present (defaults if missing)
 * - Adds simple metadata for easier re-imports
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

  // Ensure projectCost is included
  cfg.projectCost = cfg.projectCost ?? 0;

  // Ensure targetMargins is included (default to empty object)
  cfg.targetMargins = cfg.targetMargins ?? {};

  // Ensure originalBasePsfs is included (for margin optimizer)
  cfg.originalBasePsfs = cfg.originalBasePsfs ?? {};

  // Extract dynamic fields from additionalCategoryPricing
  const dynamicFields = Array.from(new Set(
    (cfg.additionalCategoryPricing || []).map((item: any) => item.column)
  ));

  // Metadata
  cfg._metadata = {
    exportVersion: "1.0.0",
    exportDate: new Date().toISOString(),
    dynamicFields: dynamicFields, // Include detected dynamic fields
    availableParameters: [
      ...Object.keys(cfg),
      "balconyPricing",
      "floorRiseRules",
      "flatPriceAdders",
      "percentageIncrease",
      "projectCost",
      "targetMargins",
      "originalBasePsfs",
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
    // Validate data before export
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error("No valid data to export");
    }
    
    // Validate config if it's being included
    if (includeConfig && config) {
      const validation = validateConfigStructure(config);
      if (!validation.isValid) {
        console.warn("Config validation failed, but proceeding with export:", validation.errors);
        // Don't throw error here, just log warning and continue
      }
    }
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
    console.error("Export error details:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown export error";
    toast.error(`Failed to export data: ${errorMessage}`);
  }
}

/**
 * Import a JSON config file.
 * — parses
 * — validates required fields (including balconyPricing + floorRiseRules)
 * — lower-cases keys for case-insensitive match
 * — fills missing balconyPricing + flatPriceAdders with defaults
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

        // Required top-level
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

        // Ensure balconyPricing has the correct shape
        const balconyPricing = imp.balconyPricing as BalconyPricing | undefined;
        imp.balconyPricing = {
          fullAreaPct: balconyPricing?.fullAreaPct ?? 0,
          remainderRate: balconyPricing?.remainderRate ?? 0,
        };

        // ── NEW: ensure flatPriceAdders always exists ──
        imp.flatPriceAdders = Array.isArray(imp.flatPriceAdders)
          ? imp.flatPriceAdders
          : [];

        // Ensure projectCost exists
        imp.projectCost = imp.projectCost ?? 0;

        // Ensure targetMargins exists (default to empty object, no errors)
        imp.targetMargins = imp.targetMargins ?? {};

        // Ensure originalBasePsfs exists (default to empty object)
        imp.originalBasePsfs = imp.originalBasePsfs ?? {};

        // Known keys (case-insensitive)
        const known = new Set<string>([
          ...need,
          "targetOverallPsf",
          "additionalCategoryPricing",
          "optimizedTypes",
          "isOptimized",
          "flatPriceAdders",
          "percentageIncrease",
          "projectCost",
          "targetMargins",
          "originalBasePsfs",
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

  // Top-level
  Object.entries(incoming).forEach(([k, v]) => {
    if (skip.has(k)) return;
    if (!(k in current)) {
      unmatched.push(k);
      return;
    }

    // Special: balconyPricing
    if (k === "balconyPricing" && typeof v === "object" && v !== null) {
      const bp = v as BalconyPricing;
      merged.balconyPricing = {
        fullAreaPct:
          bp.fullAreaPct ?? current.balconyPricing?.fullAreaPct ?? 0,
        remainderRate:
          bp.remainderRate ?? current.balconyPricing?.remainderRate ?? 0,
      };
      return;
    }

    // ── NEW: flatPriceAdders ──
    if (k === "flatPriceAdders" && Array.isArray(v)) {
      merged.flatPriceAdders = v.map((a: any) => ({
        units: a.units ?? [],
        columns: a.columns ?? {},
        amount: a.amount ?? 0,
      }));
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

/**
 * Validates that a pricing configuration has all required fields and correct types
 */
export function validateConfigStructure(config: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if config exists
  if (!config || typeof config !== 'object') {
    return { isValid: false, errors: ['Configuration is null or not an object'] };
  }
  
  // Required fields
  const requiredFields = [
    'bedroomTypePricing',
    'viewPricing', 
    'floorRiseRules',
    'balconyPricing'
  ];
  
  requiredFields.forEach(field => {
    if (!(field in config)) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Validate bedroomTypePricing
  if (config.bedroomTypePricing) {
    if (!Array.isArray(config.bedroomTypePricing)) {
      errors.push('bedroomTypePricing must be an array');
    } else {
      config.bedroomTypePricing.forEach((item: any, index: number) => {
        if (!item.type || typeof item.type !== 'string') {
          errors.push(`bedroomTypePricing[${index}] missing or invalid type`);
        }
        if (typeof item.basePsf !== 'number' || item.basePsf < 0) {
          errors.push(`bedroomTypePricing[${index}] invalid basePsf`);
        }
      });
    }
  }
  
  // Validate viewPricing
  if (config.viewPricing) {
    if (!Array.isArray(config.viewPricing)) {
      errors.push('viewPricing must be an array');
    } else {
      config.viewPricing.forEach((item: any, index: number) => {
        if (!item.view || typeof item.view !== 'string') {
          errors.push(`viewPricing[${index}] missing or invalid view`);
        }
        if (typeof item.psfAdjustment !== 'number') {
          errors.push(`viewPricing[${index}] invalid psfAdjustment`);
        }
      });
    }
  }
  
  // Validate floorRiseRules
  if (config.floorRiseRules) {
    if (!Array.isArray(config.floorRiseRules)) {
      errors.push('floorRiseRules must be an array');
    } else {
      config.floorRiseRules.forEach((rule: any, index: number) => {
        if (typeof rule.startFloor !== 'number' || rule.startFloor < 0) {
          errors.push(`floorRiseRules[${index}] invalid startFloor`);
        }
        if (rule.endFloor !== null && (typeof rule.endFloor !== 'number' || rule.endFloor < rule.startFloor)) {
          errors.push(`floorRiseRules[${index}] invalid endFloor`);
        }
        if (typeof rule.psfIncrement !== 'number') {
          errors.push(`floorRiseRules[${index}] invalid psfIncrement`);
        }
      });
    }
  }
  
  // Validate balconyPricing
  if (config.balconyPricing) {
    if (typeof config.balconyPricing !== 'object') {
      errors.push('balconyPricing must be an object');
    } else {
      if (typeof config.balconyPricing.fullAreaPct !== 'number' || 
          config.balconyPricing.fullAreaPct < 0 || 
          config.balconyPricing.fullAreaPct > 100) {
        errors.push('balconyPricing.fullAreaPct must be a number between 0-100');
      }
      if (typeof config.balconyPricing.remainderRate !== 'number' || 
          config.balconyPricing.remainderRate < 0 || 
          config.balconyPricing.remainderRate > 100) {
        errors.push('balconyPricing.remainderRate must be a number between 0-100');
      }
    }
  }
  
  // Validate additionalCategoryPricing if present
  if (config.additionalCategoryPricing && !Array.isArray(config.additionalCategoryPricing)) {
    errors.push('additionalCategoryPricing must be an array');
  }
  
  // Validate flatPriceAdders if present
  if (config.flatPriceAdders && !Array.isArray(config.flatPriceAdders)) {
    errors.push('flatPriceAdders must be an array');
  }
  
  // Ensure essential defaults exist
  if (!config.flatPriceAdders) {
    config.flatPriceAdders = [];
  }
  
  if (!config.additionalCategoryPricing) {
    config.additionalCategoryPricing = [];
  }
  
  return { isValid: errors.length === 0, errors };
}
