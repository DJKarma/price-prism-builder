import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileUp, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import * as XLSX from "xlsx";

/**
 * Props interface for CSVUploader.
 */
interface CSVUploaderProps {
  onDataParsed: (data: any[], headers: string[]) => void;
}

/**
 * The main upload page for property data.
 * - Allows CSV or Excel file selection.
 * - Parses file using FileReader + XLSX for Excel.
 * - Provides user feedback via toast notifications.
 * - Showcases subtle animations for a more fancy UI.
 */
const CSVUploader: React.FC<CSVUploaderProps> = ({
  onDataParsed
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    if (selectedFile && !["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"].includes(selectedFile.type)) {
      toast.error("Please upload a CSV or Excel file");
      return;
    }
    setFile(selectedFile);
  };
  const handleUpload = () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const content = e.target?.result;
        let data: any[] = [];
        let headers: string[] = [];
        if (file.name.endsWith(".csv")) {
          // Process CSV
          const text = content as string;
          const lines = text.split("\n");
          headers = lines[0].split(",").map(header => header.trim());
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === "") continue;
            const values = lines[i].split(",").map(value => value.trim());
            const row: Record<string, any> = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || "";
            });
            data.push(row);
          }
        } else {
          // Process Excel
          const workbook = XLSX.read(content, {
            type: "binary"
          });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convert Excel data to JSON with header row
          const result = XLSX.utils.sheet_to_json(worksheet, {
            header: 1
          });
          if (result.length > 0) {
            headers = (result[0] as any[]).map(header => String(header).trim());
            for (let i = 1; i < result.length; i++) {
              if (!result[i] || (result[i] as any[]).length === 0) continue;
              const row: Record<string, any> = {};
              (result[i] as any[]).forEach((value, index) => {
                if (index < headers.length) {
                  row[headers[index]] = value !== undefined ? String(value).trim() : "";
                }
              });
              data.push(row);
            }
          }
        }
        onDataParsed(data, headers);
        toast.success(`${file.name} successfully parsed!`);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error("Error parsing file. Please check the format.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      toast.error("Error reading file");
      setIsUploading(false);
    };
    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };
  return <div className="animate-fade-in transition-all duration-300">
      <Card className="
          w-full 
          shadow-xl 
          transform 
          hover:scale-[1.01] 
          hover:shadow-2xl 
          transition-all 
          duration-300 
          bg-gradient-to-br 
          from-white 
          to-indigo-50
        ">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5 text-indigo-600" />
            <span className="text-indigo-800">Upload Property Data</span>
          </CardTitle>
          <CardDescription className="text-indigo-600">
            Upload your CSV or Excel file containing property data
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 p-12 mb-4 animate-fade-in bg-slate-50 rounded-none">
            <FileUp className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm text-gray-500 mb-2">
              Drag and drop your CSV or Excel file here, or click to browse
            </p>
            <input type="file" id="csv-upload" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
            <label htmlFor="csv-upload" className="
                mt-2 
                px-4 
                py-2 
                bg-primary 
                text-white 
                rounded 
                cursor-pointer 
                hover:bg-primary/90
                transition-all
              ">
              Browse Files
            </label>
            {file && <div className="mt-4 text-sm flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </span>
              </div>}
          </div>
        </CardContent>

        <CardFooter className="flex justify-end">
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? "Processing..." : "Upload and Parse File"}
          </Button>
        </CardFooter>
      </Card>

      {/* Subtle footer text with fade-in animation */}
      <div className="mt-8 text-center text-xs text-gray-500 animate-fade-in">
        © 2025 Price Prism Builder. All rights reserved.
        <br />
        <span className="font-medium text-indigo-600">
          Created by Dhananjay Shembekar
        </span>
      </div>

      {/* Add the keyframe animation in global CSS or index.css instead of using style jsx */}
    </div>;
};
export default CSVUploader;