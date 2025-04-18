import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, Check } from "lucide-react";
import { UnitWithPricing } from "../PricingSimulator";
import { formatNumberWithCommas } from "./pricingUtils";

interface Props {
  filteredUnits: UnitWithPricing[];
  visibleColumns: string[];
  additionalColumns: string[];
  sortConfig: { key: string; direction: "ascending" | "descending" };
  handleSort: (key: string) => void;
}

const num = (n: number | undefined, digits = 2) =>
  n !== undefined ? n.toLocaleString(undefined, { maximumFractionDigits: digits }) : "-";

const PricingTable: React.FC<Props> = ({
  filteredUnits,
  visibleColumns,
  additionalColumns,
  sortConfig,
  handleSort,
}) => {
  /* helper to render header cell with sort icon */
  const Th: React.FC<{ id: string; label: string; right?: boolean }> = ({ id, label, right }) => (
    visibleColumns.includes(id) && (
      <TableHead
        className={`cursor-pointer whitespace-nowrap ${right ? "text-right" : ""}`}
        onClick={() => handleSort(id)}
      >
        <div className={`flex items-center ${right ? "justify-end" : ""}`}>
          {label}
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </div>
      </TableHead>
    )
  );

  /* build dynamic list of additional & premium columns */
  const extraPremiumCols = additionalColumns.map((c) => `${c}_premium`);

  return (
    <div className="max-h-[65vh] overflow-y-auto border rounded-md">
      <Table className="min-w-full">
        {/* sticky header */}
        <TableHeader className="sticky top-0 z-10 bg-white shadow-sm">
          <TableRow className="bg-gradient-to-r from-indigo-50/80 to-blue-50/80">
            <Th id="name"  label="Unit" />
            <Th id="type"  label="Type" />
            <Th id="floor" label="Floor" />
            <Th id="view"  label="View" />

            {additionalColumns.map((col) =>
              visibleColumns.includes(col) && (
                <TableHead key={col} className="whitespace-nowrap">
                  {col}
                </TableHead>
              )
            )}

            {extraPremiumCols.map((col) =>
              visibleColumns.includes(col) && (
                <TableHead key={col} className="whitespace-nowrap text-xs text-muted-foreground">
                  {col.replace("_premium", " Premium")}
                </TableHead>
              )
            )}

            <Th id="sellArea" label="Sell Area" right />
            <Th id="acArea"   label="AC Area"   right />
            <Th id="balconyArea"       label="Balcony" right />
            <Th id="balconyPercentage" label="Balcony %" right />
            <Th id="basePsf"           label="Base PSF" right />
            <Th id="floorAdjustment"   label="Floor Premium" right />
            <Th id="viewPsfAdjustment" label="View Premium" right />
            <Th id="additionalAdjustment"     label="Add‑Cat Premium" right />
            <Th id="psfAfterAllAdjustments"   label="Base + All Premiums" right />
            <Th id="balconyPrice"   label="Balcony Price"   right />
            <Th id="acAreaPrice"    label="AC‑Area Price"   right />
            <Th id="totalPriceRaw"  label="Total Price (unc.)" right />

            {/* final price block separated by border */}
            <TableHead
              className="cursor-pointer whitespace-nowrap border-l border-indigo-100/50"
              onClick={() => handleSort("finalTotalPrice")}
            >
              <div className="flex items-center">
                Final Price <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </TableHead>
            <Th id="finalPsf"    label="SA PSF" />
            <Th id="finalAcPsf"  label="AC PSF" />
            {visibleColumns.includes("isOptimized") && (
              <TableHead className="whitespace-nowrap">Optimized</TableHead>
            )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {filteredUnits.length ? (
            filteredUnits.map((u, idx) => (
              <TableRow
                key={u.name || idx}
                className={`${u.isOptimized ? "bg-green-50/80" : "hover:bg-indigo-50/30"}
                            transition-colors duration-150`}
              >
                {visibleColumns.includes("name")  && <TableCell>{u.name}</TableCell>}
                {visibleColumns.includes("type")  && <TableCell>{u.type}</TableCell>}
                {visibleColumns.includes("floor") && <TableCell>{u.floor}</TableCell>}
                {visibleColumns.includes("view")  && <TableCell>{u.view}</TableCell>}

                {additionalColumns.map((col) =>
                  visibleColumns.includes(col) && (
                    <TableCell key={`${idx}-${col}`}>{u[`${col}_value`] ?? "-"}</TableCell>
                  )
                )}

                {extraPremiumCols.map((col) =>
                  visibleColumns.includes(col) && (
                    <TableCell key={`${idx}-${col}`} className="text-right">
                      {num(u[col])}
                    </TableCell>
                  )
                )}

                {visibleColumns.includes("sellArea")           && <TableCell className="text-right">{num(+u.sellArea, 2)}</TableCell>}
                {visibleColumns.includes("acArea")             && <TableCell className="text-right">{num(+u.acArea, 2)}</TableCell>}
                {visibleColumns.includes("balconyArea")        && <TableCell className="text-right">{num(u.balconyArea, 2)}</TableCell>}
                {visibleColumns.includes("balconyPercentage")  && <TableCell className="text-right">{num(u.balconyPercentage, 2)}%</TableCell>}
                {visibleColumns.includes("basePsf")            && <TableCell className="text-right">{num(u.basePsf)}</TableCell>}
                {visibleColumns.includes("floorAdjustment")    && <TableCell className="text-right">{num(u.floorAdjustment)}</TableCell>}
                {visibleColumns.includes("viewPsfAdjustment")  && <TableCell className="text-right">{num(u.viewPsfAdjustment)}</TableCell>}
                {visibleColumns.includes("additionalAdjustment") && <TableCell className="text-right">{num(u.additionalAdjustment)}</TableCell>}
                {visibleColumns.includes("psfAfterAllAdjustments") && <TableCell className="text-right">{num(u.psfAfterAllAdjustments)}</TableCell>}
                {visibleColumns.includes("balconyPrice")       && <TableCell className="text-right">{num(u.balconyPrice)}</TableCell>}
                {visibleColumns.includes("acAreaPrice")        && <TableCell className="text-right">{num(u.acAreaPrice)}</TableCell>}
                {visibleColumns.includes("totalPriceRaw")      && <TableCell className="text-right border-r border-indigo-100/50">{num(u.totalPriceRaw)}</TableCell>}

                {visibleColumns.includes("finalTotalPrice") && (
                  <TableCell className="font-medium text-right border-l border-indigo-100/50">
                    {formatNumberWithCommas(u.finalTotalPrice)}
                  </TableCell>
                )}
                {visibleColumns.includes("finalPsf")   && <TableCell className="font-medium text-right">{num(u.finalPsf)}</TableCell>}
                {visibleColumns.includes("finalAcPsf") && <TableCell className="font-medium text-right">{num(u.finalAcPsf)}</TableCell>}
                {visibleColumns.includes("isOptimized") && (
                  <TableCell className="text-center">
                    {u.isOptimized && <Check className="h-5 w-5 text-green-600 mx-auto" />}
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={visibleColumns.length || 1} className="text-center py-6 text-gray-500 italic">
                No units match your filter criteria
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default PricingTable;
