
import React from "react";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Settings, ChevronDown } from "lucide-react";
import PricingConfiguration from "@/components/PricingConfiguration";
import ConfigImporter from "@/components/ConfigImporter";

interface CollapsibleConfigPanelProps {
  data: any[];
  pricingConfig: any;
  onConfigUpdate: (updatedConfig: any) => void;
  maxFloor?: number;
  additionalCategories?: Array<{column: string, categories: string[]}>;
}

const CollapsibleConfigPanel: React.FC<CollapsibleConfigPanelProps> = ({
  data,
  pricingConfig,
  onConfigUpdate,
  maxFloor,
  additionalCategories
}) => {
  return (
    <div className="mb-6 border rounded-lg shadow-sm animate-pulse-subtle">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="configuration" className="border-none">
          <AccordionTrigger className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 hover:no-underline group">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Settings className="h-5 w-5 mr-2 text-indigo-600 group-hover:animate-pulse" />
                <span className="font-medium text-indigo-700">Price Configuration Panel</span>
              </div>
              <div className="flex items-center">
                <ConfigImporter onConfigImported={onConfigUpdate} />
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-4 pb-2">
            <PricingConfiguration
              data={data}
              initialConfig={pricingConfig}
              onConfigurationComplete={onConfigUpdate}
              maxFloor={maxFloor}
              additionalCategories={additionalCategories}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default CollapsibleConfigPanel;
