import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { toast } from "sonner";
import { PricingConfig } from "@/components/PricingConfiguration"; // Adjust path if necessary

// =======================
// Export Configuration
// =======================

export const exportConfig = (config: any) => {
  // Deep copy the configuration to avoid mutations
  const configCopy = JSON.parse(JSON.stringify(config));
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

    // Add summary sheet if provided
    if (summaryData) {
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Pricing Summary");
    }

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

    if (includeConfig && config) {
      // Create a ZIP containing both the Excel file and the config JSON
      const zip = new JSZip();
      zip.file("pricing_data.xlsx", excelBuffer);
      const configJson = exportConfig(config);
      zip.file("config.json", configJson);
      const zipContent = await zip.generateAsync({ type: "blob" });
      saveAs(zipContent, "price_prism_export.zip");
      toast.success("Exported ZIP with data and configuration");
    } else {
      // Export only the Excel file
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
// Import & Validate Config with Full Schema Validation
// =======================

/**
 * Import configuration from a JSON file with comprehensive validation.
 *
 * @param file - The configuration file to import.
 * @param currentConfig - Your current PricingConfig object.
 *                        This is used to filter entries, for instance, only allowing bedroom types that
 *                        already exist in your pricing configurator.
 * @returns A Promise resolving with an object containing the filtered configuration and an array of unmatched fields.
 */
export const importConfig = async (
  file: File,
  currentConfig?: PricingConfig
) => {
  return new Promise<{ config: any; unmatchedFields: string[] }>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const importedConfig = JSON.parse(jsonContent);

        if (!importedConfig || typeof importedConfig !== "object") {
          reject(new Error("Invalid configuration file format"));
          return;
        }

        // Define allowed top-level fields for your pricing configurator
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

        // Required fields must be present
        const requiredFields = [
          "basePsf",
          "bedroomTypePricing",
          "viewPricing",
          "floorRiseRules",
        ];

        const missingFields = requiredFields.filter(
          (field) => !(field in importedConfig)
        );
        if (missingFields.length > 0) {
          reject(new Error(`Missing required fields: ${missingFields.join(", ")}`));
          return;
        }

        // Build filtered configuration: include only allowed keys
        const filteredConfig: Record<string, any> = {};
        const unmatchedFields: string[] = [];
        Object.keys(importedConfig).forEach((key) => {
          if (allowedFields.has(key)) {
            filteredConfig[key] = importedConfig[key];
          } else {
            unmatchedFields.push(key);
          }
        });

        // ---------- Scalar Validations ----------

        // Validate basePsf
        if (typeof filteredConfig.basePsf !== "number" || filteredConfig.basePsf <= 0) {
          reject(new Error("Invalid value for basePsf. It must be a positive number."));
          return;
        }

        // Validate targetOverallPsf if present
        if (
          "targetOverallPsf" in filteredConfig &&
          typeof filteredConfig.targetOverallPsf !== "number"
        ) {
          reject(new Error("Invalid value for targetOverallPsf. It must be a number."));
          return;
        }

        // Validate isOptimized if present
        if (
          "isOptimized" in filteredConfig &&
          typeof filteredConfig.isOptimized !== "boolean"
        ) {
          reject(new Error("Invalid value for isOptimized. It must be a boolean."));
          return;
        }

        // Validate maxFloor if present
        if ("maxFloor" in filteredConfig && typeof filteredConfig.maxFloor !== "number") {
          reject(new Error("Invalid value for maxFloor. It must be a number."));
          return;
        }

        // Validate optimizedTypes if present
        if (
          "optimizedTypes" in filteredConfig &&
          (!Array.isArray(filteredConfig.optimizedTypes) ||
           !filteredConfig.optimizedTypes.every((item: any) => typeof item === "string"))
        ) {
          reject(new Error("Invalid value for optimizedTypes. It must be an array of strings."));
          return;
        }

        // ---------- Array Validations ----------

        // 1) Validate bedroomTypePricing
        if (!Array.isArray(filteredConfig.bedroomTypePricing)) {
          reject(new Error("bedroomTypePricing must be an array"));
          return;
        }
        let allowedBedroomTypes: string[] = [];
        if (currentConfig && Array.isArray(currentConfig.bedroomTypePricing)) {
          allowedBedroomTypes = currentConfig.bedroomTypePricing.map(
            (item) => item.type
          );
        }
        filteredConfig.bedroomTypePricing = filteredConfig.bedroomTypePricing.filter(
          (item: any) => {
            if (
              typeof item !== "object" ||
              typeof item.type !== "string" ||
              typeof item.basePsf !== "number" ||
              typeof item.targetAvgPsf !== "number"
            ) {
              reject(
                new Error(
                  "Invalid bedroomTypePricing entry: each must have 'type' (string), 'basePsf' (number), and 'targetAvgPsf' (number)"
                )
              );
              return false;
            }
            // Only keep bedroom type entries if currentConfig is provided and the type exists in your current configuration.
            return allowedBedroomTypes.length === 0 || allowedBedroomTypes.includes(item.type);
          }
        );

        // 2) Validate viewPricing
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
            reject(new Error("Invalid viewPricing entry: each must have 'view' (string) and 'psfAdjustment' (number)"));
            return;
          }
        }

        // 3) Validate floorRiseRules
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
            reject(new Error("Invalid floorRiseRules entry: each must have 'startFloor' (number), 'endFloor' (number|null), and 'psfIncrement' (number)"));
            return;
          }
        }

        // 4) Validate additionalCategoryPricing if present
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
              reject(new Error("Invalid additionalCategoryPricing entry: each must have 'column' and 'category' (strings) and 'psfAdjustment' (number)"));
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
