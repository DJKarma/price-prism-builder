import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Settings } from "lucide-react";
import PricingConfiguration from "@/components/PricingConfiguration";
import ConfigImporter from "@/components/ConfigImporter";

interface Props {
  data: any[];
  pricingConfig: any;
  onConfigUpdate: (u: any) => void;
  maxFloor?: number;
  additionalCategories?: Array<{ column: string; categories: string[] }>;
}

const CollapsibleConfigPanel: React.FC<Props> = ({
  data,
  pricingConfig,
  onConfigUpdate,
  maxFloor,
  additionalCategories,
}) => {
  const handleConfigImport = (cfg: any) => onConfigUpdate(cfg);

  return (
    <div className="mb-6 border rounded-lg shadow-sm">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="configuration" className="border-none">
          {/* glow-border moved here so glow stays on the strip only */}
          <AccordionTrigger className="glow-border px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 hover:no-underline relative overflow-hidden">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Settings className="h-5 w-5 mr-2 text-indigo-600" />
                <span className="font-medium text-indigo-700">
                  Price Configuration Panel
                </span>
              </div>

              {/* stop accordion toggle when clicking importer */}
              <div
                className="flex items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <ConfigImporter
                  onConfigImported={handleConfigImport}
                  currentConfig={pricingConfig}
                />
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
