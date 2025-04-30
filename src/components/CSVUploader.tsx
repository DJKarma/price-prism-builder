// src/components/CSVUploader.tsx

import React, { useState, useRef } from "react";
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

interface CSVUploaderProps {
  onDataParsed: (data: any[], headers: string[]) => void;
}

const APARTMENT_SAMPLE = [
  ["Unit", "Type", "Floor", "View", "Sell Area", "AC Area", "Balcony", "Param 1", "Param 2"],
  ["Unit 1","1 BR","1","Classic view","815","640","175","",""],
  ["Unit 2","2 BR","2","Sea View","1075","45","1030","",""],
  ["Unit 3","3 BR","20","Premium View","1800","1500","300","",""],
];

const VILLA_SAMPLE = [
  ["Unit","Type","Floor","Pool","Total Area","Inside/Suite Area","Balcony Size","Furnished?","Param 1","Param 2"],
  ["Villa 1","1 BR","1","No","1800","1500","300","Yes","",""],
  ["Townhouse 1","2 BR","2","Yes","2000","1800","200","No","",""],
  ["Townhouse 2","3 BR Dup","20","No","3000","2500","500","Yes","",""],
];

const renderSampleTable = (rows: string[][]) => (
  <div className="overflow-x-auto">
    <table className="min-w-full table-auto text-sm">
      <thead>
        <tr className="bg-indigo-100">
          {rows[0].map((h) => (
            <th
              key={h}
              className="px-3 py-2 font-medium text-indigo-800 border-b border-indigo-200"
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
                className="px-3 py-2 text-gray-700 border-b border-indigo-100"
              >
                {c || "—"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const CSVUploader: React.FC<CSVUploaderProps> = ({ onDataParsed }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    if (file.name.endsWith(".csv")) reader.readAsText(file);
    else reader.readAsBinaryString(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
      {/* Upload Section */}
      <div className="w-full max-w-lg mb-10">
        <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4 flex items-center gap-2">
            <Upload className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Upload Your File</h2>
          </div>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileUp className="w-12 h-12 text-indigo-300 mb-4 animate-pulse" />
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="ghost"
              className="border-dashed border-2 border-indigo-400 hover:border-indigo-600"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse CSV or Excel
            </Button>
            {file && (
              <div className="mt-4 flex items-center text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                <span>
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end bg-gray-50">
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {isUploading ? "Processing…" : "Upload & Parse"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Sample Data Section */}
      <div className="w-full max-w-4xl">
        <Card className="shadow-md">
          <CardHeader className="bg-indigo-50">
            <CardTitle className="text-xl text-indigo-800">
              Sample Data Formats
            </CardTitle>
            <CardDescription className="px-6 pb-4 text-gray-600">
              Use these templates to format your upload
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 px-6 pb-6">
            <div>
              <h3 className="text-indigo-700 font-semibold mb-2">
                Apartment / Tower
              </h3>
              {renderSampleTable(APARTMENT_SAMPLE)}
            </div>
            <div>
              <h3 className="text-indigo-700 font-semibold mb-2">
                Villa / Townhouse
              </h3>
              {renderSampleTable(VILLA_SAMPLE)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Credit */}
      <div className="mt-12 text-sm text-gray-500">
        Created by Dhananjay Shembekar
      </div>
    </div>
  );
};

export default CSVUploader;
