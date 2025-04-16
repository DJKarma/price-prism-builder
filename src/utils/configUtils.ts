import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { toast } from "sonner";

// =======================
// Export Configuration
// =======================

// Export configuration as JSON
export const exportConfig = (config: any) => {
  // Create a deep copy of the config to avoid modifying the original
  const configCopy = JSON.parse(JSON.stringify(config));
  // Ensure we're exporting the actual current state
  const configJson = JSON.stringify(configCopy, null, 2);
  return configJson;
};

// =======================
// Export to Excel
// =======================

export const exportToExcel = async (
  data: any[],
  includeConfig: boolean = false,
  config: any = null,
  summaryData: any[] | null = null
) => {
  try {
    const workbook = XLSX.utils.book_new();

    // Main data sheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Units");

    // Add summary sheet if available
    if (summaryData) {
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Pricing Summary");
    }

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

    if (includeConfig && config) {
      // Create a zip file with both Excel and config
      const zip = new JSZip();
      zip.file("pricing_data.xlsx", excelBuffer);
      const configJson = exportConfig(config);
      zip.file("config.json", configJson);
      const zipContent = await zip.generateAsync({ type: "blob" });
      saveAs(zipContent, "price_prism_export.zip");
      toast.success("Exported ZIP with data and configuration");
    } else {
      // Just export the Excel file
      const excelBlob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(excelBlob, "pricing_data.xlsx");
      toast.success("Exported pricing data successfully");
    }
  } catch (error) {
    console.error("Export error:", error);
    toast.error("Failed to export data");
  }
};

// =======================
// Import & Validate Config
// =======================

/**
 * Import configuration from a JSON file.
 * 
 * @param file - the configuration file to import.
 * @param currentBedroomTypes (optional) - an array of allowed bedroom type strings.
 *        When provided, only bedroomTypePricing entries with a matching type will be kept.
 * @returns A promise with the validated and filtered configuration as well as unmatched fields.
 */
export const importConfig = async (
  file: File,
  currentBedroomTypes?: string[]
) => {
  return new Promise<{ config: any; unmatchedFields: string[] }>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const importedConfig = JSON.parse(jsonContent);

        // Preliminary check to ensure valid JSON
        if (!importedConfig || typeof importedConfig !== "object") {
          reject(new Error("Invalid configuration file format"));
          return;
        }

        // Define the allowed top-level fields for your pricing configurator
        const allowedFields = new Set([
          "basePsf",
          "bedroomTypePricing",
          "viewPricing",
          "floorRiseRules",
          "additionalCategoryPricing",
          "targetOverallPsf",
          "isOptimized",
          "maxFloor",
          "optimizedTypes",
        ]);

        // Required top-level fields
        const requiredFields = [
          "basePsf",
          "bedroomTypePricing",
          "viewPricing",
          "floorRiseRules",
        ];

        // Check for required fields
        const missingFields = requiredFields.filter(
          (field) => !(field in importedConfig)
        );
        if (missingFields.length > 0) {
          reject(new Error(`Missing required fields: ${missingFields.join(", ")}`));
          return;
        }

        // Build a filtered config that only includes allowed keys and collect unmatched keys
        const filteredConfig: Record<string, any> = {};
        const unmatchedFields: string[] = [];
        Object.keys(importedConfig).forEach((key) => {
          if (allowedFields.has(key)) {
            filteredConfig[key] = importedConfig[key];
          } else {
            unmatchedFields.push(key);
          }
        });

        // ----- Deep Validation -----

        // Validate bedroomTypePricing array
        if (!Array.isArray(filteredConfig.bedroomTypePricing)) {
          reject(new Error("bedroomTypePricing must be an array"));
          return;
        }
        // If a current list of bedroom types is provided, filter out entries not matching it.
        filteredConfig.bedroomTypePricing = filteredConfig.bedroomTypePricing.filter(
          (item: any) => {
            if (typeof item !== "object" || typeof item.type !== "string" || typeof item.basePsf !== "number") {
              reject(new Error(`Invalid bedroomTypePricing entry: must have 'type' (string) and 'basePsf' (number)`));
              return false;
            }
            // Only keep if currentBedroomTypes is not provided or the type exists in currentBedroomTypes
            if (currentBedroomTypes && currentBedroomTypes.length > 0) {
              return currentBedroomTypes.includes(item.type);
            }
            return true;
          }
        );

        // Validate viewPricing array
        if (!Array.isArray(filteredConfig.viewPricing)) {
          reject(new Error("viewPricing must be an array"));
          return;
        }
        for (const item of filteredConfig.viewPricing) {
          if (
            typeof item !== "object" ||
            typeof item.view !== "string" ||
            typeof item.psfAdjustment !== "number"
          ) {
            reject(
              new Error(
                "Invalid viewPricing entry: must have 'view' (string) and 'psfAdjustment' (number)"
              )
            );
            return;
          }
        }

        // Validate floorRiseRules array
        if (!Array.isArray(filteredConfig.floorRiseRules)) {
          reject(new Error("floorRiseRules must be an array"));
          return;
        }
        for (const rule of filteredConfig.floorRiseRules) {
          if (
            typeof rule !== "object" ||
            typeof rule.startFloor !== "number" ||
            (rule.endFloor !== null && typeof rule.endFloor !== "number") ||
            typeof rule.psfIncrement !== "number"
          ) {
            reject(
              new Error(
                "Invalid floorRiseRules entry: must have 'startFloor' (number), 'endFloor' (number|null), and 'psfIncrement' (number)"
              )
            );
            return;
          }
        }

        // Validate additionalCategoryPricing if present
        if (
          filteredConfig.additionalCategoryPricing &&
          !Array.isArray(filteredConfig.additionalCategoryPricing)
        ) {
          reject(new Error("additionalCategoryPricing must be an array if present"));
          return;
        }
        if (Array.isArray(filteredConfig.additionalCategoryPricing)) {
          for (const catItem of filteredConfig.additionalCategoryPricing) {
            if (
              typeof catItem !== "object" ||
              typeof catItem.column !== "string" ||
              typeof catItem.category !== "string" ||
              typeof catItem.psfAdjustment !== "number"
            ) {
              reject(
                new Error(
                  "Invalid additionalCategoryPricing entry: must have 'column', 'category' (strings), and 'psfAdjustment' (number)"
                )
              );
              return;
            }
          }
        }

        resolve({ config: filteredConfig, unmatchedFields });
      } catch (error) {
        reject(new Error("Failed to parse configuration file"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read configuration file"));
    };

    reader.readAsText(file);
  });
};
