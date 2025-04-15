
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FileJson, AlertTriangle, X } from 'lucide-react';
import { importConfig } from '@/utils/configUtils';
import { 
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

interface ConfigImporterProps {
  onConfigImported: (config: any) => void;
}

const ConfigImporter: React.FC<ConfigImporterProps> = ({ onConfigImported }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [unmatchedFields, setUnmatchedFields] = useState<string[]>([]);
  const [showAlert, setShowAlert] = useState(false);

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
      
      // Check if config is empty or doesn't have required fields
      if (!config || !Object.keys(config).length) {
        toast.error("Failed to import configuration: No valid data found");
        return;
      }

      // Verify key configuration elements are present
      if (!config.bedroomTypePricing || !config.viewPricing) {
        toast.error("Configuration file is missing critical pricing components");
        return;
      }
      
      // Set unmatched fields and show alert if needed
      setUnmatchedFields(unmatchedFields);
      setShowAlert(unmatchedFields.length > 0);
      
      // Clear the file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Log the imported config for debugging
      console.log("Imported configuration:", config);
      
      // Pass the imported config to the parent component
      onConfigImported(config);
      
      // Show success toast with field count and warning about unmatched fields
      const fieldsCount = Object.keys(config).length;
      
      if (unmatchedFields.length > 0) {
        toast.warning(`Config imported with ${fieldsCount} valid parameters. ${unmatchedFields.length} parameters could not be applied.`, {
          duration: 5000,
        });
      } else {
        toast.success(`Config imported successfully. ${fieldsCount} parameters applied.`);
      }
    } catch (error) {
      toast.error((error as Error).message || 'Failed to import configuration');
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const closeAlert = () => {
    setShowAlert(false);
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json,.yaml,.yml"
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
      
      {showAlert && unmatchedFields.length > 0 && (
        <Alert className="mt-4 bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <div className="flex justify-between w-full">
            <div>
              <AlertTitle>Unmatched Parameters</AlertTitle>
              <AlertDescription>
                The following parameters could not be applied because they don't exist in the current schema: 
                <span className="font-semibold text-amber-700">
                  {` ${unmatchedFields.join(', ')}`}
                </span>
              </AlertDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={closeAlert} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      )}
    </div>
  );
};

export default ConfigImporter;
