import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  FixedHeaderTable
} from "@/components/ui/table";
import { ArrowUpDown, Check } from "lucide-react";
import { formatNumberWithCommas } from './pricingUtils';
import { UnitWithPricing } from '../PricingSimulator';

interface PricingTableProps {
  filteredUnits: UnitWithPricing[];
  visibleColumns: string[];
  additionalColumns: string[];
  sortConfig: {
    key: string;
    direction: "ascending" | "descending";
  };
  handleSort: (key: string) => void;
}

const PricingTable: React.FC<PricingTableProps> = ({
  filteredUnits,
  visibleColumns,
  additionalColumns,
  sortConfig,
  handleSort,
}) => {
  return (
    <FixedHeaderTable maxHeight="650px" className="scrollbar-always-visible border-indigo-100/50 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-indigo-50/80 to-blue-50/80">
            {visibleColumns.includes("name") && (
              <TableHead
                className="cursor-pointer whitespace-nowrap"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center">
                  Unit <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
            )}
            
            {visibleColumns.includes("type") && (
              <TableHead
                className="cursor-pointer whitespace-nowrap"
                onClick={() => handleSort("type")}
              >
                <div className="flex items-center">
                  Type <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
            )}
            
            {visibleColumns.includes("floor") && (
              <TableHead
                className="cursor-pointer whitespace-nowrap"
                onClick={() => handleSort("floor")}
              >
                <div className="flex items-center">
                  Floor <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
            )}
            
            {visibleColumns.includes("view") && (
              <TableHead className="whitespace-nowrap">View</TableHead>
            )}
            
            {additionalColumns.map(column => (
              visibleColumns.includes(column) && (
                <TableHead
                  key={column}
                  className="whitespace-nowrap"
                >
                  {column}
                </TableHead>
              )
            ))}
            
            {visibleColumns.includes("sellArea") && (
              <TableHead
                className="cursor-pointer whitespace-nowrap"
                onClick={() => handleSort("sellArea")}
              >
                <div className="flex items-center">
                  Sell Area <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
            )}
            
            {visibleColumns.includes("acArea") && (
              <TableHead
                className="cursor-pointer whitespace-nowrap"
                onClick={() => handleSort("acArea")}
              >
                <div className="flex items-center">
                  AC Area <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
            )}
            
            {visibleColumns.includes("balconyArea") && (
              <TableHead
                className="cursor-pointer whitespace-nowrap"
                onClick={() => handleSort("balconyArea")}
              >
                <div className="flex items-center">
                  Balcony <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
            )}
            
            {visibleColumns.includes("balconyPercentage") && (
              <TableHead
                className="cursor-pointer whitespace-nowrap"
                onClick={() => handleSort("balconyPercentage")}
              >
                <div className="flex items-center">
                  Balcony % <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
            )}
            
            {visibleColumns.includes("basePsf") && (
              <TableHead
                className="cursor-pointer whitespace-nowrap text-right text-xs text-muted-foreground"
                onClick={() => handleSort("basePsf")}
              >
                <div className="flex items-center justify-end">
                  Base PSF <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
            )}
            
            {visibleColumns.includes("floorAdjustment") && (
              <TableHead
                className="cursor-pointer whitespace-nowrap text-right text-xs text-muted-foreground"
                onClick={() => handleSort("floorAdjustment")}
              >
                <div className="flex items-center justify-end">
                  Floor Premium <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
            )}
            
            {visibleColumns.includes("viewPsfAdjustment") && (
              <TableHead
                className="cursor-pointer whitespace-nowrap text-right text-xs text-muted-foreground"
                onClick={() => handleSort("viewPsfAdjustment")}
              >
                <div className="flex items-center justify-end">
                  View Premium <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
            )}
            
            {visibleColumns.includes("additionalAdjustment") && (
              <TableHead
                className="cursor-pointer whitespace-nowrap text-right text-xs text-muted-foreground"
                onClick={() => handleSort("additionalAdjustment")}
              >
                <div className="flex items-center justify-end">
                  Add-Cat Premium <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
            )}
            
            {visibleColumns.includes("psfAfterAllAdjustments") && (
              <TableHead
                className="cursor-pointer whitespace-nowrap text-right text-xs text-muted-foreground"
                onClick={() => handleSort("psfAfterAllAdjustments")}
              >
                <div className="flex items-center justify-end">
                  Base + All Premiums <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
            )}
            
            {visibleColumns.includes("finalTotalPrice") && (
              <TableHead
                className="cursor-pointer whitespace-nowrap border-l border-indigo-100/50"
                onClick={() => handleSort("finalTotalPrice")}
              >
                <div className="flex items-center">
                  Final Price <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
            )}
            
            {visibleColumns.includes("finalPsf") && (
              <TableHead
                className="cursor-pointer whitespace-nowrap"
                onClick={() => handleSort("finalPsf")}
              >
                <div className="flex items-center">
                  SA PSF <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
            )}
            
            {visibleColumns.includes("finalAcPsf") && (
              <TableHead
                className="cursor-pointer whitespace-nowrap"
                onClick={() => handleSort("finalAcPsf")}
              >
                <div className="flex items-center">
                  AC PSF <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
            )}
            
            {visibleColumns.includes("isOptimized") && (
              <TableHead className="whitespace-nowrap">Optimized</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUnits.length > 0 ? (
            filteredUnits.map((unit, index) => (
              <TableRow 
                key={unit.name || index}
                className={`
                  ${unit.isOptimized ? "bg-green-50/80" : "hover:bg-indigo-50/30"}
                  transition-colors duration-150 ease-in-out
                `}
              >
                {visibleColumns.includes("name") && <TableCell>{unit.name}</TableCell>}
                {visibleColumns.includes("type") && <TableCell>{unit.type}</TableCell>}
                {visibleColumns.includes("floor") && <TableCell>{unit.floor}</TableCell>}
                {visibleColumns.includes("view") && <TableCell>{unit.view}</TableCell>}
                
                {additionalColumns.map(column => (
                  visibleColumns.includes(column) && (
                    <TableCell key={column}>
                      {unit[`${column}_value`] || "-"}
                    </TableCell>
                  )
                ))}
                
                {visibleColumns.includes("sellArea") && (
                  <TableCell className="text-right">
                    {parseFloat(unit.sellArea).toFixed(2)}
                  </TableCell>
                )}
                
                {visibleColumns.includes("acArea") && (
                  <TableCell className="text-right">
                    {parseFloat(unit.acArea).toFixed(2)}
                  </TableCell>
                )}
                
                {visibleColumns.includes("balconyArea") && (
                  <TableCell className="text-right">
                    {unit.balconyArea.toFixed(2)}
                  </TableCell>
                )}
                
                {visibleColumns.includes("balconyPercentage") && (
                  <TableCell className="text-right">
                    {unit.balconyPercentage.toFixed(2)}%
                  </TableCell>
                )}
                
                {visibleColumns.includes("basePsf") && (
                  <TableCell className="text-right">
                    {unit.basePsf.toFixed(2)}
                  </TableCell>
                )}
                
                {visibleColumns.includes("floorAdjustment") && (
                  <TableCell className="text-right">
                    {unit.floorAdjustment.toFixed(2)}
                  </TableCell>
                )}
                
                {visibleColumns.includes("viewPsfAdjustment") && (
                  <TableCell className="text-right">
                    {unit.viewPsfAdjustment.toFixed(2)}
                  </TableCell>
                )}
                
                {visibleColumns.includes("additionalAdjustment") && (
                  <TableCell className="text-right">
                    {unit.additionalAdjustment?.toFixed(2) || "0.00"}
                  </TableCell>
                )}
                
                {visibleColumns.includes("psfAfterAllAdjustments") && (
                  <TableCell className="text-right">
                    {unit.psfAfterAllAdjustments.toFixed(2)}
                  </TableCell>
                )}
                
                {visibleColumns.includes("finalTotalPrice") && (
                  <TableCell className="font-medium text-right border-l border-indigo-100/50">
                    {formatNumberWithCommas(unit.finalTotalPrice)}
                  </TableCell>
                )}
                
                {visibleColumns.includes("finalPsf") && (
                  <TableCell className="font-medium text-right">
                    {unit.finalPsf.toFixed(2)}
                  </TableCell>
                )}
                
                {visibleColumns.includes("finalAcPsf") && (
                  <TableCell className="font-medium text-right">
                    {unit.finalAcPsf ? unit.finalAcPsf.toFixed(2) : "-"}
                  </TableCell>
                )}
                
                {visibleColumns.includes("isOptimized") && (
                  <TableCell className="text-center">
                    {unit.isOptimized ? (
                      <Check className="h-5 w-5 text-green-600 mx-auto" />
                    ) : null}
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={visibleColumns.length || 1}
                className="text-center py-6 text-gray-500 italic"
              >
                No units match your filter criteria
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </FixedHeaderTable>
  );
};

export default PricingTable;
