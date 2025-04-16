
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
  currentFields: string[];
  importedFields: string[];
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
  });
  
  const [hasFieldsToMap, setHasFieldsToMap] = useState(false);

  // Initialize mapping data when dialog opens or configs change
  useEffect(() => {
    if (isOpen && currentConfig && importedConfig) {
      // Extract fields from current config
      const currentBedroomTypes = currentConfig?.bedroomTypePricing?.map((item: any) => item.type) || [];
      const currentViews = currentConfig?.viewPricing?.map((item: any) => item.view) || [];
      const currentAdditionalCategories = currentConfig?.additionalCategoryPricing?.map((item: any) => 
        `${item.column}: ${item.category}`
      ) || [];
      
      // Extract fields from imported config
      const importedBedroomTypes = importedConfig?.bedroomTypePricing?.map((item: any) => item.type) || [];
      const importedViews = importedConfig?.viewPricing?.map((item: any) => item.view) || [];
      const importedAdditionalCategories = importedConfig?.additionalCategoryPricing?.map((item: any) => 
        `${item.column}: ${item.category}`
      ) || [];
      
      // Set up mapping sections
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
          description: "Match imported additional categories to your current categories"
        },
      };
      
      // Try auto-matching based on case-insensitive comparison
      Object.keys(updatedSections).forEach(sectionKey => {
        const section = updatedSections[sectionKey];
        
        section.currentFields.forEach(currentField => {
          // Try to find an exact match first
          const exactMatch = section.importedFields.find(
            importedField => importedField.toLowerCase() === currentField.toLowerCase()
          );
          
          if (exactMatch) {
            section.mappings[currentField] = exactMatch;
          }
        });
      });
      
      setMappingSections(updatedSections);
      
      // Check if there are any fields to map
      const hasFields = 
        currentBedroomTypes.length > 0 && importedBedroomTypes.length > 0 ||
        currentViews.length > 0 && importedViews.length > 0 ||
        currentAdditionalCategories.length > 0 && importedAdditionalCategories.length > 0;
      
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

  // Count total mapped fields
  const countMappedFields = () => {
    let count = 0;
    Object.values(mappingSections).forEach(section => {
      count += Object.keys(section.mappings).length;
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
                  <div className="space-y-3">
                    {section.currentFields.map((currentField) => (
                      <div key={currentField} className="flex items-center gap-4">
                        <div className="w-1/3">
                          <Label className="text-sm font-medium">{currentField}</Label>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1">
                          <Select
                            value={section.mappings[currentField] || ""}
                            onValueChange={(value) => handleMapping(key, currentField, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select matching field..." />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Fix: Use "no-match" instead of empty string for the "No match" option */}
                              <SelectItem value="no-match">No match</SelectItem>
                              {section.importedFields.map((importedField) => (
                                <SelectItem key={importedField} value={importedField}>
                                  {importedField}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
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
