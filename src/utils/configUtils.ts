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
  // Format as JSON
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

    // Optionally add summary sheet
    if (summaryData) {
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Pricing Summary");
    }

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

    if (includeConfig && config) {
      // Create ZIP with Excel + config
      const zip = new JSZip();
      zip.file("pricing_data.xlsx", excelBuffer);
      const configJson = exportConfig(config);
      zip.file("config.json", configJson);

      const zipContent = await zip.generateAsync({ type: "blob" });
      saveAs(zipContent, "price_prism_export.zip");
      toast.success("Exported ZIP with data and configuration");
    } else {
      // Just export Excel
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

export const importConfig = async (file: File) => {
  return new Promise<{ config: any; unmatchedFields: string[] }>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const importedConfig = JSON.parse(jsonContent);

        // Preliminary check
        if (!importedConfig || typeof importedConfig !== "object") {
          reject(new Error("Invalid configuration file format"));
          return;
        }

        // Allowed fields in pricing configurator
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
          reject(
            new Error(`Missing required fields: ${missingFields.join(", ")}`)
          );
          return;
        }

        // Build a new config that only includes allowed keys
        const filteredConfig: Record<string, any> = {};
        const unmatchedFields: string[] = [];
        for (const key of Object.keys(importedConfig)) {
          if (allowedFields.has(key)) {
            filteredConfig[key] = importedConfig[key];
          } else {
            unmatchedFields.push(key);
          }
        }

        // ====== Deeper Validation ======
        // This step ensures that the arrays in the config have the correct shape.
        // If any mismatch is detected, we reject the file to prevent overwriting.

        // 1) Validate bedroomTypePricing
        if (!Array.isArray(filteredConfig.bedroomTypePricing)) {
          reject(new Error("bedroomTypePricing must be an array"));
          return;
        }
        for (const item of filteredConfig.bedroomTypePricing) {
          if (
            typeof item !== "object" ||
            typeof item.type !== "string" ||
            typeof item.basePsf !== "number"
            // optionally check for targetAvgPsf as well
          ) {
            reject(
              new Error(
                `Invalid bedroomTypePricing entry: must have 'type' (string) and 'basePsf' (number)`
              )
            );
            return;
          }
        }

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
            reject(
              new Error(
                `Invalid viewPricing entry: must have 'view' (string) and 'psfAdjustment' (number)`
              )
            );
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
            // jumpEveryFloor, jumpIncrement can be optional or 0
          ) {
            reject(
              new Error(
                `Invalid floorRiseRules entry: must have 'startFloor' (number), 'endFloor' (number|null), 'psfIncrement' (number)`
              )
            );
            return;
          }
        }

        // 4) Validate additionalCategoryPricing (if present)
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
                  `Invalid additionalCategoryPricing entry: must have 'column', 'category' (strings), and 'psfAdjustment' (number)`
                )
              );
              return;
            }
          }
        }

        // If we pass all checks, resolve
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
