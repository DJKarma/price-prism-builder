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
    availableParameters: Object.keys(configCopy).filter(k => !k.startsWith('_')),
    fieldMappings: {
      bedroomTypePricing: configCopy.bedroomTypePricing?.map((item: any) => item.type) || [],
      viewPricing: configCopy.viewPricing?.map((item: any) => item.view) || [],
      additionalCategoryPricing: configCopy.additionalCategoryPricing?.map(
  (item: any) => `${item.column}: ${item.category} (Adjustment: ${item.psfAdjustment})`
) || []

    }
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
            // For arrays of objects, we need special handling for case matching
            if (matchedKey === 'bedroomTypePricing' && Array.isArray(value)) {
              filteredConfig[matchedKey] = processCaseInsensitiveArrays(value, 'type');
            } else if (matchedKey === 'viewPricing' && Array.isArray(value)) {
              filteredConfig[matchedKey] = processCaseInsensitiveArrays(value, 'view');
            } else if (matchedKey === 'additionalCategoryPricing' && Array.isArray(value)) {
              // For additional categories, we need to handle case matching for both column and category
              filteredConfig[matchedKey] = processCaseInsensitiveAdditionalCategories(value);
            } else {
              filteredConfig[matchedKey] = value;
            }
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

// Helper function to process arrays with case-insensitive matching
const processCaseInsensitiveArrays = (items: any[], keyField: string) => {
  // Preserve the original case of the values in the array
  return items.map(item => {
    // Create a new object for each item to avoid modifying the original
    const processedItem: Record<string, any> = {};
    Object.entries(item).forEach(([key, value]) => {
      processedItem[key] = value;
    });
    return processedItem;
  });
};

// Helper function to process additional category arrays with case-insensitive matching
const processCaseInsensitiveAdditionalCategories = (categories: any[]) => {
  // Preserve the original case of both column and category
  return categories.map(item => {
    // Create a new object for each item to avoid modifying the original
    const processedItem: Record<string, any> = {
      column: item.column,
      category: item.category,
      psfAdjustment: item.psfAdjustment
    };
    return processedItem;
  });
};

// Selective import that only updates existing fields in current config
export const mergeConfigSelectively = (
  currentConfig: any, 
  importedConfig: any
): { mergedConfig: any; unmatchedFields: string[] } => {
  // Make copies to avoid modifying originals
  const result = JSON.parse(JSON.stringify(currentConfig || {}));
  const unmatchedFields: string[] = [];
  
  // Skip metadata fields
  const skipFields = ['_metadata'];
  
  // Process top-level fields
  Object.keys(importedConfig).forEach(key => {
    if (skipFields.includes(key)) return;
    
    // If field doesn't exist in current config, track as unmatched
    if (!(key in result)) {
      unmatchedFields.push(key);
      return;
    }
    
    // Handle special cases for array fields that need matching by ID or key
    if (key === 'bedroomTypePricing') {
      result[key] = mergeArrayByKey(result[key], importedConfig[key], 'type', unmatchedFields);
    } 
    else if (key === 'viewPricing') {
      result[key] = mergeArrayByKey(result[key], importedConfig[key], 'view', unmatchedFields);
    } 
    else if (key === 'additionalCategoryPricing') {
      result[key] = mergeAdditionalCategories(result[key], importedConfig[key], unmatchedFields);
    } 
    else if (key === 'floorRiseRules') {
      // For floor rise rules we match by start/end floor range
      result[key] = mergeFloorRules(result[key], importedConfig[key], unmatchedFields);
    }
    else if (typeof importedConfig[key] !== 'object' || importedConfig[key] === null) {
      // Simple value fields (numbers, strings, booleans)
      result[key] = importedConfig[key];
    }
    else {
      // For nested objects that aren't special cases
      const nestedResult = mergeNestedObject(result[key], importedConfig[key], unmatchedFields, key);
      result[key] = nestedResult.merged;
      // Extend unmatchedFields with any nested unmatched fields
      unmatchedFields.push(...nestedResult.unmatched.map(field => `${key}.${field}`));
    }
  });
  
  return { mergedConfig: result, unmatchedFields };
};

// Helper for merging nested objects
const mergeNestedObject = (current: any, imported: any, unmatchedFields: string[], parentKey: string) => {
  const result = { ...current };
  const unmatched: string[] = [];
  
  if (!current || typeof current !== 'object') {
    // If current is not an object, we can't merge
    return { merged: current, unmatched: Object.keys(imported) };
  }
  
  Object.keys(imported).forEach(key => {
    if (!(key in current)) {
      unmatched.push(key);
      return;
    }
    
    if (typeof imported[key] !== 'object' || imported[key] === null) {
      // Simple value
      result[key] = imported[key];
    } else {
      // Recursively merge nested objects
      const nestedResult = mergeNestedObject(current[key], imported[key], unmatchedFields, `${parentKey}.${key}`);
      result[key] = nestedResult.merged;
      unmatched.push(...nestedResult.unmatched.map(field => `${key}.${field}`));
    }
  });
  
  return { merged: result, unmatched };
};

// Helper for merging arrays by a key field (case-insensitive)
const mergeArrayByKey = (currentArray: any[], importedArray: any[], keyField: string, unmatchedFields: string[]) => {
  if (!Array.isArray(currentArray) || !currentArray.length) return currentArray;
  if (!Array.isArray(importedArray) || !importedArray.length) return currentArray;
  
  // Create a deep copy to avoid modifying the original
  const result = JSON.parse(JSON.stringify(currentArray));
  
  // Build a map of current items by their key (case-insensitive)
  const currentMap = new Map();
  result.forEach((item, index) => {
    if (item[keyField]) {
      currentMap.set(item[keyField].toLowerCase(), index);
    }
  });
  
  // For each imported item, try to find a matching current item
  importedArray.forEach(importedItem => {
    if (!importedItem[keyField]) return;
    
    const importedKey = importedItem[keyField].toLowerCase();
    
    // Find the index of the matching item (case-insensitive)
    const matchingIndex = currentMap.get(importedKey);
    
    if (matchingIndex !== undefined) {
      // If we found a match, update the values but preserve the original keyField
      const originalKeyValue = result[matchingIndex][keyField];
      
      // Update all fields except the key field
      Object.keys(importedItem).forEach(field => {
        if (field !== keyField) {
          result[matchingIndex][field] = importedItem[field];
        }
      });
      
      // Ensure we keep the original case of the key field
      result[matchingIndex][keyField] = originalKeyValue;
    } else {
      // If no match found, track as unmatched
      unmatchedFields.push(`${keyField}:${importedItem[keyField]}`);
    }
  });
  
  return result;
};

// Helper for merging additional categories
const mergeAdditionalCategories = (currentArray: any[], importedArray: any[], unmatchedFields: string[]) => {
  if (!Array.isArray(currentArray) || !currentArray.length) return currentArray;
  if (!Array.isArray(importedArray) || !importedArray.length) return currentArray;
  
  // Create a deep copy to avoid modifying the original
  const result = JSON.parse(JSON.stringify(currentArray));
  
  // Build a map of current items by their combined column+category key (case-insensitive)
  const currentMap = new Map();
  result.forEach((item, index) => {
    if (item.column && item.category) {
      const key = `${item.column.toLowerCase()}:${item.category.toLowerCase()}`;
      currentMap.set(key, index);
    }
  });
  
  // For each imported item, try to find a matching current item
  importedArray.forEach(importedItem => {
    if (!importedItem.column || !importedItem.category) return;
    
    const importedKey = `${importedItem.column.toLowerCase()}:${importedItem.category.toLowerCase()}`;
    
    // Find the index of the matching item (case-insensitive)
    const matchingIndex = currentMap.get(importedKey);
    
    if (matchingIndex !== undefined) {
      // If we found a match, update the values but preserve the original column/category
      const originalColumn = result[matchingIndex].column;
      const originalCategory = result[matchingIndex].category;
      
      // Update all fields
      Object.keys(importedItem).forEach(field => {
        if (field !== 'column' && field !== 'category') {
          result[matchingIndex][field] = importedItem[field];
        }
      });
      
      // Ensure we keep the original case of column/category
      result[matchingIndex].column = originalColumn;
      result[matchingIndex].category = originalCategory;
    } else {
      // If no match found, track as unmatched
      unmatchedFields.push(`${importedItem.column}:${importedItem.category}`);
    }
  });
  
  return result;
};

// Helper for merging floor rise rules
const mergeFloorRules = (currentRules: any[], importedRules: any[], unmatchedFields: string[]) => {
  if (!Array.isArray(currentRules) || !currentRules.length) return currentRules;
  if (!Array.isArray(importedRules) || !importedRules.length) return currentRules;
  
  // Create a deep copy to avoid modifying the original
  const result = JSON.parse(JSON.stringify(currentRules));
  
  // For each imported rule, try to find a matching current rule by floor range
  importedRules.forEach(importedRule => {
    const importedStart = importedRule.startFloor;
    const importedEnd = importedRule.endFloor;
    
    if (typeof importedStart !== 'number') return;
    
    // Try to find an exact match by start and end floor
    const exactMatchIndex = result.findIndex(rule => 
      rule.startFloor === importedStart && 
      rule.endFloor === importedEnd
    );
    
    if (exactMatchIndex !== -1) {
      // Found exact match, update all fields except start/end floor
      const fieldsToUpdate = ['psfIncrement', 'jumpEveryFloor', 'jumpIncrement'];
      fieldsToUpdate.forEach(field => {
        if (field in importedRule) {
          result[exactMatchIndex][field] = importedRule[field];
        }
      });
    } else {
      // Try to find an overlapping range
      const overlappingIndex = result.findIndex(rule => {
        const ruleStart = rule.startFloor;
        const ruleEnd = rule.endFloor === null ? Infinity : rule.endFloor;
        const importedEndValue = importedEnd === null ? Infinity : importedEnd;
        
        // Check if ranges overlap
        return (
          (importedStart <= ruleEnd && importedEndValue >= ruleStart) ||
          (importedStart === ruleStart)
        );
      });
      
      if (overlappingIndex !== -1) {
        // Found overlapping range, update fields
        const fieldsToUpdate = ['psfIncrement', 'jumpEveryFloor', 'jumpIncrement'];
        fieldsToUpdate.forEach(field => {
          if (field in importedRule) {
            result[overlappingIndex][field] = importedRule[field];
          }
        });
      } else {
        // No match found, track as unmatched
        unmatchedFields.push(`FloorRule:${importedStart}-${importedEnd || 'MAX'}`);
      }
    }
  });
  
  return result;
};
