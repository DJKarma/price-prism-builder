
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { importConfig } from '@/utils/configUtils';
import { usePricingStore } from '@/store/usePricingStore';

const ConfigImporter = () => {
  const [isImporting, setIsImporting] = useState(false);
  const setPricingConfig = usePricingStore(state => state.setPricingConfig);
  const pricingConfig = usePricingStore(state => state.pricingConfig);
  
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    
    try {
      const { config, unmatchedFields } = await importConfig(file);
      
      // Merge with existing config if available
      const mergedConfig = pricingConfig ? { ...pricingConfig, ...config } : config;
      
      // Update the config in the store
      setPricingConfig(mergedConfig);
      
      // Notify user about the import
      if (unmatchedFields.length > 0) {
        toast.success(
          <div>
            <p>Config imported successfully.</p>
            <p className="mt-2">The following fields were skipped because they don't exist in the current version:</p>
            <ul className="list-disc list-inside mt-1">
              {unmatchedFields.map(field => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        );
      } else {
        toast.success('Config imported successfully');
      }
      
      // Reset the input
      e.target.value = '';
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import configuration');
    } finally {
      setIsImporting(false);
    }
  };
  
  return (
    <>
      <input
        type="file"
        id="config-import"
        className="hidden"
        accept=".json,.yaml,.yml"
        onChange={handleImport}
      />
      <Button 
        variant="outline" 
        size="sm"
        disabled={isImporting}
        onClick={() => document.getElementById('config-import')?.click()}
        className="flex items-center gap-2"
      >
        <Upload className="h-4 w-4" />
        Import Config
      </Button>
    </>
  );
};

export default ConfigImporter;
