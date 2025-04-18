
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FileJson } from 'lucide-react';
import ConfigMappingDialog from './ConfigMappingDialog';

interface ConfigImporterProps {
  onConfigImported: (config: any) => void;
  currentConfig: any;
}

const ConfigImporter: React.FC<ConfigImporterProps> = ({ onConfigImported, currentConfig }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [importedConfig, setImportedConfig] = useState<any>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling to parent elements
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonContent = event.target?.result as string;
          const parsedConfig = JSON.parse(jsonContent);
          
          // Basic validation
          if (!parsedConfig || typeof parsedConfig !== 'object') {
            toast.error('Invalid configuration file format');
            return;
          }
          
          // Check if the file has required fields
          const requiredSections = ['bedroomTypePricing', 'viewPricing', 'floorRiseRules'];
          const missingSections = requiredSections.filter(section => !parsedConfig[section]);
          
          if (missingSections.length > 0) {
            toast.error(`Missing required sections: ${missingSections.join(', ')}`);
            return;
          }
          
          // Log the imported config to help with debugging
          console.log("Imported config:", parsedConfig);
          
          // Store the imported config and show the mapping dialog
          setImportedConfig(parsedConfig);
          setShowMappingDialog(true);
          
          // Clear the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } catch (error) {
          toast.error('Failed to parse configuration file');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      toast.error('Failed to read configuration file');
    }
  };

  const handleMappingComplete = (mappings: Record<string, Record<string, string>>) => {
    if (!importedConfig) return;

    try {
      // Log the mappings for debugging
      console.log("Received mappings:", mappings);
      
      // Map matched fields between current config and imported config
      const mappedConfig = JSON.parse(JSON.stringify(currentConfig));
      
      // Update bedroom types pricing based on mappings
      if (mappedConfig.bedroomTypePricing && importedConfig.bedroomTypePricing) {
        mappedConfig.bedroomTypePricing = mappedConfig.bedroomTypePricing.map((item: any) => {
          const mappedType = mappings.bedroomTypes[item.type];
          if (!mappedType || mappedType === "no-match") return item;
          
          const matchedImported = importedConfig.bedroomTypePricing.find(
            (imported: any) => imported.type === mappedType
          );
          
          if (matchedImported) {
            // Only copy fields that exist in the current item to maintain structure
            const updatedItem = { ...item };
            Object.keys(item).forEach(key => {
              if (key in matchedImported && key !== 'type') {
                updatedItem[key] = matchedImported[key];
              }
            });
            return updatedItem;
          }
          
          return item;
        });
      }

      // Update view pricing based on mappings
      if (mappedConfig.viewPricing && importedConfig.viewPricing) {
        mappedConfig.viewPricing = mappedConfig.viewPricing.map((item: any) => {
          const mappedView = mappings.views[item.view];
          if (!mappedView || mappedView === "no-match") return item;

          const matchedImported = importedConfig.viewPricing.find(
            (imported: any) => imported.view === mappedView
          );
          
          if (matchedImported) {
            const updatedItem = { ...item };
            Object.keys(item).forEach(key => {
              if (key in matchedImported && key !== 'view') {
                updatedItem[key] = matchedImported[key];
              }
            });
            return updatedItem;
          }
          
          return item;
        });
      }

      // Initialize additionalCategoryPricing if it doesn't exist
      if (!mappedConfig.additionalCategoryPricing && importedConfig.additionalCategoryPricing) {
        mappedConfig.additionalCategoryPricing = [];
      }

      // Update additional category pricing based on mappings
      if (mappedConfig.additionalCategoryPricing && importedConfig.additionalCategoryPricing && mappings.additionalCategories) {
        console.log("Mapping additional categories:", mappings.additionalCategories);
        mappedConfig.additionalCategoryPricing = mappedConfig.additionalCategoryPricing.map((item: any) => {
          const key = `${item.column}: ${item.category}`;
          const mappedKey = mappings.additionalCategories[key];
          if (!mappedKey || mappedKey === "no-match") return item;

          const [mappedColumn, mappedCategory] = mappedKey.split(': ');
          const matchedImported = importedConfig.additionalCategoryPricing.find(
            (imported: any) => imported.column === mappedColumn && imported.category === mappedCategory
          );
          
          if (matchedImported) {
            const updatedItem = { ...item };
            Object.keys(item).forEach(key => {
              if (key in matchedImported && key !== 'column' && key !== 'category') {
                updatedItem[key] = matchedImported[key];
              }
            });
            return updatedItem;
          }
          
          return item;
        });
      }

      // Update floor rise rules if they exist in both configs
      if (mappedConfig.floorRiseRules && importedConfig.floorRiseRules) {
        mappedConfig.floorRiseRules = mappedConfig.floorRiseRules.map((rule: any) => {
          const key = `${rule.startFloor}-${rule.endFloor}`;
          const mappedKey = mappings.floorRiseRules[key];
          if (!mappedKey || mappedKey === "no-match") return rule;

          const [mappedStart, mappedEnd] = mappedKey.split('-').map(Number);
          const matchedImported = importedConfig.floorRiseRules.find(
            (imported: any) => imported.startFloor === mappedStart && imported.endFloor === mappedEnd
          );
          
          if (matchedImported) {
            const updatedRule = { ...rule };
            Object.keys(rule).forEach(key => {
              if (key in matchedImported && key !== 'startFloor' && key !== 'endFloor') {
                updatedRule[key] = matchedImported[key];
              }
            });
            return updatedRule;
          }
          
          return rule;
        });
      }

      // Update scalar values if they exist in the current config and are mapped
      if (mappings.scalarFields) {
        Object.entries(mappings.scalarFields).forEach(([currentField, importedField]) => {
          if (importedField && importedField !== "no-match" && importedField in importedConfig) {
            mappedConfig[currentField] = importedConfig[importedField];
          }
        });
      }

      // Count how many fields were actually mapped
      const totalMappedFields = 
        Object.values(mappings.bedroomTypes).filter(val => val && val !== "no-match").length +
        Object.values(mappings.views).filter(val => val && val !== "no-match").length +
        Object.values(mappings.additionalCategories || {}).filter(val => val !== "no-match").length +
        Object.values(mappings.floorRiseRules).filter(val => val !== "no-match").length +
        Object.values(mappings.scalarFields).filter(val => val !== "no-match").length;

      onConfigImported(mappedConfig);
      
      if (totalMappedFields > 0) {
        toast.success(`Configuration imported with ${totalMappedFields} mapped fields`);
      } else {
        toast.info('No fields were mapped during import');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to apply configuration mappings');
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        style={{ display: 'none' }}
        onClick={e => e.stopPropagation()}
      />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleClick}
        className="hover-scale"
      >
        <FileJson className="mr-2 h-4 w-4" />
        Import Config
      </Button>

      <ConfigMappingDialog
        isOpen={showMappingDialog}
        onClose={() => setShowMappingDialog(false)}
        currentConfig={currentConfig}
        importedConfig={importedConfig}
        onMappingComplete={handleMappingComplete}
      />
    </div>
  );
};

export default ConfigImporter;
