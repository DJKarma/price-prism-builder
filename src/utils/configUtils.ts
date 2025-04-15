import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { toast } from 'sonner';

// Export configuration as JSON with improved parameter inclusion
export const exportConfig = (config: any) => {
  // Create a deep copy of the config to avoid modifying the original
  const configCopy = JSON.parse(JSON.stringify(config));
  
  // Add metadata to help with future imports
  configCopy._metadata = {
    exportVersion: "1.0.0",
    exportDate: new Date().toISOString(),
    availableParameters: Object.keys(configCopy).filter(k => !k.startsWith('_'))
  };
  
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

// Import configuration from JSON with strict parameter validation
export const importConfig = async (file: File) => {
  return new Promise<{ config: any; unmatchedFields: string[] }>((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const importedConfig = JSON.parse(jsonContent);
        
        // Validate the imported config (basic validation)
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
        
        // Check for required fields
        const missingFields = requiredFields.filter(
          (field) => !(field in importedConfig)
        );
        
        if (missingFields.length > 0) {
          reject(new Error(`Missing required fields: ${missingFields.join(', ')}`));
          return;
        }
        
        // Get current pricing config from store or use an empty object
        let currentConfig: any = {};
        
        // Collect fields that exist in the imported config but not in our schema
        const knownFields = new Set([
          ...requiredFields,
          'targetOverallPsf',
          'maxFloor',
          'additionalPricingFactors',
          'additionalCategoryPricing',
          'optimizedTypes',
          'isOptimized',
          '_metadata' // Ignore metadata field
        ]);
        
        // Find fields in imported config that aren't in our known schema
        const unmatchedFields = Object.keys(importedConfig).filter(
          (key) => !knownFields.has(key.toLowerCase()) && !key.startsWith('_')
        );
        
        // Create a new config with only the fields that match our schema
        const filteredConfig: Record<string, any> = {};
        
        // Only copy fields that exist in our known schema
        Object.entries(importedConfig).forEach(([key, value]) => {
          // Skip metadata and unknown fields
          if (key.startsWith('_') || !knownFields.has(key.toLowerCase())) {
            return;
          }
          
          // Case-insensitive matching for object keys
          const matchedKey = Array.from(knownFields).find(
            k => k.toLowerCase() === key.toLowerCase()
          );
          
          if (matchedKey) {
            filteredConfig[matchedKey] = value;
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
