
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { ArrowRight } from 'lucide-react';

interface MappingSection {
  title: string;
  currentFields: string[];
  importedFields: string[];
  mappings: Record<string, string>;
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
      currentFields: currentConfig?.bedroomTypePricing?.map((item: any) => item.type) || [],
      importedFields: importedConfig?.bedroomTypePricing?.map((item: any) => item.type) || [],
      mappings: {},
    },
    views: {
      title: "Views",
      currentFields: currentConfig?.viewPricing?.map((item: any) => item.view) || [],
      importedFields: importedConfig?.viewPricing?.map((item: any) => item.view) || [],
      mappings: {},
    },
    additionalCategories: {
      title: "Additional Categories",
      currentFields: currentConfig?.additionalCategoryPricing?.map((item: any) => 
        `${item.column}: ${item.category}`
      ) || [],
      importedFields: importedConfig?.additionalCategoryPricing?.map((item: any) => 
        `${item.column}: ${item.category}`
      ) || [],
      mappings: {},
    },
  });

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-indigo-700">
            Map Configuration Fields
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-1">
          <div className="space-y-6 py-4">
            {Object.entries(mappingSections).map(([key, section]) => (
              <div key={key} className="space-y-4">
                <h3 className="font-medium text-lg text-indigo-600">{section.title}</h3>
                <div className="space-y-3">
                  {section.currentFields.map((currentField) => (
                    <div key={currentField} className="flex items-center gap-4">
                      <div className="w-1/3">
                        <Label className="text-sm font-medium">{currentField}</Label>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <div className="flex-1">
                        <Select
                          value={section.mappings[currentField] || ""}
                          onValueChange={(value) => handleMapping(key, currentField, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select matching field..." />
                          </SelectTrigger>
                          <SelectContent>
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
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleComplete}>
            Apply Mappings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfigMappingDialog;
