
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
      
      // Show warning toast for unmatched fields
      if (unmatchedFields.length > 0) {
        toast.warning(
          `Some fields could not be imported`,
          {
            description: `The following fields were not found in the current configuration: ${unmatchedFields.join(', ')}`,
            duration: 5000
          }
        );
      }
      
      // Set unmatched fields and show alert if needed
      setUnmatchedFields(unmatchedFields);
      setShowAlert(unmatchedFields.length > 0);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Pass the imported config to the parent component
      onConfigImported(config);
      
      // Show success toast with field count
      const fieldsCount = Object.keys(config).length - unmatchedFields.length;
      toast.success(`Config imported successfully`, {
        description: `${fieldsCount} fields were updated.`
      });
    } catch (error) {
      toast.error(`Import failed`, {
        description: (error as Error).message || 'Failed to import configuration'
      });
      
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
        className="hover:bg-indigo-50"
      >
        <FileJson className="mr-2 h-4 w-4" />
        Import Config
      </Button>
      
      {showAlert && unmatchedFields.length > 0 && (
        <Alert className="mt-4 bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Ignored Fields</AlertTitle>
          <AlertDescription>
            The following fields were skipped because they don't exist in the current version: 
            <span className="font-semibold text-amber-700">
              {` ${unmatchedFields.join(', ')}`}
            </span>
          </AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
            onClick={closeAlert}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}
    </div>
  );
};

export default ConfigImporter;
