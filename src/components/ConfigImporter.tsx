
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

  const handleClick = () => {
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
      const mappedConfig = {
        ...currentConfig,
        bedroomTypePricing: currentConfig.bedroomTypePricing.map((item: any) => {
          const mappedType = mappings.bedroomTypes[item.type];
          if (!mappedType) return item;
          
          const matchedImported = importedConfig.bedroomTypePricing.find(
            (imported: any) => imported.type === mappedType
          );
          return matchedImported ? { ...item, ...matchedImported } : item;
        }),

        viewPricing: currentConfig.viewPricing.map((item: any) => {
          const mappedView = mappings.views[item.view];
          if (!mappedView) return item;

          const matchedImported = importedConfig.viewPricing.find(
            (imported: any) => imported.view === mappedView
          );
          return matchedImported ? { ...item, ...matchedImported } : item;
        }),

        additionalCategoryPricing: currentConfig.additionalCategoryPricing.map((item: any) => {
          const key = `${item.column}: ${item.category}`;
          const mappedKey = mappings.additionalCategories[key];
          if (!mappedKey) return item;

          const [mappedColumn, mappedCategory] = mappedKey.split(': ');
          const matchedImported = importedConfig.additionalCategoryPricing.find(
            (imported: any) => imported.column === mappedColumn && imported.category === mappedCategory
          );
          return matchedImported ? { ...item, ...matchedImported } : item;
        }),

        basePsf: importedConfig.basePsf || currentConfig.basePsf,
        floorRiseRules: importedConfig.floorRiseRules || currentConfig.floorRiseRules,
        maxFloor: importedConfig.maxFloor || currentConfig.maxFloor,
      };

      onConfigImported(mappedConfig);
      toast.success('Configuration imported successfully');
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
