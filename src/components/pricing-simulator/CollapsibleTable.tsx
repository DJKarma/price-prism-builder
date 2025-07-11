import React, { useState } from "react";
import { ChevronDown, ChevronUp, Table as TableIcon, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PricingTable from "./PricingTable";
import PricingFilters from "./PricingFilters";
import PricingExportControls from "./PricingExportControls";
import { UnitWithPricing } from "../PricingSimulator";

interface CollapsibleTableProps {
  filteredUnits: UnitWithPricing[];
  visibleColumns: string[];
  additionalColumns: string[];
  handleSort: (key: string) => void;
  pricingMode: string;
  // Filter props
  uniqueTypes: string[];
  uniqueViews: string[];
  uniqueFloors: string[];
  selectedTypes: string[];
  setSelectedTypes: (types: string[]) => void;
  selectedViews: string[];
  setSelectedViews: (views: string[]) => void;
  selectedFloors: string[];
  setSelectedFloors: (floors: string[]) => void;
  getUniqueAdditionalValues: (column: string) => string[];
  selectedAdditionalFilters: Record<string, string[]>;
  setSelectedAdditionalFilters: (filters: Record<string, string[]>) => void;
  resetFilters: () => void;
  allColumns: Array<{ id: string; label: string; required: boolean }>;
  toggleColumnVisibility: (columnId: string) => void;
  resetColumnVisibility: () => void;
  // Export props
  pricingConfig: any;
  createSummaryData: (filteredUnits: UnitWithPricing[]) => any;
}

const CollapsibleTable: React.FC<CollapsibleTableProps> = ({
  filteredUnits,
  visibleColumns,
  additionalColumns,
  handleSort,
  pricingMode,
  // Filter props
  uniqueTypes,
  uniqueViews,
  uniqueFloors,
  selectedTypes,
  setSelectedTypes,
  selectedViews,
  setSelectedViews,
  selectedFloors,
  setSelectedFloors,
  getUniqueAdditionalValues,
  selectedAdditionalFilters,
  setSelectedAdditionalFilters,
  resetFilters,
  allColumns,
  toggleColumnVisibility,
  resetColumnVisibility,
  // Export props
  pricingConfig,
  createSummaryData,
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
            <CardContent className="p-6 space-y-6">
              {/* Integrated Filters */}
              <div className="bg-card/50 backdrop-blur-sm rounded-lg p-6 border border-border/50">
                <PricingFilters
                  uniqueTypes={uniqueTypes}
                  uniqueViews={uniqueViews}
                  uniqueFloors={uniqueFloors}
                  selectedTypes={selectedTypes}
                  setSelectedTypes={setSelectedTypes}
                  selectedViews={selectedViews}
                  setSelectedViews={setSelectedViews}
                  selectedFloors={selectedFloors}
                  setSelectedFloors={setSelectedFloors}
                  additionalColumns={additionalColumns}
                  getUniqueAdditionalValues={getUniqueAdditionalValues}
                  selectedAdditionalFilters={selectedAdditionalFilters}
                  setSelectedAdditionalFilters={setSelectedAdditionalFilters}
                  resetFilters={resetFilters}
                  visibleColumns={visibleColumns}
                  allColumns={allColumns}
                  toggleColumnVisibility={toggleColumnVisibility}
                  resetColumnVisibility={resetColumnVisibility}
                />

                <div className="mt-6 pt-6 border-t border-border/50">
                  <PricingExportControls
                    filteredUnits={filteredUnits}
                    pricingConfig={pricingConfig}
                    createSummaryData={() => createSummaryData(filteredUnits)}
                  />
                </div>
              </div>

              {/* Table */}
              <div className="border border-border/50 rounded-lg overflow-hidden">
                <PricingTable
                  filteredUnits={filteredUnits}
                  visibleColumns={visibleColumns}
                  additionalColumns={additionalColumns}
                  handleSort={handleSort}
                  isFullScreen={false}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Full Screen Modal */}
      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-[100vw] w-full h-full max-h-[100vh] p-0 overflow-hidden [&>button]:hidden">
          <DialogHeader className="gradient-bg text-primary-foreground p-6 border-b flex-shrink-0">
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
          
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Filters in Full Screen - Compact Layout */}
            <div className="flex-shrink-0 bg-card/50 backdrop-blur-sm border-b border-border/50 p-4">
              <PricingFilters
                uniqueTypes={uniqueTypes}
                uniqueViews={uniqueViews}
                uniqueFloors={uniqueFloors}
                selectedTypes={selectedTypes}
                setSelectedTypes={setSelectedTypes}
                selectedViews={selectedViews}
                setSelectedViews={setSelectedViews}
                selectedFloors={selectedFloors}
                setSelectedFloors={setSelectedFloors}
                additionalColumns={additionalColumns}
                getUniqueAdditionalValues={getUniqueAdditionalValues}
                selectedAdditionalFilters={selectedAdditionalFilters}
                setSelectedAdditionalFilters={setSelectedAdditionalFilters}
                resetFilters={resetFilters}
                visibleColumns={visibleColumns}
                allColumns={allColumns}
                toggleColumnVisibility={toggleColumnVisibility}
                resetColumnVisibility={resetColumnVisibility}
              />

              <div className="mt-4 pt-4 border-t border-border/50">
                <PricingExportControls
                  filteredUnits={filteredUnits}
                  pricingConfig={pricingConfig}
                  createSummaryData={() => createSummaryData(filteredUnits)}
                />
              </div>
            </div>

            {/* Table in Full Screen - Scrollable */}
            <div className="flex-1 overflow-auto">
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