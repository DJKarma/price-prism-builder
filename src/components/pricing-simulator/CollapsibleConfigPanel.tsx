
import React from "react";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Settings } from "lucide-react";
import PricingConfiguration from "@/components/PricingConfiguration";
import ConfigImporter from "@/components/ConfigImporter";

interface CollapsibleConfigPanelProps {
  data: any[];
  pricingConfig: any;
  onConfigUpdate: (updatedConfig: any) => void;
  maxFloor?: number;
  additionalCategories?: Array<{ column: string; categories: string[] }>;
}

const CollapsibleConfigPanel: React.FC<CollapsibleConfigPanelProps> = ({
  data,
  pricingConfig,
  onConfigUpdate,
  maxFloor,
  additionalCategories
}) => {
  // Handle config import, preserving existing values for params not in import
  const handleConfigImport = (importedConfig: any) => {
    // Create a merged config that preserves existing values
    const mergedConfig = {
      ...pricingConfig,
      ...importedConfig,
      // Handle nested objects like bedroomTypePricing and viewPricing
      // by matching on type/view and merging
      bedroomTypePricing: mergeConfigObjects(
        pricingConfig?.bedroomTypePricing || [],
        importedConfig?.bedroomTypePricing || [],
        'type'
      ),
      viewPricing: mergeConfigObjects(
        pricingConfig?.viewPricing || [],
        importedConfig?.viewPricing || [],
        'view'
      ),
      // Handle additionalCategoryPricing by matching on column and category
      additionalCategoryPricing: mergeAdditionalCategories(
        pricingConfig?.additionalCategoryPricing || [],
        importedConfig?.additionalCategoryPricing || []
      )
    };
    
    onConfigUpdate(mergedConfig);
  };
  
  // Merge arrays of objects based on a key field
  const mergeConfigObjects = (existing: any[], imported: any[], keyField: string) => {
    if (!imported.length) return existing;
    if (!existing.length) return imported;
    
    // Create a map of existing objects by key
    const existingMap = new Map(
      existing.map(item => [item[keyField].toLowerCase(), item])
    );
    
    // Update existing objects with imported values when key matches
    imported.forEach(importedItem => {
      const key = importedItem[keyField].toLowerCase();
      if (existingMap.has(key)) {
        const existingItem = existingMap.get(key);
        existingMap.set(key, { ...existingItem, ...importedItem });
      }
    });
    
    // Return the updated existing objects
    return Array.from(existingMap.values());
  };
  
  // Special merge for additionalCategoryPricing which has compound keys
  const mergeAdditionalCategories = (existing: any[], imported: any[]) => {
    if (!imported.length) return existing;
    if (!existing.length) return imported;
    
    // Create a map of existing objects by compound key
    const existingMap = new Map(
      existing.map(item => [
        `${item.column.toLowerCase()}:${item.category.toLowerCase()}`, 
        item
      ])
    );
    
    // Update existing objects with imported values when compound key matches
    imported.forEach(importedItem => {
      const key = `${importedItem.column.toLowerCase()}:${importedItem.category.toLowerCase()}`;
      if (existingMap.has(key)) {
        const existingItem = existingMap.get(key);
        existingMap.set(key, { ...existingItem, ...importedItem });
      }
    });
    
    // Return the updated existing objects
    return Array.from(existingMap.values());
  };
  
  return (
    <div className="mb-6 border rounded-lg shadow-sm">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="configuration" className="border-none">
          <AccordionTrigger 
            className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 hover:no-underline relative overflow-hidden"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Settings className="h-5 w-5 mr-2 text-indigo-600" />
                <span className="font-medium text-indigo-700">
                  Price Configuration Panel
                </span>
              </div>
              <div className="flex items-center">
                <ConfigImporter onConfigImported={handleConfigImport} />
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-4 pb-2">
            <PricingConfiguration
              data={data}
              initialConfig={pricingConfig}
              onConfigurationComplete={onConfigUpdate}
              maxFloor={maxFloor}
              additionalCategories={additionalCategories}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default CollapsibleConfigPanel;
