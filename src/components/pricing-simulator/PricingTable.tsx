// src/components/pricing-simulator/PricingTable.tsx

import React from "react";
import { ArrowUpDown, Check } from "lucide-react";
import { formatNumberWithCommas } from "./pricingUtils";
import { UnitWithPricing } from "../PricingSimulator";

interface Props {
  filteredUnits: UnitWithPricing[];
  visibleColumns: string[];
  additionalColumns: string[];
  handleSort: (key: string) => void;
  isFullScreen?: boolean;
}

export default function PricingTable({
  filteredUnits,
  visibleColumns,
  additionalColumns,
  handleSort,
  isFullScreen = false,
}: Props) {
  // build the list for the Add-Cat Premium header
  const addCatList = additionalColumns.join(", ") || "none";

  return (
    <div
      className={`
        ${isFullScreen ? 'h-full' : 'max-h-[650px]'} overflow-y-auto overflow-x-auto
        border-0 ${isFullScreen ? '' : 'border border-border rounded-lg shadow-sm'}
      `}
    >
      <table className="min-w-full table-fixed border-separate border-spacing-0 bg-background">
        <thead className={`${isFullScreen ? 'bg-muted' : 'bg-muted'} sticky top-0 z-10`}>
          <tr>
            {/* BASIC */}
            {["name", "type", "floor", "view"].map((col) =>
              visibleColumns.includes(col) ? (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-3 py-3 text-left text-sm font-medium border-b border-border cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center">
                    {col.charAt(0).toUpperCase() + col.slice(1)}{" "}
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
              ) : null
            )}

            {/* RAW ADDITIONAL */}
            {additionalColumns.map((col) =>
              visibleColumns.includes(col) ? (
                <th
                  key={col}
                  className="px-3 py-3 text-left text-sm font-medium border-b border-border"
                >
                  {col}
                </th>
              ) : null
            )}

            {/* PREMIUMS FOR ADDITIONAL */}
            {additionalColumns.map((col) =>
              visibleColumns.includes(`${col}_premium`) ? (
                <th
                  key={`${col}_premium`}
                  onClick={() => handleSort(`${col}_premium`)}
                  className="px-3 py-3 text-right text-xs font-medium text-muted-foreground border-b border-border cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex justify-end items-center">
                    {col} Premium <ArrowUpDown className="ml-1 h-3 w-3" />
                  </div>
                </th>
              ) : null
            )}

            {/* AREAS */}
            {[
              "sellArea",
              "acArea",
              // ── NEW HEADERS ──
              "acPrice",
              "balconyPrice",
              "balconyArea",
              "balconyPercentage",
            ].map((col) =>
              visibleColumns.includes(col) ? (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-3 py-3 text-right text-sm font-medium border-b border-border cursor-pointer whitespace-nowrap hover:bg-muted/30 transition-colors"
                >
                  <div className="flex justify-end items-center">
                    {{
                      acPrice: "AC Component",
                      balconyPrice: "Balcony Component",
                      balconyPercentage: "Balcony %",
                    }[col] ||
                      (col.charAt(0).toUpperCase() + col.slice(1))}{" "}
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
              ) : null
            )}

            {/* PRICING & PSF */}
            {[
              "basePsf",
              "viewPsfAdjustment",
              "floorAdjustment",
              "additionalAdjustment",
              "psfAfterAllAdjustments",
              "flatAddTotal",
              "totalPriceRaw",
              "finalTotalPrice",
              "finalPsf",
              "finalAcPsf",
            ].map((col) => {
              if (!visibleColumns.includes(col)) return null;
              // prettify header
              let label: React.ReactNode = col
                .replace(/([A-Z])/g, " $1")
                .replace("Raw", " (unc.)")
                .trim();
              if (col === "additionalAdjustment") {
                label = <>Add-Cat Premium ({addCatList})</>;
              }
              if (col === "flatAddTotal") {
                label = "Flat Adders";
              }
              return (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-3 py-3 text-right text-xs font-medium text-muted-foreground border-b border-border cursor-pointer whitespace-nowrap hover:bg-muted/30 transition-colors"
                >
                  <div className="flex justify-end items-center">
                    <strong
                      className={
                        col === "finalTotalPrice" ||
                        col === "finalPsf" ||
                        col === "finalAcPsf"
                          ? "font-medium"
                          : undefined
                      }
                    >
                      {label}
                    </strong>
                    {col !== "finalTotalPrice" && (
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    )}
                  </div>
                </th>
              );
            })}

            {/* OPTIMIZED */}
            {visibleColumns.includes("isOptimized") && (
              <th className="px-3 py-3 text-center text-sm font-medium border-b border-border">
                Optimized
              </th>
            )}
          </tr>
        </thead>

        <tbody>
          {filteredUnits.length > 0 ? (
            filteredUnits.map((unit, idx) => (
              <tr
                key={unit.name ?? idx}
                className={`${
                  unit.isOptimized ? "bg-green-50" : "hover:bg-indigo-50/30"
                } transition-colors`}
              >
                {visibleColumns.includes("name") && (
                  <td className="px-3 py-2 border-b border-border/50 text-sm">
                    {unit.name}
                  </td>
                )}
                {visibleColumns.includes("type") && (
                  <td className="px-3 py-2 border-b border-border/50 text-sm">
                    {unit.type}
                  </td>
                )}
                {visibleColumns.includes("floor") && (
                  <td className="px-3 py-2 border-b border-border/50 text-sm">
                    {unit.floor}
                  </td>
                )}
                {visibleColumns.includes("view") && (
                  <td className="px-3 py-2 border-b border-border/50 text-sm">
                    {unit.view}
                  </td>
                )}

                {/* RAW ADDITIONAL */}
                {additionalColumns.map((col) =>
                  visibleColumns.includes(col) ? (
                    <td
                      key={col}
                      className="px-3 py-2 border-b border-border/50 text-sm"
                    >
                      {unit[`${col}_value`] ?? "–"}
                    </td>
                  ) : null
                )}

                {/* PREMIUMS ADDITIONAL */}
                {additionalColumns.map((col) =>
                  visibleColumns.includes(`${col}_premium`) ? (
                    <td
                      key={`${col}_premium`}
                      className="px-3 py-2 border-b border-border/50 text-right text-sm"
                    >
                      {unit.additionalCategoryPriceComponents?.[
                        `${col}: ${unit[`${col}_value`]}`
                      ] ?? 0}
                    </td>
                  ) : null
                )}

                {visibleColumns.includes("sellArea") && (
                  <td className="px-3 py-2 border-b border-border/50 text-right text-sm">
                    {Math.round(parseFloat(unit.sellArea))}
                  </td>
                )}
                {visibleColumns.includes("acArea") && (
                  <td className="px-3 py-2 border-b border-border/50 text-right text-sm">
                    {Math.round(parseFloat(unit.acArea))}
                  </td>
                )}
                {/* ── NEW CELLS ── */}
                {visibleColumns.includes("acPrice") && (
                  <td className="px-3 py-2 border-b border-border/50 text-right text-sm">
                    {Math.round(unit.acPrice).toLocaleString()}
                  </td>
                )}
                {visibleColumns.includes("balconyPrice") && (
                  <td className="px-3 py-2 border-b border-border/50 text-right text-sm">
                    {Math.round(unit.balconyPrice).toLocaleString()}
                  </td>
                )}
                {visibleColumns.includes("balconyArea") && (
                  <td className="px-3 py-2 border-b border-border/50 text-right text-sm">
                    {Math.round(unit.balconyArea)}
                  </td>
                )}
                {visibleColumns.includes("balconyPercentage") && (
                  <td className="px-3 py-2 border-b border-border/50 text-right text-sm">
                    {Math.round(unit.balconyPercentage)}%
                  </td>
                )}
                {visibleColumns.includes("basePsf") && (
                  <td className="px-3 py-2 border-b border-border/50 text-right text-sm">
                    {Math.round(unit.basePsf)}
                  </td>
                )}
                {visibleColumns.includes("viewPsfAdjustment") && (
                  <td className="px-3 py-2 border-b border-border/50 text-right text-sm">
                    {Math.round(unit.viewPsfAdjustment)}
                  </td>
                )}
                {visibleColumns.includes("floorAdjustment") && (
                  <td className="px-3 py-2 border-b border-border/50 text-right text-sm">
                    {Math.round(unit.floorAdjustment)}
                  </td>
                )}
                {visibleColumns.includes("additionalAdjustment") && (
                  <td className="px-3 py-2 border-b border-border/50 text-right text-sm">
                    {Math.round(unit.additionalAdjustment)}
                  </td>
                )}
                {visibleColumns.includes("psfAfterAllAdjustments") && (
                  <td className="px-3 py-2 border-b border-border/50 text-right text-sm">
                    {Math.round(unit.psfAfterAllAdjustments)}
                  </td>
                )}
                {visibleColumns.includes("flatAddTotal") && (
                  <td className="px-3 py-2 border-b border-border/50 text-right text-sm">
                    {Math.round(unit.flatAddTotal).toLocaleString()}
                  </td>
                )}
                {visibleColumns.includes("totalPriceRaw") && (
                  <td className="px-3 py-2 border-b border-border/50 text-right text-sm">
                    {Math.round(unit.totalPriceRaw).toLocaleString()}
                  </td>
                )}
                {visibleColumns.includes("finalTotalPrice") && (
                  <td className="px-3 py-2 border-b border-border/50 text-right text-sm font-medium">
                    {formatNumberWithCommas(unit.finalTotalPrice)}
                  </td>
                )}
                {visibleColumns.includes("finalPsf") && (
                  <td className="px-3 py-2 border-b border-border/50 text-right text-sm font-medium">
                    {Math.round(unit.finalPsf)}
                  </td>
                )}
                {visibleColumns.includes("finalAcPsf") && (
                  <td className="px-3 py-2 border-b border-border/50 text-right text-sm font-medium">
                    {Math.round(unit.finalAcPsf)}
                  </td>
                )}
                {visibleColumns.includes("isOptimized") && (
                  <td className="px-3 py-2 border-b border-border/50 text-center">
                    {unit.isOptimized && (
                      <Check className="mx-auto h-5 w-5 text-green-600" />
                    )}
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={visibleColumns.length || 1}
                className="py-8 text-center text-muted-foreground italic"
              >
                No units match your filter criteria
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
