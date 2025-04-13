
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

interface CSVUploaderProps {
  onDataParsed: (data: any[], headers: string[]) => void;
}

const CSVUploader: React.FC<CSVUploaderProps> = ({ onDataParsed }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    if (selectedFile && selectedFile.type !== "text/csv") {
      toast.error("Please upload a CSV file");
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
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split("\n");
        const headers = lines[0].split(",").map(header => header.trim());
        
        const data = [];
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim() === "") continue;
          
          const values = lines[i].split(",").map(value => value.trim());
          const row: Record<string, any> = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });
          
          data.push(row);
        }
        
        onDataParsed(data, headers);
        toast.success("CSV file successfully parsed!");
      } catch (error) {
        console.error("Error parsing CSV:", error);
        toast.error("Error parsing CSV file. Please check the format.");
      } finally {
        setIsUploading(false);
      }
    };
    
    reader.onerror = () => {
      toast.error("Error reading file");
      setIsUploading(false);
    };
    
    reader.readAsText(file);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Property Data
        </CardTitle>
        <CardDescription>
          Upload your CSV file containing property data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12 mb-4 bg-gray-50">
          <FileUp className="h-12 w-12 text-gray-400 mb-3" />
          <p className="text-sm text-gray-500 mb-2">
            Drag and drop your CSV file here, or click to browse
          </p>
          <input
            type="file"
            id="csv-upload"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <label
            htmlFor="csv-upload"
            className="mt-2 px-4 py-2 bg-primary text-white rounded cursor-pointer hover:bg-primary/90"
          >
            Browse Files
          </label>
          {file && (
            <div className="mt-4 text-sm flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          onClick={handleUpload} 
          disabled={!file || isUploading}
          className="w-full sm:w-auto"
        >
          {isUploading ? "Processing..." : "Upload and Parse CSV"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CSVUploader;
