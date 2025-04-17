import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, DollarSign } from "lucide-react";
import clsx from "clsx"; // yarn add clsx  (if not already in your deps)

interface PricingSummaryProps {
  data: any[];
  showDollarSign?: boolean;
  highlightedTypes?: string[];      // NEW
  showAcPsf?: boolean;
}

type MetricType = "avg" | "min" | "max";
type MetricCategory = "psf" | "acPsf" | "size" | "price";

/* ───────── animation helper ───────── */
const AnimatedNumber: React.FC<{ value: number; run: boolean }> = ({
  value,
  run,
}) => {
  const [disp, setDisp] = useState(value);
  useEffect(() => {
    if (!run) return setDisp(value);
    let i = 0;
    const id = setInterval(() => {
      if (i >= 6) {
        clearInterval(id);
        setDisp(value);
        return;
      }
      const p = i / 6;
      const eased = 1 - Math.pow(1 - p, 3);
      const mid = disp + (value - disp) * eased;
      setDisp(Number(mid.toFixed(0)));
      i++;
    }, 60);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, run]);
  return <>{disp.toLocaleString()}</>;
};

const PricingSummary: React.FC<PricingSummaryProps> = ({
  data,
  showDollarSign = true,
  highlightedTypes = [],          // NEW
  showAcPsf = false,
}) => {
  /* ---------------- existing state / helpers (unchanged) ---------------- */
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [totalSummary, setTotalSummary] = useState<any>({});
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  }>({ key: "type", direction: "ascending" });

  const [selectedMetrics, setSelectedMetrics] = useState<
    Record<MetricCategory, MetricType[]>
  >({
    psf: ["avg"],
    acPsf: ["avg"],
    size: ["avg"],
    price: ["avg"],
  });

  /* ------------ existing helpers (formatLargeNumber / formatNumber) ------------- */
  const formatLargeNumber = (num: number): string => {
    if (!isFinite(num) || isNaN(num)) return "-";
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toFixed(0);
  };
  const formatNumber = (num: number, isPrice = false): string =>
    !isFinite(num) || isNaN(num)
      ? "-"
      : isPrice
      ? formatLargeNumber(num)
      : Math.ceil(num).toLocaleString();

  /* ---- massive useEffect that builds summaryData & totalSummary (unchanged) ---- */
  /* (the entire body of your original useEffect remains exactly the same) */
  /*  … copy‑paste from your existing file … */

  /* -------- metric selector / cell render helpers (unchanged) -------- */
  /*  … keep renderMetricSelector, toggleMetric, getMetricValue … */

  const renderMetricCell = (
    row: any,
    category: MetricCategory,
    flash: boolean
  ) => {
    const metrics = selectedMetrics[category];
    if (metrics.length === 0) return null;
    const out: JSX.Element[] = [];

    metrics.forEach((m) => {
      const v = getMetricValue(row, category, m as MetricType);
      const label =
        m === "avg" ? "Avg" : m === "min" ? "Min" : m === "max" ? "Max" : "";
      out.push(
        <div
          key={`${category}-${m}`}
          className={clsx(
            m === "avg" ? "font-medium" : "text-gray-600 text-sm"
          )}
        >
          <span className="font-medium text-xs">{label}:</span>{" "}
          {flash ? (
            <AnimatedNumber value={v} run={flash} />
          ) : (
            formatNumber(v, category === "price")
          )}
        </div>
      );
    });
    return <div className="space-y-1">{out}</div>;
  };

  /* ----------------------------- JSX ----------------------------- */
  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Pricing Summary</CardTitle>
        <CardDescription>
          Breakdown by bedroom type with PSF analytics
        </CardDescription>

        {/* metric selectors (unchanged) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          {renderMetricSelector("size", "Size")}
          {renderMetricSelector("price", "Price")}
          {renderMetricSelector("psf", "SA PSF")}
          {showAcPsf && renderMetricSelector("acPsf", "AC PSF")}
        </div>
      </CardHeader>

      {/* ---------- table ---------- */}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right border-l border-gray-200">
                  SA PSF
                </TableHead>
                {showAcPsf && (
                  <TableHead className="text-right border-l border-gray-200">
                    AC PSF
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {summaryData.map((row) => {
                const flash = highlightedTypes.includes(row.type);
                return (
                  <TableRow
                    key={row.type}
                    className={clsx(
                      flash && "bg-yellow-50 animate-[pulse_0.8s_ease-in-out_infinite]"
                    )}
                  >
                    <TableCell className="font-medium">{row.type}</TableCell>
                    <TableCell className="text-right">{row.unitCount}</TableCell>
                    <TableCell className="text-right">
                      {renderMetricCell(row, "size", flash)}
                    </TableCell>
                    <TableCell className="text-right">
                      {showDollarSign &&
                        selectedMetrics.price.length > 0 && (
                          <DollarSign className="h-3 w-3 inline mr-0.5" />
                        )}
                      {renderMetricCell(row, "price", flash)}
                    </TableCell>
                    <TableCell className="text-right border-l border-gray-200">
                      {renderMetricCell(row, "psf", flash)}
                    </TableCell>
                    {showAcPsf && (
                      <TableCell className="text-right border-l border-gray-200">
                        {renderMetricCell(row, "acPsf", flash)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}

              {/* TOTAL row (unchanged except we disable flash) */}
              <TableRow className="bg-gray-50 font-medium">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">
                  {totalSummary.unitCount}
                </TableCell>
                <TableCell className="text-right">
                  {renderMetricCell(totalSummary, "size", false)}
                </TableCell>
                <TableCell className="text-right">
                  {showDollarSign &&
                    selectedMetrics.price.length > 0 && (
                      <DollarSign className="h-3 w-3 inline mr-0.5" />
                    )}
                  {renderMetricCell(totalSummary, "price", false)}
                </TableCell>
                <TableCell className="text-right border-l border-gray-200">
                  <Badge variant="outline" className="bg-indigo-50 border-indigo-200">
                    {renderMetricCell(totalSummary, "psf", false)}
                  </Badge>
                </TableCell>
                {showAcPsf && (
                  <TableCell className="text-right border-l border-gray-200">
                    <Badge variant="outline" className="bg-indigo-50 border-indigo-200">
                      {renderMetricCell(totalSummary, "acPsf", false)}
                    </Badge>
                  </TableCell>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingSummary;
