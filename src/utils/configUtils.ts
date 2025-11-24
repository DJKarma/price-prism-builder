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

  // Ensure maxFloor is included
  cfg.maxFloor = cfg.maxFloor ?? 0;

  // Ensure targetOverallPsf is included
  cfg.targetOverallPsf = cfg.targetOverallPsf ?? 0;

  // Ensure UI state fields are included
  cfg._activeSimTab = cfg._activeSimTab ?? 'configuration';
  cfg._activeOptTab = cfg._activeOptTab ?? 'psf';
  cfg.marginOptimizerOpen = cfg.marginOptimizerOpen ?? false;

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
      "_activeSimTab",
      "_activeOptTab",
      "marginOptimizerOpen",
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

        // Ensure maxFloor exists
        imp.maxFloor = imp.maxFloor ?? 0;

        // Ensure targetOverallPsf exists
        imp.targetOverallPsf = imp.targetOverallPsf ?? 0;

        // Known keys (case-insensitive)
        const known = new Set<string>([
          ...need,
          "maxFloor",
          "targetOverallPsf",
          "additionalCategoryPricing",
          "optimizedTypes",
          "isOptimized",
          "flatPriceAdders",
          "percentageIncrease",
          "projectCost",
          "targetMargins",
          "originalBasePsfs",
          "_activeSimTab",
          "_activeOptTab",
          "marginOptimizerOpen",
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

/**
 * Build Config sheet with pricing parameters and lookup tables
 */
function buildConfigSheet(config: any): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  
  // Helper to set cell value
  const setCell = (ref: string, value: any, type: 'n' | 's' = 's') => {
    ws[ref] = { t: type, v: value };
  };
  
  let row = 1;
  
  // Section A: Cost Parameters
  setCell('A1', 'Parameter');
  setCell('B1', 'Value');
  
  row++;
  setCell(`A${row}`, 'Cost AC PSF');
  setCell(`B${row}`, 0, 'n');
  
  row++;
  setCell(`A${row}`, 'Cost SA PSF');
  setCell(`B${row}`, 0, 'n');
  
  row++;
  setCell(`A${row}`, 'Project Cost');
  setCell(`B${row}`, config.projectCost || 0, 'n');
  
  row++;
  setCell(`A${row}`, 'Balcony Full Area %');
  setCell(`B${row}`, config.balconyPricing?.fullAreaPct || 100, 'n');
  
  row++;
  setCell(`A${row}`, 'Balcony Remainder Rate %');
  setCell(`B${row}`, config.balconyPricing?.remainderRate || 0, 'n');
  
  row++;
  setCell(`A${row}`, 'Percentage Increase');
  setCell(`B${row}`, config.percentageIncrease || 0, 'n');
  
  // Section B: View Pricing Lookup (columns D:E)
  let viewRow = 1;
  setCell(`D${viewRow}`, 'View');
  setCell(`E${viewRow}`, 'PSF Adj');
  
  (config.viewPricing || []).forEach((v: any) => {
    viewRow++;
    setCell(`D${viewRow}`, v.view);
    setCell(`E${viewRow}`, v.psfAdjustment || 0, 'n');
  });
  
  // Section C: Bedroom Type Base PSF (columns G:H)
  let typeRow = 1;
  setCell(`G${typeRow}`, 'Type');
  setCell(`H${typeRow}`, 'Base PSF');
  
  (config.bedroomTypePricing || []).forEach((t: any) => {
    typeRow++;
    setCell(`G${typeRow}`, t.type);
    setCell(`H${typeRow}`, t.basePsf || 0, 'n');
  });
  
  // Section D: Floor Rise Rules (columns J:N)
  let floorRow = 1;
  setCell(`J${floorRow}`, 'Start Floor');
  setCell(`K${floorRow}`, 'End Floor');
  setCell(`L${floorRow}`, 'PSF Inc');
  setCell(`M${floorRow}`, 'Jump Every');
  setCell(`N${floorRow}`, 'Jump Inc');
  
  (config.floorRiseRules || []).forEach((r: any) => {
    floorRow++;
    setCell(`J${floorRow}`, r.startFloor || 0, 'n');
    setCell(`K${floorRow}`, r.endFloor || 0, 'n');
    setCell(`L${floorRow}`, r.psfIncrement || 0, 'n');
    setCell(`M${floorRow}`, r.jumpEveryFloor || 0, 'n');
    setCell(`N${floorRow}`, r.jumpIncrement || 0, 'n');
  });
  
  // Section E: Additional Category Pricing (columns P onwards)
  const additionalCategories = config.additionalCategoryPricing || [];
  const categoryGroups = new Map<string, Array<{category: string, adj: number}>>();
  
  additionalCategories.forEach((cat: any) => {
    if (!categoryGroups.has(cat.column)) {
      categoryGroups.set(cat.column, []);
    }
    categoryGroups.get(cat.column)!.push({
      category: cat.category,
      adj: cat.psfAdjustment || 0
    });
  });
  
  let colOffset = 0;
  categoryGroups.forEach((items, columnName) => {
    const startCol = String.fromCharCode(80 + colOffset * 2); // P, R, T, etc.
    const valCol = String.fromCharCode(81 + colOffset * 2); // Q, S, U, etc.
    
    let catRow = 1;
    setCell(`${startCol}${catRow}`, columnName);
    setCell(`${valCol}${catRow}`, 'PSF Adj');
    
    items.forEach((item) => {
      catRow++;
      setCell(`${startCol}${catRow}`, item.category);
      setCell(`${valCol}${catRow}`, item.adj, 'n');
    });
    
    colOffset++;
  });
  
  // Set range
  ws['!ref'] = 'A1:Z100';
  
  return ws;
}

/**
 * Calculate floor adjustment formula for a given floor
 * 
 * IMPORTANT LIMITATIONS:
 * - This formula approximates the floor premium calculation but does NOT handle:
 *   1. Rule priority and early breaks (it sums ALL matching rules)
 *   2. jumpEveryFloor/jumpIncrement logic (columns M & N in Config sheet)
 * 
 * - For exact calculations, see psfOptimizer.ts calculateFloorPremium()
 * - This Excel formula works well for simple linear floor rises
 * - For complex scenarios with jumps, results may differ slightly from the app
 */
function buildFloorAdjustmentFormula(floorCell: string, configSheetName: string = 'Config'): string {
  // SUMPRODUCT formula that approximates cumulative floor rise:
  // =SUMPRODUCT((floor>=startFloor)*(floor<=endFloor)*
  //   (MIN(floor,endFloor)-startFloor+1)*psfIncrement)
  return `SUMPRODUCT((${floorCell}>=${configSheetName}!$J$2:$J$20)*(${floorCell}<=${configSheetName}!$K$2:$K$20)*` +
         `(MIN(${floorCell},${configSheetName}!$K$2:$K$20)-${configSheetName}!$J$2:$J$20+1)*${configSheetName}!$L$2:$L$20)`;
}

/**
 * Export data with Excel formulas instead of static values
 */
export async function exportToExcelWithFormulas(
  data: any[],
  includeConfig: boolean,
  config: any,
  summaryData: any[] | null = null
) {
  try {
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error("No valid data to export");
    }
    
    const book = XLSX.utils.book_new();
    
    // 1. Create Config sheet
    const configWs = buildConfigSheet(config);
    XLSX.utils.book_append_sheet(book, configWs, "Config");
    
    // 2. Create Units sheet with formulas
    const unitsWs: XLSX.WorkSheet = {};
    
    // Define column mapping
    const columns = [
      { key: 'Name', index: 0 },
      { key: 'Type', index: 1 },
      { key: 'Floor', index: 2 },
      { key: 'View', index: 3 },
      { key: 'Sell Area', index: 4 },
      { key: 'AC Area', index: 5 },
      { key: 'Balcony Area', index: 6 },
      { key: 'Balcony %', index: 7 },
      { key: 'Base PSF', index: 8 },
      { key: 'View PSF Adjustment', index: 9 },
      { key: 'Floor PSF Adjustment', index: 10 },
      { key: 'Add-Cat Premium (Position, Pool, Furniture)', index: 11 },
      { key: 'PSF After All Adjustments', index: 12 },
      { key: 'AC Component', index: 13 },
      { key: 'Balcony Component', index: 14 },
      { key: 'Total Price (unc.)', index: 15 },
      { key: 'Flat Adders', index: 16 },
      { key: 'Final Total Price', index: 17 },
      { key: 'Final PSF', index: 18 },
      { key: 'Final AC PSF', index: 19 },
      { key: 'Unit Cost', index: 20 },
      { key: 'Margin', index: 21 },
      { key: 'Margin %', index: 22 },
      { key: 'Optimized', index: 23 }
    ];
    
    // Helper to get column letter from index
    const getColLetter = (idx: number): string => {
      let letter = '';
      while (idx >= 0) {
        letter = String.fromCharCode((idx % 26) + 65) + letter;
        idx = Math.floor(idx / 26) - 1;
      }
      return letter;
    };
    
    // Create header row
    columns.forEach(col => {
      const cellRef = `${getColLetter(col.index)}1`;
      unitsWs[cellRef] = { t: 's', v: col.key };
    });
    
    // Create data rows with formulas
    data.forEach((unit, rowIdx) => {
      const row = rowIdx + 2; // Excel rows start at 1, header is row 1
      
      // Static data columns
      unitsWs[`A${row}`] = { t: 's', v: unit['Name'] || '' };
      unitsWs[`B${row}`] = { t: 's', v: unit['Type'] || '' };
      unitsWs[`C${row}`] = { t: 'n', v: unit['Floor'] || 0 };
      unitsWs[`D${row}`] = { t: 's', v: unit['View'] || '' };
      unitsWs[`E${row}`] = { t: 'n', v: unit['Sell Area'] || 0 };
      unitsWs[`F${row}`] = { t: 'n', v: unit['AC Area'] || 0 };
      unitsWs[`G${row}`] = { t: 'n', v: unit['Balcony Area'] || 0 };
      unitsWs[`H${row}`] = { t: 'n', v: unit['Balcony %'] || 0 };
      
      // Base PSF - VLOOKUP from Type
      unitsWs[`I${row}`] = { 
        t: 'n', 
        f: `IFERROR(VLOOKUP(B${row},Config!$G$2:$H$20,2,0),0)`,
        v: unit['Base PSF'] || 0 
      };
      
      // View PSF Adjustment - VLOOKUP from View
      unitsWs[`J${row}`] = { 
        t: 'n', 
        f: `IFERROR(VLOOKUP(D${row},Config!$D$2:$E$20,2,0),0)`,
        v: unit['View PSF Adjustment'] || 0 
      };
      
      // Floor PSF Adjustment - Complex SUMPRODUCT formula
      unitsWs[`K${row}`] = { 
        t: 'n', 
        f: `IFERROR(${buildFloorAdjustmentFormula(`C${row}`)},0)`,
        v: unit['Floor PSF Adjustment'] || 0 
      };
      
      // Add-Cat Premium - Currently static (sum of all additional category premiums)
      // TODO: Could add dynamic VLOOKUPs for each category (Position, Pool, Furniture, etc.)
      // For now, using the pre-calculated total for simplicity
      unitsWs[`L${row}`] = { 
        t: 'n', 
        v: unit['Add-Cat Premium (Position, Pool, Furniture)'] || 0,
        c: [{
          a: 'System',
          t: 'Note: This is the sum of all additional category premiums. To make this dynamic, individual category columns and lookup tables would be needed.'
        }]
      };
      
      // PSF After All Adjustments = Base + View + Floor + AddCat
      unitsWs[`M${row}`] = { 
        t: 'n', 
        f: `I${row}+J${row}+K${row}+L${row}`,
        v: unit['PSF After All Adjustments'] || 0 
      };
      
      // AC Component = AC Area * PSF After All Adjustments
      unitsWs[`N${row}`] = { 
        t: 'n', 
        f: `F${row}*M${row}`,
        v: unit['AC Component'] || 0 
      };
      
      // Balcony Component = (BalconyArea * FullAreaPct/100 * PSF) + (BalconyArea * (1-FullAreaPct/100) * RemainderRate/100 * PSF)
      unitsWs[`O${row}`] = { 
        t: 'n', 
        f: `(G${row}*Config!$B$5/100*M${row})+(G${row}*(1-Config!$B$5/100)*Config!$B$6/100*M${row})`,
        v: unit['Balcony Component'] || 0 
      };
      
      // Total Price (unc.) = AC Component + Balcony Component
      unitsWs[`P${row}`] = { 
        t: 'n', 
        f: `N${row}+O${row}`,
        v: unit['Total Price (unc.)'] || 0 
      };
      
      // Flat Adders - Static for now
      unitsWs[`Q${row}`] = { t: 'n', v: unit['Flat Adders'] || 0 };
      
      // Final Total Price = Total Price (unc.) + Flat Adders + (Total Price (unc.) * PercentageIncrease/100)
      unitsWs[`R${row}`] = { 
        t: 'n', 
        f: `P${row}+Q${row}+(P${row}*Config!$B$7/100)`,
        v: unit['Final Total Price'] || 0 
      };
      
      // Final PSF = Final Total Price / Sell Area
      unitsWs[`S${row}`] = { 
        t: 'n', 
        f: `IF(E${row}>0,R${row}/E${row},0)`,
        v: unit['Final PSF'] || 0 
      };
      
      // Final AC PSF = Final Total Price / AC Area
      unitsWs[`T${row}`] = { 
        t: 'n', 
        f: `IF(F${row}>0,R${row}/F${row},0)`,
        v: unit['Final AC PSF'] || 0 
      };
      
      // Unit Cost = (AC Area * Cost AC PSF) + (Balcony Area * Cost SA PSF)
      unitsWs[`U${row}`] = { 
        t: 'n', 
        f: `(F${row}*Config!$B$2)+(G${row}*Config!$B$3)`,
        v: unit['Unit Cost'] || 0 
      };
      
      // Margin = Final Total Price - Unit Cost
      unitsWs[`V${row}`] = { 
        t: 'n', 
        f: `R${row}-U${row}`,
        v: unit['Margin'] || 0 
      };
      
      // Margin % = (Margin / Unit Cost) * 100
      unitsWs[`W${row}`] = { 
        t: 'n', 
        f: `IF(U${row}>0,(V${row}/U${row})*100,0)`,
        v: unit['Margin %'] || 0 
      };
      
      // Optimized
      unitsWs[`X${row}`] = { t: 's', v: unit['Optimized'] || 'No' };
    });
    
    // Set range
    unitsWs['!ref'] = `A1:X${data.length + 1}`;
    XLSX.utils.book_append_sheet(book, unitsWs, "Units");
    
    // 3. Add Summary sheet if provided
    if (summaryData && summaryData.length > 0) {
      const sumWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(book, sumWs, "Summary");
    }
    
    // 4. Write and save
    const excelBuffer = XLSX.write(book, {
      bookType: "xlsx",
      type: "array",
    });
    
    if (includeConfig && config) {
      const zip = new JSZip();
      zip.file("pricing_data_formulas.xlsx", excelBuffer);
      
      const cfgJson = exportConfig(config);
      zip.file("config.json", cfgJson);
      
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, "price_prism_export_formulas.zip");
      toast.success("Exported ZIP with formulas + configuration");
    } else {
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "pricing_data_formulas.xlsx");
      toast.success("Exported pricing data with formulas");
    }
  } catch (err) {
    console.error("Formula export error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown export error";
    toast.error(`Failed to export data with formulas: ${errorMessage}`);
  }
}
