
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { importConfig } from '@/utils/configUtils';
import { useAppStore } from '@/store/appStore';

const ConfigImport: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updatePricingConfig = useAppStore(state => state.updatePricingConfig);
  
  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const { config, unmatchedFields } = await importConfig(file);
      
      // Update the global state with the imported config
      updatePricingConfig(config);
      
      // Notify the user
      if (unmatchedFields.length > 0) {
        toast.info(
          `Configuration imported successfully. The following fields were skipped because they do not exist in the current version: ${unmatchedFields.join(', ')}`
        );
      } else {
        toast.success('Configuration imported successfully');
      }
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(`Failed to import configuration: ${(error as Error).message}`);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  return (
    <>
      <Button
        variant="outline"
        onClick={handleClick}
        className="flex items-center gap-2"
      >
        <Upload className="h-4 w-4" />
        Import Config
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,.yaml,.yml"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
};

export default ConfigImport;
