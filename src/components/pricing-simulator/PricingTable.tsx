import React from "react";
import { ArrowUpDown, Check } from "lucide-react";
import { formatNumberWithCommas } from "./pricingUtils";
import { UnitWithPricing } from "../PricingSimulator";

interface Props {
  filteredUnits: UnitWithPricing[];
  visibleColumns: string[];
  additionalColumns: string[];
  handleSort: (key: string) => void;
}

export default function PricingTable({
  filteredUnits,
  visibleColumns,
  additionalColumns,
  handleSort,
}: Props) {
  // build the list for the Add-Cat Premium header
  const addCatList = additionalColumns.join(", ") || "none";

  return (
    <div
      className="
        max-h-[650px] overflow-y-scroll overflow-x-auto
        scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-indigo-50
        border border-gray-200 rounded-b
      "
    >
      <table className="min-w-full table-fixed border-separate border-spacing-0">
        <thead className="bg-indigo-50 sticky top-0 z-10">
          <tr>
            {/* BASIC */}
            {["name", "type", "floor", "view"].map((col) =>
              visibleColumns.includes(col) ? (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-2 py-1 text-left text-sm border-b border-gray-200 cursor-pointer"
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
                  className="px-2 py-1 text-left text-sm border-b border-gray-200"
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
                  className="px-2 py-1 text-right text-xs text-muted-foreground border-b border-gray-200 cursor-pointer"
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
              "balconyArea",
              "balconyPercentage",
            ].map((col) =>
              visibleColumns.includes(col) ? (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-2 py-1 text-right text-sm border-b border-gray-200 cursor-pointer whitespace-nowrap"
                >
                  <div className="flex justify-end items-center">
                    {col === "balconyPercentage"
                      ? "Balcony %"
                      : col.charAt(0).toUpperCase() + col.slice(1)}{" "}
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
                  className="px-2 py-1 text-right text-xs text-muted-foreground border-b border-gray-200 cursor-pointer whitespace-nowrap"
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
                    {col !== "finalTotalPrice" && <ArrowUpDown className="ml-1 h-3 w-3" />}
                  </div>
                </th>
              );
            })}

            {/* OPTIMIZED */}
            {visibleColumns.includes("isOptimized") && (
              <th className="px-2 py-1 text-center text-sm border-b border-gray-200">
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
                  <td className="px-2 py-1 border-b border-gray-100">{unit.name}</td>
                )}
                {visibleColumns.includes("type") && (
                  <td className="px-2 py-1 border-b border-gray-100">{unit.type}</td>
                )}
                {visibleColumns.includes("floor") && (
                  <td className="px-2 py-1 border-b border-gray-100">{unit.floor}</td>
                )}
                {visibleColumns.includes("view") && (
                  <td className="px-2 py-1 border-b border-gray-100">{unit.view}</td>
                )}

                {/* RAW ADDITIONAL */}
                {additionalColumns.map((col) =>
                  visibleColumns.includes(col) ? (
                    <td key={col} className="px-2 py-1 border-b border-gray-100">
                      {unit[`${col}_value`] ?? "–"}
                    </td>
                  ) : null
                )}

                {/* PREMIUMS ADDITIONAL */}
                {additionalColumns.map((col) =>
                  visibleColumns.includes(`${col}_premium`) ? (
                    <td
                      key={`${col}_premium`}
                      className="px-2 py-1 border-b border-gray-100 text-right"
                    >
                      {unit.additionalCategoryPriceComponents?.[`${col}: ${unit[`${col}_value`]}`] ??
                        0}
                    </td>
                  ) : null
                )}

                {visibleColumns.includes("sellArea") && (
                  <td className="px-2 py-1 border-b border-gray-100 text-right">
                    {parseFloat(unit.sellArea).toFixed(2)}
                  </td>
                )}
                {visibleColumns.includes("acArea") && (
                  <td className="px-2 py-1 border-b border-gray-100 text-right">
                    {parseFloat(unit.acArea).toFixed(2)}
                  </td>
                )}
                {visibleColumns.includes("balconyArea") && (
                  <td className="px-2 py-1 border-b border-gray-100 text-right">
                    {unit.balconyArea.toFixed(2)}
                  </td>
                )}
                {visibleColumns.includes("balconyPercentage") && (
                  <td className="px-2 py-1 border-b border-gray-100 text-right">
                    {unit.balconyPercentage.toFixed(2)}%
                  </td>
                )}
                {visibleColumns.includes("basePsf") && (
                  <td className="px-2 py-1 border-b border-gray-100 text-right">
                    {unit.basePsf.toFixed(2)}
                  </td>
                )}
                {visibleColumns.includes("viewPsfAdjustment") && (
                  <td className="px-2 py-1 border-b border-gray-100 text-right">
                    {unit.viewPsfAdjustment.toFixed(2)}
                  </td>
                )}
                {visibleColumns.includes("floorAdjustment") && (
                  <td className="px-2 py-1 border-b border-gray-100 text-right">
                    {unit.floorAdjustment.toFixed(2)}
                  </td>
                )}
                {visibleColumns.includes("additionalAdjustment") && (
                  <td className="px-2 py-1 border-b border-gray-100 text-right">
                    {unit.additionalAdjustment.toFixed(2)}
                  </td>
                )}
                {visibleColumns.includes("psfAfterAllAdjustments") && (
                  <td className="px-2 py-1 border-b border-gray-100 text-right">
                    {unit.psfAfterAllAdjustments.toFixed(2)}
                  </td>
                )}
                {visibleColumns.includes("flatAddTotal") && (
                  <td className="px-2 py-1 border-b border-gray-100 text-right">
                    {unit.flatAddTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                )}
                {visibleColumns.includes("totalPriceRaw") && (
                  <td className="px-2 py-1 border-b border-gray-100 text-right">
                    {unit.totalPriceRaw.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                )}
                {visibleColumns.includes("finalTotalPrice") && (
                  <td className="px-2 py-1 border-b border-gray-100 text-right font-medium">
                    {formatNumberWithCommas(unit.finalTotalPrice)}
                  </td>
                )}
                {visibleColumns.includes("finalPsf") && (
                  <td className="px-2 py-1 border-b border-gray-100 text-right font-medium">
                    {unit.finalPsf.toFixed(2)}
                  </td>
                )}
                {visibleColumns.includes("finalAcPsf") && (
                  <td className="px-2 py-1 border-b border-gray-100 text-right font-medium">
                    {unit.finalAcPsf.toFixed(2)}
                  </td>
                )}
                {visibleColumns.includes("isOptimized") && (
                  <td className="px-2 py-1 border-b border-gray-100 text-center">
                    {unit.isOptimized && <Check className="mx-auto h-5 w-5 text-green-600" />}
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={visibleColumns.length || 1}
                className="py-6 text-center text-gray-500 italic"
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
