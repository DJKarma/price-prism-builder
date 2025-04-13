
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MapPin } from "lucide-react";

interface ColumnMapperProps {
  headers: string[];
  data: any[];
  onMappingComplete: (mapping: Record<string, string>, data: any[]) => void;
}

const requiredFields = [
  { id: "name", label: "Unit Name" },
  { id: "sellArea", label: "Sell Area" },
];

const optionalFields = [
  { id: "acArea", label: "AC Area" },
  { id: "balcony", label: "Balcony" },
  { id: "view", label: "View" },
  { id: "type", label: "Bedroom Type" },
  { id: "floor", label: "Floor Level" },
];

const allFields = [...requiredFields, ...optionalFields];

const ColumnMapper: React.FC<ColumnMapperProps> = ({
  headers,
  data,
  onMappingComplete,
}) => {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<Record<string, any>>({});

  useEffect(() => {
    // Auto-map columns based on similar names
    const initialMapping: Record<string, string> = {};
    
    allFields.forEach(field => {
      const matchedHeader = headers.find(header => 
        header.toLowerCase().includes(field.id.toLowerCase()) ||
        field.label.toLowerCase().includes(header.toLowerCase())
      );
      
      if (matchedHeader) {
        initialMapping[field.id] = matchedHeader;
      }
    });
    
    setMapping(initialMapping);
  }, [headers]);

  useEffect(() => {
    // Update preview data when mapping changes
    if (data.length > 0) {
      const preview: Record<string, any> = {};
      
      Object.entries(mapping).forEach(([fieldId, headerName]) => {
        preview[fieldId] = data[0][headerName];
      });
      
      setPreviewData(preview);
    }
  }, [mapping, data]);

  const handleMappingChange = (fieldId: string, headerName: string) => {
    setMapping(prev => ({
      ...prev,
      [fieldId]: headerName
    }));
  };

  const handleSubmit = () => {
    // Validate required fields
    const missingFields = requiredFields.filter(field => !mapping[field.id]);
    
    if (missingFields.length > 0) {
      toast.error(`Please map these required fields: ${missingFields.map(f => f.label).join(", ")}`);
      return;
    }
    
    // Transform data based on mapping
    const transformedData = data.map(row => {
      const transformedRow: Record<string, any> = {};
      
      Object.entries(mapping).forEach(([fieldId, headerName]) => {
        transformedRow[fieldId] = row[headerName] || "";
      });
      
      return transformedRow;
    });
    
    onMappingComplete(mapping, transformedData);
  };

  const renderColumnPreview = (fieldId: string) => {
    if (!mapping[fieldId] || !data.length) return null;
    
    return (
      <div className="text-xs text-muted-foreground mt-1 bg-muted p-1 rounded overflow-hidden text-ellipsis max-w-xs">
        Sample: <span className="font-mono">{data[0][mapping[fieldId]] || "N/A"}</span>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Map Your CSV Columns
        </CardTitle>
        <CardDescription>
          Match each property attribute to the corresponding column in your CSV file
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-3">Required Fields</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requiredFields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-1">
                    {field.label} <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={mapping[field.id] || ""}
                    onValueChange={(value) => handleMappingChange(field.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a column" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderColumnPreview(field.id)}
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-3">Optional Fields</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {optionalFields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <label className="text-sm font-medium">{field.label}</label>
                  <Select
                    value={mapping[field.id] || ""}
                    onValueChange={(value) => handleMappingChange(field.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a column" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderColumnPreview(field.id)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSubmit} className="w-full sm:w-auto">
          Confirm Mapping and Continue
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ColumnMapper;
