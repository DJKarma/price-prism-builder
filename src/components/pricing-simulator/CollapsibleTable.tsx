import React, { useState } from "react";
import { ChevronDown, ChevronUp, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

  return (
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
        </CardHeader>

        <CollapsibleContent 
          id="pricing-table-content"
          className="transition-all duration-300 ease-in-out"
        >
          <CardContent className="p-6">
            <PricingTable
              filteredUnits={filteredUnits}
              visibleColumns={visibleColumns}
              additionalColumns={additionalColumns}
              handleSort={handleSort}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default CollapsibleTable;