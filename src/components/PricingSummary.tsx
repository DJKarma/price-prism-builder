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
import { DollarSign } from "lucide-react";
import clsx from "clsx";

interface PricingSummaryProps {
  data: any[];
  showDollarSign?: boolean;
  highlightedTypes?: string[];
  showAcPsf?: boolean;
}

type MetricType = "avg" | "min" | "max";
type MetricCategory = "psf" | "acPsf" | "size" | "price";

/* ───────────────── animated number ───────────────── */
const AnimatedNumber: React.FC<{ value: number; run: boolean }> = ({
  value,
  run,
}) => {
  const [disp, setDisp] = useState(value);

  useEffect(() => {
    if (!run) return setDisp(value);
    let i = 0;
    const id = setInterval(() => {
      if (i === 6) {
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

/* ───────────────── component ───────────────── */
const PricingSummary: React.FC<PricingSummaryProps> = ({
  data,
  showDollarSign = true,
  highlightedTypes = [],
  showAcPsf = false,
}) => {
  /* ---------- state ---------- */
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

  /* ---------- format helpers ---------- */
  const formatLargeNumber = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(2)}M`
      : n >= 1_000
      ? `${(n / 1_000).toFixed(0)}K`
      : n.toFixed(0);

  const formatNumber = (n: number, price = false) =>
    !isFinite(n) || isNaN(n)
      ? "-"
      : price
      ? formatLargeNumber(n)
      : Math.ceil(n).toLocaleString();

  /* ---------- build summary + total ---------- */
  useEffect(() => {
    if (!data?.length) return;

    /* group by type */
    const groups: Record<string, any[]> = {};
    data.forEach((u) => {
      const t = u.type || "Unknown";
      groups[t] = groups[t] || [];
      groups[t].push(u);
    });

    const perType = Object.keys(groups).map((t) => {
      const items = groups[t].filter(
        (u) => Number(u.sellArea) > 0 && u.finalTotalPrice > 0
      );
      if (!items.length)
        return {
          type: t,
          unitCount: 0,
          totalArea: 0,
          avgSize: 0,
          minSize: 0,
          maxSize: 0,
          avgPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          avgPsf: 0,
          minPsf: 0,
          maxPsf: 0,
          avgAcPsf: 0,
          minAcPsf: 0,
          maxAcPsf: 0,
          totalValue: 0,
        };

      const saArr = items.map((u) => Number(u.sellArea));
      const priceArr = items.map((u) => u.finalTotalPrice);
      const psfArr = items.map(
        (u) => u.finalPsf || u.finalTotalPrice / Number(u.sellArea || 1)
      );
      const acItems = items.filter((u) => Number(u.acArea) > 0);
      const acPsfArr = acItems.map(
        (u) => u.finalAcPsf || u.finalTotalPrice / Number(u.acArea || 1)
      );

      return {
        type: t,
        unitCount: items.length,
        totalArea: saArr.reduce((s, v) => s + v, 0),
        avgSize: saArr.reduce((s, v) => s + v, 0) / items.length,
        minSize: Math.min(...saArr),
        maxSize: Math.max(...saArr),
        avgPrice: priceArr.reduce((s, v) => s + v, 0) / items.length,
        minPrice: Math.min(...priceArr),
        maxPrice: Math.max(...priceArr),
        avgPsf: psfArr.reduce((s, v) => s + v, 0) / items.length,
        minPsf: Math.min(...psfArr),
        maxPsf: Math.max(...psfArr),
        avgAcPsf: acPsfArr.length
          ? acPsfArr.reduce((s, v) => s + v, 0) / acPsfArr.length
          : 0,
        minAcPsf: acPsfArr.length ? Math.min(...acPsfArr) : 0,
        maxAcPsf: acPsfArr.length ? Math.max(...acPsfArr) : 0,
        totalValue: priceArr.reduce((s, v) => s + v, 0),
      };
    });

    /* sort */
    perType.sort((a, b) =>
      a[sortConfig.key] < b[sortConfig.key]
        ? sortConfig.direction === "ascending"
          ? -1
          : 1
        : a[sortConfig.key] > b[sortConfig.key]
        ? sortConfig.direction === "ascending"
          ? 1
          : -1
        : 0
    );

    /* TOTAL */
    const valid = data.filter(
      (u) => Number(u.sellArea) > 0 && u.finalTotalPrice > 0
    );
    const totSell = valid.reduce((s, u) => s + Number(u.sellArea), 0);
    const totVal = valid.reduce((s, u) => s + u.finalTotalPrice, 0);
    const totUnits = valid.length;
    const totPsf = totSell ? totVal / totSell : 0;

    /* AC totals */
    const acValid = valid.filter((u) => Number(u.acArea) > 0);
    let avgAc = 0,
      minAc = 0,
      maxAc = 0;
    if (acValid.length) {
      const totAcArea = acValid.reduce((s, u) => s + Number(u.acArea), 0);
      const acPsfs = acValid.map(
        (u) => u.finalAcPsf || u.finalTotalPrice / Number(u.acArea || 1)
      );
      avgAc = totVal / totAcArea;
      minAc = Math.min(...acPsfs);
      maxAc = Math.max(...acPsfs);
    }

    setTotalSummary({
      unitCount: totUnits,
      totalArea: totSell,
      avgSize: totSell / (totUnits || 1),
      minSize: Math.min(...valid.map((u) => Number(u.sellArea))),
      maxSize: Math.max(...valid.map((u) => Number(u.sellArea))),
      avgPrice: totVal / (totUnits || 1),
      minPrice: Math.min(...valid.map((u) => u.finalTotalPrice)),
      maxPrice: Math.max(...valid.map((u) => u.finalTotalPrice)),
      totalValue: totVal,
      avgPsf: totPsf,
      minPsf: Math.min(
        ...valid.map(
          (u) => u.finalPsf || u.finalTotalPrice / Number(u.sellArea || 1)
        )
      ),
      maxPsf: Math.max(
        ...valid.map(
          (u) => u.finalPsf || u.finalTotalPrice / Number(u.sellArea || 1)
        )
      ),
      avgAcPsf: avgAc,
      minAcPsf: minAc,
      maxAcPsf: maxAc,
    });

    setSummaryData(perType);
  }, [data, sortConfig]);

  /* ---------- metric selector helpers ---------- */
  const toggleMetric = (cat: MetricCategory, m: MetricType) =>
    setSelectedMetrics((prev) => {
      const list = prev[cat];
      return {
        ...prev,
        [cat]: list.includes(m)
          ? list.length === 1
            ? list
            : list.filter((x) => x !== m)
          : [...list, m],
      };
    });

  const renderMetricSelector = (cat: MetricCategory, label: string) => (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground font-medium">{label}</span>
      <div className="flex flex-wrap gap-3 items-center">
        {(["min", "avg", "max"] as MetricType[]).map((m) => (
          <div key={`${cat}-${m}`} className="flex items-center space-x-2">
            <Checkbox
              id={`${cat}-${m}`}
              checked={selectedMetrics[cat].includes(m)}
              onCheckedChange={() => toggleMetric(cat, m)}
            />
            <label
              htmlFor={`${cat}-${m}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {m.toUpperCase()}
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  const getMetricValue = (
    row: any,
    cat: MetricCategory,
    metric: MetricType
  ) => {
    switch (cat) {
      case "psf":
        return row[`${metric}Psf`] || 0;
      case "acPsf":
        return row[`${metric}AcPsf`] || 0;
      case "size":
        return row[`${metric}Size`] || 0;
      case "price":
        return row[`${metric}Price`] || 0;
    }
  };

  const renderMetricCell = (
    row: any,
    cat: MetricCategory,
    flash: boolean
  ) => {
    const list = selectedMetrics[cat];
    if (!list.length) return null;
    return (
      <div className="space-y-1">
        {list.map((m) => {
          const v = getMetricValue(row, cat, m);
          const label = m === "avg" ? "Avg" : m === "min" ? "Min" : "Max";
          return (
            <div
              key={`${cat}-${m}`}
              className={clsx(m === "avg" ? "font-medium" : "text-gray-600 text-sm")}
            >
              <span className="font-medium text-xs">{label}:</span>{" "}
              {flash ? (
                <AnimatedNumber value={v} run={flash} />
              ) : (
                formatNumber(v, cat === "price")
              )}
            </div>
          );
        })}
      </div>
    );
  };

  /* ---------- JSX ---------- */
  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Pricing Summary</CardTitle>
        <CardDescription>
          Breakdown by bedroom type with PSF analytics
        </CardDescription>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          {renderMetricSelector("size", "Size")}
          {renderMetricSelector("price", "Price")}
          {renderMetricSelector("psf", "SA PSF")}
          {showAcPsf && renderMetricSelector("acPsf", "AC PSF")}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bedroom Type</TableHead>
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
                      flash &&
                        "bg-yellow-50 animate-[pulse_0.8s_ease-in-out_infinite]"
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

              {/* TOTAL */}
              <TableRow className="bg-gray-50 font-medium">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">
                  {totalSummary.unitCount}
                </TableCell>
                <TableCell className="text-right">
                  {renderMetricCell(totalSummary, "size", false)}
                </TableCell>
                <TableCell className="text-right">
                  {showDollarSign && selectedMetrics.price.length > 0 && (
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
