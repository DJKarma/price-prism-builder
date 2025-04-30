// src/components/CSVUploader.tsx

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileUp, Check } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";

interface CSVUploaderProps {
  onDataParsed: (data: any[], headers: string[]) => void;
}

const APARTMENT_SAMPLE = [
  ["Unit", "Type", "Floor", "View", "Sell Area", "AC Area", "Balcony", "Additional Parameter 1", "Additional Parameter 2"],
  ["Unit 1", "1 BR", "1", "Classic view", "815", "640", "175", "", ""],
  ["Unit 2", "2 BR", "2", "Sea View",    "1075", "45",  "1030", "", ""],
  ["Unit 3", "3 BR", "20","Premium View","1800","1500","300",   "", ""],
];

const VILLA_SAMPLE = [
  ["Unit",       "Type",    "Floor", "Pool", "Total Area","Inside/Suite Area","Balcony Size","Furnished?","Additional Parameter 1","Additional Parameter 2"],
  ["Villa 1",    "1 BR",    "1",     "No",   "1800",     "1500",            "300",       "Yes",     "",                      ""],
  ["Townhouse 1","2 BR",    "2",     "Yes",  "2000",     "1800",            "200",       "No",      "",                      ""],
  ["Townhouse 2","3 BR Dup","20",    "No",   "3000",     "2500",            "500",       "Yes",     "",                      ""],
];

const renderTable = (rows: string[][]) => (
  <table className="min-w-full border-collapse">
    <thead>
      <tr className="bg-indigo-100">
        {rows[0].map((h) => (
          <th
            key={h}
            className="px-2 py-1 text-left text-sm font-semibold text-indigo-700 border border-indigo-200"
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.slice(1).map((r, i) => (
        <tr
          key={i}
          className={i % 2 === 0 ? "bg-white" : "bg-indigo-50"}
        >
          {r.map((c, j) => (
            <td
              key={j}
              className="px-2 py-1 text-xs text-gray-700 border border-indigo-200"
            >
              {c || "—"}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const CSVUploader: React.FC<CSVUploaderProps> = ({ onDataParsed }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (
      f &&
      ![
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ].includes(f.type)
    ) {
      toast.error("Please upload a CSV or Excel file");
      return;
    }
    setFile(f);
  };

  const handleUpload = () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let data: any[] = [];
        let headers: string[] = [];
        const content = e.target?.result as string;
        if (file.name.endsWith(".csv")) {
          const lines = content.split("\n").filter((l) => l.trim());
          headers = lines[0].split(",").map((h) => h.trim());
          for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(",").map((v) => v.trim());
            const row: Record<string, any> = {};
            headers.forEach((h, idx) => (row[h] = vals[idx] ?? ""));
            data.push(row);
          }
        } else {
          const wb = XLSX.read(content, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const arr = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
          if (arr.length) {
            headers = arr[0].map((h) => String(h).trim());
            for (let i = 1; i < arr.length; i++) {
              if (!arr[i] || !arr[i].length) continue;
              const row: Record<string, any> = {};
              arr[i].forEach((v, idx) => {
                if (idx < headers.length) row[headers[idx]] = v ?? "";
              });
              data.push(row);
            }
          }
        }
        onDataParsed(data, headers);
        toast.success(`${file.name} parsed successfully!`);
      } catch (err) {
        console.error(err);
        toast.error("Error parsing file");
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      toast.error("Error reading file");
      setIsUploading(false);
    };
    file.name.endsWith(".csv")
      ? reader.readAsText(file)
      : reader.readAsBinaryString(file);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold text-indigo-700">
          Prism Price Simulator
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Real Estate Pricing tool
        </p>
      </motion.div>

      {/* Sample Data Formats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full max-w-4xl bg-white shadow-md rounded-lg overflow-hidden"
      >
        <CardHeader className="bg-indigo-50">
          <CardTitle className="text-xl text-indigo-800">
            Sample Data Formats
          </CardTitle>
          <CardDescription className="px-6 pb-4 text-gray-600">
            Use one of these templates to format your upload
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-6">
          <div>
            <h3 className="font-semibold text-indigo-700 mb-2">
              Apartment / Tower
            </h3>
            {renderTable(APARTMENT_SAMPLE)}
          </div>
          <div>
            <h3 className="font-semibold text-indigo-700 mb-2">
              Villa / Townhouse
            </h3>
            {renderTable(VILLA_SAMPLE)}
          </div>
        </CardContent>
      </motion.div>

      {/* Upload Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="w-full max-w-lg mt-10"
      >
        <Card className="border-2 border-dashed border-indigo-200 hover:border-indigo-300 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-700">
              <Upload className="w-5 h-5" /> Upload Your File
            </CardTitle>
            <CardDescription>
              Drag &amp; drop a CSV or Excel file, or click to browse
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileUp className="w-12 h-12 text-gray-300 mb-4 animate-pulse" />
            <input
              id="csv-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <label htmlFor="csv-upload">
              <Button variant="outline">Browse Files</Button>
            </label>

            {file && (
              <div className="mt-4 flex items-center text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                <span>
                  {file.name} &mdash; {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
            >
              {isUploading ? "Processing…" : "Upload & Parse"}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>

      {/* Footer Credit */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-12 text-sm text-gray-500"
      >
        Created by Dhananjay Shembekar
      </motion.div>
    </div>
  );
};

export default CSVUploader;
