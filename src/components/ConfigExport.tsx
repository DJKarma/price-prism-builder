
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { exportToExcel } from '@/utils/configUtils';
import { useAppStore } from '@/store/appStore';

interface ConfigExportProps {
  data: any[];
  summaryData?: any[];
}

const ConfigExport: React.FC<ConfigExportProps> = ({ data, summaryData }) => {
  const [includeConfig, setIncludeConfig] = useState(true);
  const pricingConfig = useAppStore(state => state.pricingConfig);
  
  const handleExport = async () => {
    await exportToExcel(data, includeConfig, pricingConfig, summaryData);
  };
  
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="includeConfig" 
          checked={includeConfig}
          onCheckedChange={(checked) => setIncludeConfig(checked as boolean)}
        />
        <Label htmlFor="includeConfig" className="text-sm">
          Include config file
        </Label>
      </div>
      
      <Button
        onClick={handleExport}
        className="flex items-center gap-2"
        disabled={!data.length}
      >
        <Download className="h-4 w-4" />
        Export Data
      </Button>
    </div>
  );
};

export default ConfigExport;
