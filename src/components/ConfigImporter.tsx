
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FileJson, AlertTriangle } from 'lucide-react';
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
      onConfigImported(config);
      
      // Set unmatched fields and show alert if needed
      setUnmatchedFields(unmatchedFields);
      setShowAlert(unmatchedFields.length > 0);
      
      // Clear the file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Show success toast with field count
      const fieldsCount = Object.keys(config).length - unmatchedFields.length;
      toast.success(`Config imported successfully. ${fieldsCount} fields updated.`);
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
          <AlertTitle>Ignored Fields</AlertTitle>
          <AlertDescription>
            The following fields were skipped because they don't exist in the current version: 
            <span className="font-semibold text-amber-700">
              {` ${unmatchedFields.join(', ')}`}
            </span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ConfigImporter;
