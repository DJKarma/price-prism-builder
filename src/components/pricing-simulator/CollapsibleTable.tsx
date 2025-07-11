import React, { useState } from "react";
import { ChevronDown, ChevronUp, Table as TableIcon, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PricingTable from "./PricingTable";
import { UnitWithPricing } from "../PricingSimulator";

interface CollapsibleTableProps {
  filteredUnits: UnitWithPricing[];
  visibleColumns: string[];
  additionalColumns: string[];
  handleSort: (key: string) => void;
  pricingMode: string;
}

const CollapsibleTable: React.FC<CollapsibleTableProps> = ({
  filteredUnits,
  visibleColumns,
  additionalColumns,
  handleSort,
  pricingMode,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);

  return (
    <>
      <Card className="w-full glass-card border-border/50 shadow-lg">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="gradient-bg text-primary-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TableIcon className="h-6 w-6 animate-float" />
                <div>
                  <CardTitle className="text-xl font-semibold">
                    Unit Pricing Details
                  </CardTitle>
                  <CardDescription className="text-primary-foreground/90 mt-1">
                    {pricingMode === "villa"
                      ? "Pricing on AC Area only"
                      : "Pricing with Sellable + Balcony"}
                  </CardDescription>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground hover:bg-primary-foreground/20 border border-primary-foreground/30"
                  onClick={() => setIsFullScreen(true)}
                  aria-label="Open table in full screen"
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Full Screen
                </Button>
                
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary-foreground hover:bg-primary-foreground/20 border border-primary-foreground/30"
                    aria-label={isOpen ? "Collapse table" : "Expand table"}
                    aria-expanded={isOpen}
                    aria-controls="pricing-table-content"
                  >
                    {isOpen ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Collapse
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Expand
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent 
            id="pricing-table-content"
            className="transition-all duration-300 ease-in-out"
          >
            <CardContent className="p-0">
              <PricingTable
                filteredUnits={filteredUnits}
                visibleColumns={visibleColumns}
                additionalColumns={additionalColumns}
                handleSort={handleSort}
                isFullScreen={false}
              />
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Full Screen Modal */}
      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-[100vw] w-full h-full max-h-[100vh] p-0 overflow-hidden">
          <DialogHeader className="gradient-bg text-primary-foreground p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TableIcon className="h-6 w-6" />
                <div>
                  <DialogTitle className="text-xl font-semibold">
                    Unit Pricing Details - Full View
                  </DialogTitle>
                  <p className="text-primary-foreground/90 mt-1 text-sm">
                    {pricingMode === "villa"
                      ? "Pricing on AC Area only"
                      : "Pricing with Sellable + Balcony"}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setIsFullScreen(false)}
                aria-label="Close full screen view"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden p-6">
            <div className="h-full">
              <PricingTable
                filteredUnits={filteredUnits}
                visibleColumns={visibleColumns}
                additionalColumns={additionalColumns}
                handleSort={handleSort}
                isFullScreen={true}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CollapsibleTable;