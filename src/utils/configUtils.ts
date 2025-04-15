import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { toast } from 'sonner';

// Export configuration as JSON
export const exportConfig = (config: any) => {
  // Create a deep copy of the config to avoid modifying the original
  const configCopy = JSON.parse(JSON.stringify(config));
  
  // Ensure we're exporting the actual current state
  const configJson = JSON.stringify(configCopy, null, 2);
  return configJson;
};

// Export excel file with additional summary sheet
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Units');
    
    // Add summary sheet if available
    if (summaryData) {
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Pricing Summary');
    }
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    if (includeConfig && config) {
      // Create a zip file with both Excel and config
      const zip = new JSZip();
      
      // Add Excel file to zip
      zip.file('pricing_data.xlsx', excelBuffer);
      
      // Add config file to zip with the current configuration
      const configJson = exportConfig(config);
      zip.file('config.json', configJson);
      
      // Generate zip file
      const zipContent = await zip.generateAsync({ type: 'blob' });
      saveAs(zipContent, 'price_prism_export.zip');
      toast.success('Exported ZIP with data and configuration');
    } else {
      // Just export the Excel file
      const excelBlob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      saveAs(excelBlob, 'pricing_data.xlsx');
      toast.success('Exported pricing data successfully');
    }
  } catch (error) {
    console.error('Export error:', error);
    toast.error('Failed to export data');
  }
};

// Import configuration from JSON with improved validation
export const importConfig = async (file: File) => {
  return new Promise<{ config: any; unmatchedFields: string[] }>((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const importedConfig = JSON.parse(jsonContent);
        
        // Validate the imported config
        if (!importedConfig || typeof importedConfig !== 'object') {
          reject(new Error('Invalid configuration file format'));
          return;
        }
        
        // Fields that should exist in a valid PricingConfig
        const requiredFields = [
          'basePsf',
          'bedroomTypePricing',
          'viewPricing',
          'floorRiseRules'
        ];
        
        // Known fields including optional ones
        const knownFields = new Set([
          ...requiredFields,
          'targetOverallPsf',
          'maxFloor',
          'additionalPricingFactors',
          'additionalCategoryPricing',
          'optimizedTypes',
          'isOptimized'
        ]);
        
        // Check for required fields
        const missingFields = requiredFields.filter(
          (field) => !(field in importedConfig)
        );
        
        if (missingFields.length > 0) {
          reject(new Error(`Missing required fields: ${missingFields.join(', ')}`));
          return;
        }
        
        // Initialize floor rise rules with default values
        if (importedConfig.floorRiseRules) {
          importedConfig.floorRiseRules = importedConfig.floorRiseRules.map((rule: any) => ({
            ...rule,
            psfIncrement: rule.psfIncrement !== undefined ? rule.psfIncrement : 0,
            jumpEveryFloor: rule.jumpEveryFloor !== undefined ? rule.jumpEveryFloor : 0,
            jumpIncrement: rule.jumpIncrement !== undefined ? rule.jumpIncrement : 0
          }));
        }
        
        // Collect fields that exist in the imported config but not in our schema
        const unmatchedFields = Object.keys(importedConfig).filter(
          (key) => !knownFields.has(key)
        );
        
        // Only keep known fields in the resulting config
        const filteredConfig = {};
        knownFields.forEach(field => {
          if (field in importedConfig) {
            (filteredConfig as any)[field] = importedConfig[field];
          }
        });
        
        resolve({ config: filteredConfig, unmatchedFields });
      } catch (error) {
        reject(new Error('Failed to parse configuration file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read configuration file'));
    };
    
    reader.readAsText(file);
  });
};
