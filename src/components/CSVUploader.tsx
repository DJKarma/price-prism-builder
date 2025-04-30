import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileUp, Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface CSVUploaderProps {
  onDataParsed: (data: any[], headers: string[]) => void;
}

const sampleDataApartment = [
  ["Unit", "Type", "Floor", "View", "Sell Area", "AC Area", "Balcony", "Additional Parameter 1", "Additional Parameter 2"],
  ["Unit 1", "1 BR", "1", "Classic view", "815", "640", "175", "", ""],
  ["Unit 2", "2 BR", "2", "Sea View", "1075", "45", "1030", "", ""],
  ["Unit 3", "3 BR", "20", "Premium View", "1800", "1500", "300", "", ""],
];

const sampleDataVilla = [
  ["Unit", "Type", "Floor", "Pool", "Total Area", "Inside/Suite Area", "Balcony Size", "Furnished?", "Additional Parameter 1", "Additional Parameter 2"],
  ["Villa 1", "1 BR", "1", "No", "1800", "1500", "300", "Yes", "", ""],
  ["Townhouse 1", "2 BR", "2", "Yes", "2000", "1800", "200", "No", "", ""],
  ["Townhouse 2", "3 BR Dup", "20", "No", "3000", "2500", "500", "Yes", "", ""],
];

const CSVUploader: React.FC<CSVUploaderProps> = ({ onDataParsed }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (
      f &&
      !["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"].includes(f.type)
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
    reader.onload = e => {
      try {
        const content = e.target?.result;
        let data: any[] = [];
        let headers: string[] = [];
        if (file.name.endsWith('.csv')) {
          const text = content as string;
          const rows = text.split('\n');
          headers = rows[0].split(',').map(h => h.trim());
          for (let i = 1; i < rows.length; i++) {
            if (!rows[i].trim()) continue;
            const vals = rows[i].split(',').map(v => v.trim());
            const obj: Record<string,string> = {};
            headers.forEach((h, idx) => obj[h] = vals[idx] || '');
            data.push(obj);
          }
        } else {
          const wb = XLSX.read(content, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const arr = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];
          if (arr.length) {
            headers = arr[0].map(String);
            for (let i = 1; i < arr.length; i++) {
              const row = arr[i] as any[];
              if (!row.length) continue;
              const obj: Record<string,string> = {};
              row.forEach((v, idx) => {
                if (idx < headers.length) obj[headers[idx]] = String(v ?? '').trim();
              });
              data.push(obj);
            }
          }
        }
        onDataParsed(data, headers);
        toast.success(`${file.name} parsed successfully`);
      } catch (err) {
        console.error(err);
        toast.error('Parsing error. Please check file format.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      toast.error('File read error');
      setIsUploading(false);
    };
    file.name.endsWith('.csv') ? reader.readAsText(file) : reader.readAsBinaryString(file);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-indigo-800">Prism Price Simulator</h1>
      <p className="text-gray-600">Real Estate Pricing tool</p>

      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader>
          <CardTitle>Sample Data Formats</CardTitle>
          <CardDescription>Use these templates to format your upload</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 overflow-auto">
          <div>
            <h4 className="font-semibold">Apartment / Tower</h4>
            <table className="w-full text-sm table-auto border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>{sampleDataApartment[0].map(h => (<th key={h} className="border px-2 py-1">{h}</th>))}</tr>
              </thead>
              <tbody>
                {sampleDataApartment.slice(1).map((row,i) => (
                  <tr key={i} className={i%2 ? 'bg-white':'bg-gray-50'}>
                    {row.map((cell,j)=>(
                      <td key={j} className="border px-2 py-1">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="font-semibold">Villa / Townhouse</h4>
            <table className="w-full text-sm table-auto border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>{sampleDataVilla[0].map(h => (<th key={h} className="border px-2 py-1">{h}</th>))}</tr>
              </thead>
              <tbody>
                {sampleDataVilla.slice(1).map((row,i) => (
                  <tr key={i} className={i%2 ? 'bg-white':'bg-gray-50'}>
                    {row.map((cell,j)=>(
                      <td key={j} className="border px-2 py-1">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="text-indigo-600" />
            <CardTitle>Upload Your File</CardTitle>
          </div>
          <CardDescription>Select CSV or Excel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 space-y-3">
            <FileUp className="h-10 w-10 text-gray-400 animate-pulse" />
            <p className="text-gray-500">Drag & drop, or browse to upload</p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              id="file-input"
              onChange={handleFileChange}
            />
            <label htmlFor="file-input" className="px-4 py-2 bg-indigo-600 text-white rounded cursor-pointer hover:bg-indigo-700 transition">
              Browse Files
            </label>
            {file && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check /> {file.name}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? 'Processing...' : 'Upload & Parse'}
          </Button>
        </CardFooter>
      </Card>

      <footer className="text-gray-500 text-xs mt-4">
        Created by Dhananjay Shembekar
      </footer>
    </div>
  );
};

export default CSVUploader;
