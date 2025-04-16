
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, AlertCircle, ImportIcon } from 'lucide-react';

interface MappingSection {
  title: string;
  currentFields: any[];
  importedFields: any[];
  mappings: Record<string, string>;
  description: string;
}

interface ConfigMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: any;
  importedConfig: any;
  onMappingComplete: (mappings: Record<string, Record<string, string>>) => void;
}

const ConfigMappingDialog: React.FC<ConfigMappingDialogProps> = ({
  isOpen,
  onClose,
  currentConfig,
  importedConfig,
  onMappingComplete,
}) => {
  const [mappingSections, setMappingSections] = useState<Record<string, MappingSection>>({
    bedroomTypes: {
      title: "Bedroom Types",
      currentFields: [],
      importedFields: [],
      mappings: {},
      description: "Match imported bedroom types to your current configuration"
    },
    views: {
      title: "Views",
      currentFields: [],
      importedFields: [],
      mappings: {},
      description: "Match imported views to your current configuration"
    },
    additionalCategories: {
      title: "Additional Categories",
      currentFields: [],
      importedFields: [],
      mappings: {},
      description: "Match imported additional categories to your current categories"
    },
    floorRiseRules: {
      title: "Floor Rise Rules",
      currentFields: [],
      importedFields: [],
      mappings: {},
      description: "Match imported floor rise rules to your current configuration"
    },
    scalarFields: {
      title: "Basic Parameters",
      currentFields: [],
      importedFields: [],
      mappings: {},
      description: "Match imported basic parameters to your current configuration"
    }
  });
  
  const [hasFieldsToMap, setHasFieldsToMap] = useState(false);

  // Initialize mapping data when dialog opens or configs change
  useEffect(() => {
    if (isOpen && currentConfig && importedConfig) {
      console.log("Current config:", currentConfig);
      console.log("Imported config:", importedConfig);
      
      const currentBedroomTypes = currentConfig?.bedroomTypePricing?.map((item: any) => ({
        key: item.type,
        value: item.psf,
        displayValue: `${item.psf || 0}`
      })) || [];

      const importedBedroomTypes = importedConfig?.bedroomTypePricing?.map((item: any) => ({
        key: item.type,
        value: item.psf,
        displayValue: `${item.psf || 0}`
      })) || [];

      const currentViews = currentConfig?.viewPricing?.map((item: any) => ({
        key: item.view,
        value: item.premium,
        displayValue: `${item.premium || 0}%`
      })) || [];

      const importedViews = importedConfig?.viewPricing?.map((item: any) => ({
        key: item.view,
        value: item.premium,
        displayValue: `${item.premium || 0}%`
      })) || [];

      // Ensure we're correctly extracting additional categories from both configs
      const currentAdditionalCategories = (currentConfig?.additionalCategoryPricing || []).map((item: any) => ({
        key: `${item.column}: ${item.category}`,
        value: item.psfAdjustment,
        displayValue: `${item.psfAdjustment || 0}`
      }));

      const importedAdditionalCategories = (importedConfig?.additionalCategoryPricing || []).map((item: any) => ({
        key: `${item.column}: ${item.category}`,
        value: item.psfAdjustment,
        displayValue: `${item.psfAdjustment || 0}`
      }));
      
      console.log("Current additional categories:", currentAdditionalCategories);
      console.log("Imported additional categories:", importedAdditionalCategories);

      const currentFloorRiseRules = currentConfig?.floorRiseRules?.map((rule: any) => ({
        key: `${rule.startFloor}-${rule.endFloor}`,
        value: rule.psfIncrement,
        displayValue: `${rule.psfIncrement || 0}`
      })) || [];

      const importedFloorRiseRules = importedConfig?.floorRiseRules?.map((rule: any) => ({
        key: `${rule.startFloor}-${rule.endFloor}`,
        value: rule.psfIncrement,
        displayValue: `${rule.psfIncrement || 0}`
      })) || [];

      const scalarFields = ['basePsf', 'maxFloor', 'targetOverallPsf'];
      const currentScalarFields = scalarFields.filter(field => field in currentConfig).map(field => ({
        key: field,
        value: currentConfig[field],
        displayValue: `${currentConfig[field]}`
      }));

      const importedScalarFields = scalarFields.filter(field => field in importedConfig).map(field => ({
        key: field,
        value: importedConfig[field],
        displayValue: `${importedConfig[field]}`
      }));

      // Set up mapping sections with values
      const updatedSections = {
        bedroomTypes: {
          title: "Bedroom Types",
          currentFields: currentBedroomTypes,
          importedFields: importedBedroomTypes,
          mappings: {},
          description: "Match imported bedroom types to your current configuration"
        },
        views: {
          title: "Views",
          currentFields: currentViews,
          importedFields: importedViews,
          mappings: {},
          description: "Match imported views to your current configuration"
        },
        additionalCategories: {
          title: "Additional Categories",
          currentFields: currentAdditionalCategories,
          importedFields: importedAdditionalCategories,
          mappings: {},
          description: "Match imported additional categories to your current configuration"
        },
        floorRiseRules: {
          title: "Floor Rise Rules",
          currentFields: currentFloorRiseRules,
          importedFields: importedFloorRiseRules,
          mappings: {},
          description: "Match imported floor rise rules to your current configuration"
        },
        scalarFields: {
          title: "Basic Parameters",
          currentFields: currentScalarFields,
          importedFields: importedScalarFields,
          mappings: {},
          description: "Match imported basic parameters to your current configuration"
        }
      };
      
      // Try auto-matching based on case-insensitive comparison
      Object.keys(updatedSections).forEach(sectionKey => {
        const section = updatedSections[sectionKey];
        
        section.currentFields.forEach(currentField => {
          const exactMatch = section.importedFields.find(
            importedField => importedField.key.toLowerCase() === currentField.key.toLowerCase()
          );
          
          if (exactMatch) {
            section.mappings[currentField.key] = exactMatch.key;
          }
        });
      });
      
      setMappingSections(updatedSections);
      
      const hasFields = Object.values(updatedSections).some(
        section => section.currentFields.length > 0 && section.importedFields.length > 0
      );
      
      setHasFieldsToMap(hasFields);
    }
  }, [isOpen, currentConfig, importedConfig]);

  const handleMapping = (section: string, currentField: string, importedField: string) => {
    setMappingSections(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        mappings: {
          ...prev[section].mappings,
          [currentField]: importedField,
        },
      },
    }));
  };

  const handleComplete = () => {
    const finalMappings: Record<string, Record<string, string>> = {};
    Object.entries(mappingSections).forEach(([key, section]) => {
      finalMappings[key] = section.mappings;
    });
    onMappingComplete(finalMappings);
    onClose();
  };

  const countMappedFields = () => {
    let count = 0;
    Object.values(mappingSections).forEach(section => {
      count += Object.values(section.mappings).filter(val => val && val !== "no-match").length;
    });
    return count;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-indigo-700 flex items-center gap-2">
            <ImportIcon className="h-5 w-5" />
            Map Configuration Fields
          </DialogTitle>
          <DialogDescription>
            Match imported configuration fields to your current configuration structure
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-1">
          {!hasFieldsToMap ? (
            <Alert variant="destructive" className="my-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No compatible fields found</AlertTitle>
              <AlertDescription>
                The imported configuration doesn't contain any fields that match your current configuration structure.
                Make sure you're importing a compatible configuration file.
              </AlertDescription>
            </Alert>
          ) : countMappedFields() === 0 ? (
            <Alert className="my-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No automatic matches found</AlertTitle>
              <AlertDescription>
                No fields were automatically matched. Please manually select which imported fields 
                should map to your current configuration fields.
              </AlertDescription>
            </Alert>
          ) : null}
          
          <div className="space-y-6 py-4">
            {Object.entries(mappingSections).map(([key, section]) => (
              section.currentFields.length > 0 && section.importedFields.length > 0 ? (
                <div key={key} className="space-y-4 border-b pb-4 last:border-b-0">
                  <div>
                    <h3 className="font-medium text-lg text-indigo-600">{section.title}</h3>
                    <p className="text-sm text-gray-500">{section.description}</p>
                  </div>
                  <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                    <div className="space-y-3 pr-4">
                      {section.currentFields.map((currentField: any) => (
                        <div key={currentField.key} className="flex items-center gap-4">
                          <div className="w-1/3">
                            <Label className="text-sm font-medium">
                              {currentField.key}
                              <span className="block text-xs text-gray-500">
                                Current: {currentField.displayValue}
                              </span>
                            </Label>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="flex-1">
                            <Select
                              value={section.mappings[currentField.key] || ""}
                              onValueChange={(value) => handleMapping(key, currentField.key, value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select matching field..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="no-match">No match</SelectItem>
                                {section.importedFields.map((importedField: any) => (
                                  <SelectItem key={importedField.key} value={importedField.key}>
                                    <div>
                                      {importedField.key}
                                      <span className="block text-xs text-gray-500">
                                        Value: {importedField.displayValue}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : null
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleComplete}
            disabled={!hasFieldsToMap}
          >
            Apply Mappings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfigMappingDialog;
