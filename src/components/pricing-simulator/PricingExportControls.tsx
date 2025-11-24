
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { exportToExcel, exportToExcelWithFormulas } from "@/utils/configUtils";
import { UnitWithPricing } from '../PricingSimulator';

interface PricingExportControlsProps {
  filteredUnits: UnitWithPricing[];
  pricingConfig: any;
  createSummaryData: (data: UnitWithPricing[]) => any[];
  projectCost?: number;
  costAcPsf?: number;
  costSaPsf?: number;
  // Note: columnVisibility is not used - export always includes all columns
}

const PricingExportControls: React.FC<PricingExportControlsProps> = ({
  filteredUnits,
  pricingConfig,
  createSummaryData,
  projectCost = 0,
  costAcPsf = 0,
  costSaPsf = 0,
}) => {
  const [includeConfig, setIncludeConfig] = useState<boolean>(false);
  const [useFormulas, setUseFormulas] = useState<boolean>(false);

  const exportCSV = async () => {
    if (!filteredUnits.length) {
      toast.error("No data to export");
      return;
    }
    
    // Validate the data structure before export
    const validUnits = filteredUnits.filter(unit => {
      return unit && typeof unit === 'object' && 
             'finalTotalPrice' in unit && 
             'name' in unit;
    });
    
    if (validUnits.length === 0) {
      toast.error("No valid units found to export");
      return;
    }
    
    if (validUnits.length < filteredUnits.length) {
      toast.warning(`Exporting ${validUnits.length} valid units out of ${filteredUnits.length} total`);
    }
    
    // Create summary data for the summary sheet
    let summaryData: any[] = [];
    try {
      summaryData = createSummaryData(validUnits);
    } catch (err) {
      console.warn("Failed to create summary data:", err);
      // Continue without summary if it fails
    }
    
    // Create a flat array of data for the export
    // NOTE: ALL columns are included in export regardless of table visibility settings
    const flattenedData = validUnits.map(unit => {
      // Create a flattened version of the unit data for export
      const flatUnit: Record<string, any> = {};
      
      // Export columns in LOGICAL ORDER showing calculation flow:
      // 1. Unit Identity → 2. Areas → 3. PSF Adjustments → 4. Price Components → 5. Final Pricing → 6. Cost & Margin
      const allColumns = [
        // 1. UNIT IDENTIFICATION (who/what/where)
        { id: "name",                   label: "Name" },
        { id: "type",                   label: "Type" },
        { id: "floor",                  label: "Floor" },
        { id: "view",                   label: "View" },
        
        // 2. AREA MEASUREMENTS (size inputs)
        { id: "sellArea",               label: "Sell Area" },
        { id: "acArea",                 label: "AC Area" },
        { id: "balconyArea",            label: "Balcony Area" },
        { id: "balconyPercentage",      label: "Balcony %" },
        
        // 3. PSF CALCULATION STEPS (progressive adjustments)
        { id: "basePsf",                label: "Base PSF" },
        { id: "viewPsfAdjustment",      label: "View PSF Adjustment" },
        { id: "floorAdjustment",        label: "Floor PSF Adjustment" },
        { id: "additionalAdjustment",   label: "Add-Cat Premium (Position, Pool, Furniture)" },
        { id: "psfAfterAllAdjustments", label: "PSF After All Adjustments" },
        
        // 4. PRICE COMPONENTS (area × PSF)
        { id: "acPrice",                label: "AC Component" },
        { id: "balconyPrice",           label: "Balcony Component" },
        { id: "totalPriceRaw",          label: "Total Price (unc.)" },
        
        // 5. FINAL PRICING (final adjustments)
        { id: "flatAddTotal",           label: "Flat Adders" },
        { id: "finalTotalPrice",        label: "Final Total Price" },
        { id: "finalPsf",               label: "Final PSF" },
        { id: "finalAcPsf",             label: "Final AC PSF" },
        
        // 6. COST & MARGIN ANALYSIS (profitability)
        { id: "unitCost",               label: "Unit Cost" },
        { id: "margin",                 label: "Margin" },
        { id: "marginPercent",          label: "Margin %" },
        
        // 7. METADATA
        { id: "isOptimized",            label: "Optimized" },
      ];

      
      allColumns.forEach(col => {
        // Calculate cost and margin fields
        if (col.id === "unitCost") {
          if (projectCost > 0 && costAcPsf > 0) {
            const acArea = parseFloat(unit.acArea) || 0;
            const balconyArea = unit.balconyArea || 0;
            flatUnit[col.label] = (costAcPsf * acArea) + (costSaPsf * balconyArea);
          } else {
            flatUnit[col.label] = 0;
          }
        } else if (col.id === "margin") {
          if (projectCost > 0 && costAcPsf > 0) {
            const acArea = parseFloat(unit.acArea) || 0;
            const balconyArea = unit.balconyArea || 0;
            const unitCost = (costAcPsf * acArea) + (costSaPsf * balconyArea);
            const revenue = unit.finalTotalPrice || 0;
            flatUnit[col.label] = revenue - unitCost;
          } else {
            flatUnit[col.label] = 0;
          }
        } else if (col.id === "marginPercent") {
          if (projectCost > 0 && costAcPsf > 0) {
            const acArea = parseFloat(unit.acArea) || 0;
            const balconyArea = unit.balconyArea || 0;
            const unitCost = (costAcPsf * acArea) + (costSaPsf * balconyArea);
            const revenue = unit.finalTotalPrice || 0;
            const margin = revenue - unitCost;
            flatUnit[col.label] = unitCost > 0 ? (margin / unitCost) * 100 : 0;
          } else {
            flatUnit[col.label] = 0;
          }
        } else if (col.id in unit) {
          const value = unit[col.id];
          if (col.id === "isOptimized") {
            flatUnit[col.label] = value ? "Yes" : "No";
          } else if (typeof value === 'number') {
            flatUnit[col.label] = isNaN(value) ? 0 : value;
          } else {
            flatUnit[col.label] = value ?? "";
          }
        } else {
          // Provide safe defaults for missing fields
          flatUnit[col.label] = col.id === "isOptimized" ? "No" : (typeof unit[col.id] === 'number' ? 0 : "");
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
    if (useFormulas) {
      await exportToExcelWithFormulas(
        flattenedData, 
        includeConfig, 
        pricingConfig,
        summaryData
      );
    } else {
      await exportToExcel(
        flattenedData, 
        includeConfig, 
        pricingConfig,  // Use the current pricingConfig 
        summaryData
      );
    }
  };
  
  return (
    <div className="flex justify-end mb-4">
      <div className="flex items-center space-x-2 border border-border rounded-md px-2 py-1 mr-2">
        <Switch
          id="use-formulas"
          checked={useFormulas}
          onCheckedChange={setUseFormulas}
        />
        <Label htmlFor="use-formulas" className="text-xs">
          Export with formulas
        </Label>
      </div>
      
      <div className="flex items-center space-x-2 border border-border rounded-md px-2 py-1 mr-2">
        <Switch
          id="include-config"
          checked={includeConfig}
          onCheckedChange={setIncludeConfig}
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
