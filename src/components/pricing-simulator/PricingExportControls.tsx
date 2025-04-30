
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { exportToExcel } from "@/utils/configUtils";
import { UnitWithPricing } from '../PricingSimulator';

interface PricingExportControlsProps {
  filteredUnits: UnitWithPricing[];
  pricingConfig: any;
  createSummaryData: (data: UnitWithPricing[]) => any[];
}

const PricingExportControls: React.FC<PricingExportControlsProps> = ({
  filteredUnits,
  pricingConfig,
  createSummaryData,
}) => {
  const [includeConfig, setIncludeConfig] = useState<boolean>(true);

  const exportCSV = async () => {
    if (!filteredUnits.length) {
      toast.error("No data to export");
      return;
    }
    
    // Create summary data for the summary sheet
    const summaryData = createSummaryData(filteredUnits);
    
    // Create a flat array of data for the export
    const flattenedData = filteredUnits.map(unit => {
      // Create a flattened version of the unit data for export
      const flatUnit: Record<string, any> = {};
      
      // Add basic fields
      const allColumns = [
        { id: "name",                 label: "Name" },
        { id: "type",                 label: "Type" },
        { id: "floor",                label: "Floor" },
        { id: "view",                 label: "View" },
        { id: "sellArea",             label: "Sell Area" },
        { id: "acArea",               label: "AC Area" },
        { id: "balconyArea",          label: "Balcony Area" },
        { id: "balconyPercentage",    label: "Balcony %" },
        { id: "basePsf",              label: "Base PSF" },
        { id: "viewPsfAdjustment",    label: "View PSF Adjustment" },
        { id: "floorAdjustment",      label: "Floor PSF Adjustment" },
        { id: "additionalAdjustment", label: "Add-Cat Premium (Position, Pool, Furniture)" },
        { id: "psfAfterAllAdjustments", label: "PSF After All Adjustments" },
        { id: "acPrice",          label: "AC Component" },
        { id: "balconyPrice",     label: "Balcony Component" },
        { id: "totalPriceRaw",        label: "Total Price (unc.)" },
        { id: "flatAddTotal",             label: "Flat Adders", },
        { id: "finalTotalPrice",      label: "Final Total Price" },
        { id: "finalPsf",             label: "Final PSF" },
        { id: "finalAcPsf",           label: "Final AC PSF" },
        { id: "isOptimized",          label: "Optimized" },
      ];
      
      allColumns.forEach(col => {
        if (col.id in unit) {
          const value = unit[col.id];
          if (col.id === "isOptimized") {
            flatUnit[col.label] = value ? "Yes" : "No";
          } else if (typeof value === 'number') {
            flatUnit[col.label] = value;
          } else {
            flatUnit[col.label] = value;
          }
        }
      });
      
      // Add additional category columns
      const additionalColumns = Object.keys(unit)
        .filter(key => key.endsWith('_value'))
        .map(key => key.replace('_value', ''));
      
      additionalColumns.forEach(column => {
        const columnKey = `${column}_value`;
        if (columnKey in unit) {
          flatUnit[column] = unit[columnKey];
        }
        
        // Add premium values if available
        const premiumKey = `${column}: ${unit[columnKey]}`;
        if (unit.additionalCategoryPriceComponents && premiumKey in unit.additionalCategoryPriceComponents) {
          flatUnit[`${column} Premium`] = unit.additionalCategoryPriceComponents[premiumKey];
        } else {
          flatUnit[`${column} Premium`] = 0;
        }
      });
      
      return flatUnit;
    });
    
    // Export the data with the current pricingConfig (not default values)
    await exportToExcel(
      flattenedData, 
      includeConfig, 
      pricingConfig,  // Use the current pricingConfig 
      summaryData
    );
  };
  
  return (
    <div className="flex justify-end mb-4">
      <div className="flex items-center space-x-2 border border-gray-200 rounded-md px-2 py-1 mr-2">
        <Switch
          id="include-config"
          checked={includeConfig}
          onCheckedChange={setIncludeConfig}
          defaultChecked={true}
        />
        <Label htmlFor="include-config" className="text-xs">
          Include config
        </Label>
      </div>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={exportCSV}
        className="flex-shrink-0"
      >
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
    </div>
  );
};

export default PricingExportControls;
