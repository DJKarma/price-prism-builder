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
import { MapPin, AlertTriangle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ColumnMapperProps {
  headers: string[];
  data: any[];
  onMappingComplete: (mapping: Record<string, string>, data: any[], additionalCategories: any[]) => void;
  onBack: () => void;
}

export interface AdditionalCategory {
  column: string;
  categories: string[];
  selectedCategories: string[];
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

const calculateStringSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().replace(/\s+/g, '');
  const s2 = str2.toLowerCase().replace(/\s+/g, '');
  
  const keywords = {
    "name": ["unit", "name", "number", "id", "unitname", "unitnumber", "unitid"],
    "sellArea": ["sell", "area", "sellable", "saleable", "saleablearea", "sellarea", "sellablearea", "sqft", "sqm", "salesarea", "totalarea"],
    "acArea": ["ac", "acarea", "aircon", "airconditioned", "air-con", "indoor"],
    "balcony": ["balcony", "balc", "outdoor", "external", "terrace", "patio"],
    "view": ["view", "facing", "aspect", "exposure", "direction", "outlook"],
    "type": ["type", "bedroom", "bedrooms", "bedroomtype", "unit", "category", "layout"],
    "floor": ["floor", "level", "storey", "story", "floorlevel"]
  };
  
  if (s1 === s2) return 1;
  
  for (const [fieldId, keywordList] of Object.entries(keywords)) {
    if (fieldId === str1) {
      if (keywordList.some(keyword => s2.includes(keyword))) {
        return 0.9;
      }
    }
  }
  
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }
  
  let commonChars = 0;
  for (const char of s1) {
    if (s2.includes(char)) {
      commonChars++;
    }
  }
  
  return (2 * commonChars) / (s1.length + s2.length);
};

const ColumnMapper: React.FC<ColumnMapperProps> = ({
  headers,
  data,
  onMappingComplete,
  onBack,
}) => {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  const [showWarningDialog, setShowWarningDialog] = useState<boolean>(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [blankValues, setBlankValues] = useState<{field: string, count: number}[]>([]);
  const [additionalCategories, setAdditionalCategories] = useState<AdditionalCategory[]>([]);

  useEffect(() => {
    const initialMapping: Record<string, string> = {};
    
    const mappedHeaders = new Set<string>();
    
    allFields.forEach(field => {
      const similarities = headers.map(header => ({
        header,
        score: calculateStringSimilarity(field.id, header) || 
               calculateStringSimilarity(field.label, header)
      }));
      
      similarities.sort((a, b) => b.score - a.score);
      
      const bestMatch = similarities.find(s => 
        s.score > 0.5 && !mappedHeaders.has(s.header)
      );
      
      if (bestMatch) {
        initialMapping[field.id] = bestMatch.header;
        mappedHeaders.add(bestMatch.header);
      }
    });
    
    allFields.forEach(field => {
      if (!initialMapping[field.id]) {
        const exactMatch = headers.find(header => 
          !mappedHeaders.has(header) && 
          (header.toLowerCase() === field.id.toLowerCase() || 
           header.toLowerCase() === field.label.toLowerCase())
        );
        
        if (exactMatch) {
          initialMapping[field.id] = exactMatch;
          mappedHeaders.add(exactMatch);
        }
      }
    });
    
    allFields.forEach(field => {
      if (!initialMapping[field.id]) {
        const partialMatch = headers.find(header => 
          !mappedHeaders.has(header) && 
          (header.toLowerCase().includes(field.id.toLowerCase()) || 
           field.id.toLowerCase().includes(header.toLowerCase()) ||
           header.toLowerCase().includes(field.label.toLowerCase()) ||
           field.label.toLowerCase().includes(header.toLowerCase()))
        );
        
        if (partialMatch) {
          initialMapping[field.id] = partialMatch;
          mappedHeaders.add(partialMatch);
        }
      }
    });
    
    console.log("Auto-mapped columns:", initialMapping);
    setMapping(initialMapping);
  }, [headers, data]);

  useEffect(() => {
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

  const validateData = () => {
    const missing = requiredFields.filter(field => !mapping[field.id]);
    
    const floorMapped = mapping["floor"] !== undefined;
    
    const blanks: {field: string, count: number}[] = [];
    
    Object.entries(mapping).forEach(([fieldId, headerName]) => {
      const field = allFields.find(f => f.id === fieldId);
      if (field) {
        const blankCount = data.filter(row => 
          !row[headerName] || row[headerName].toString().trim() === ""
        ).length;
        
        if (blankCount > 0) {
          blanks.push({
            field: field.label,
            count: blankCount
          });
        }
      }
    });
    
    setMissingFields(missing.map(f => f.label));
    setBlankValues(blanks);
    
    if (!floorMapped) {
      toast.warning("Floor column not detected. Units will default to floor 0 in simulation.");
    }
    
    if (missing.length > 0 || blanks.length > 0) {
      setShowWarningDialog(true);
      return false;
    }
    
    return true;
  };

  const handleSubmit = () => {
    if (!validateData()) {
      return;
    }
    
    proceedWithMapping();
  };

  const proceedWithMapping = () => {
    const transformedData = data.map(row => {
      const transformedRow: Record<string, any> = {};
      
      allFields.forEach(field => {
        if (mapping[field.id]) {
          let value = row[mapping[field.id]];
          
          if (field.id === "floor") {
            value = parseFloorValue(value);
          } else if (["sellArea", "acArea", "balcony"].includes(field.id)) {
            value = parseNumericValue(value, 0);
          }
          
          transformedRow[field.id] = value !== undefined && value !== null && value !== "" 
            ? value 
            : getDefaultValue(field.id);
        } else {
          transformedRow[field.id] = getDefaultValue(field.id);
        }
      });
      
      headers.forEach(header => {
        if (!Object.values(mapping).includes(header)) {
          const key = `additional_${header}`.replace(/\s+/g, '_').toLowerCase();
          transformedRow[key] = row[header];
        }
      });
      
      return transformedRow;
    });
    
    const unmappedFields = allFields.filter(field => !mapping[field.id]);
    if (unmappedFields.length > 0) {
      toast.info(`Using default values for: ${unmappedFields.map(f => f.label).join(", ")}`);
    }
    
    const mappedHeaders = new Set(Object.values(mapping));
    const unmappedHeaders = headers.filter(header => !mappedHeaders.has(header));
    
    const additionalCategoriesData = unmappedHeaders.map(header => {
      const uniqueValues = Array.from(new Set(
        data
          .map(row => row[header])
          .filter(value => value !== undefined && value !== null && value !== "")
          .map(value => String(value))
      ));
      
      return {
        column: header,
        categories: uniqueValues
      };
    });
    
    const filteredCategories = additionalCategoriesData
      .filter(cat => cat.categories.length > 0 && cat.categories.length <= 20);
    
    onMappingComplete(mapping, transformedData, filteredCategories);
  };

  const parseFloorValue = (value: any): string => {
    if (value === undefined || value === null || value.toString().trim() === "") {
      return "0";
    }
    
    const strValue = value.toString().trim().toUpperCase();
    
    if (["G", "GF", "GROUND", "GROUND FLOOR", "G FLOOR", "G F"].includes(strValue)) {
      return "0";
    }
    
    const numValue = parseInt(strValue);
    if (!isNaN(numValue)) {
      return numValue.toString();
    }
    
    return strValue;
  };

  const parseNumericValue = (value: any, defaultValue: number): number => {
    if (value === undefined || value === null || value.toString().trim() === "") {
      return defaultValue;
    }
    
    const numValue = parseFloat(value.toString().replace(/,/g, ''));
    return isNaN(numValue) ? defaultValue : numValue;
  };

  const getDefaultValue = (fieldId: string): any => {
    switch (fieldId) {
      case "name":
        return "Unit 1";
      case "sellArea":
        return 0;
      case "acArea":
        return 0;
      case "balcony":
        return 0;
      case "floor":
        return "0";
      case "type":
        return "Standard";
      case "view":
        return "Normal";
      default:
        return "";
    }
  };

  const renderColumnPreview = (fieldId: string) => {
    if (!mapping[fieldId] || !data.length) return null;
    
    return (
      <div className="text-xs text-muted-foreground mt-1 bg-muted p-1 rounded overflow-hidden text-ellipsis max-w-xs">
        Sample: <span className="font-mono">{data[0][mapping[fieldId]] || "N/A"}</span>
      </div>
    );
  };

  const renderDefaultPreview = (fieldId: string) => {
    if (mapping[fieldId] || !data.length) return null;
    
    return (
      <div className="text-xs text-muted-foreground mt-1 bg-amber-100 p-1 rounded overflow-hidden text-ellipsis max-w-xs">
        Default: <span className="font-mono">{getDefaultValue(fieldId)}</span>
      </div>
    );
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Upload
            </Button>
          </div>
          <CardTitle className="flex items-center gap-2 mt-4">
            <MapPin className="h-5 w-5" />
            Map Your CSV Columns
          </CardTitle>
          <CardDescription>
            Match each property attribute to the corresponding column in your CSV file.
            Unmapped fields will use default values.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6 bg-amber-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Special floor values like "G" (Ground Floor) will be automatically converted. 
              Blank values will use defaults: 0 for numeric fields, "Unit 1" for names, etc.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-3">Required Fields</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requiredFields.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <label className="text-sm font-medium flex items-center gap-1">
                      {field.label} <span className="text-amber-500">*</span>
                    </label>
                    <Select
                      value={mapping[field.id] || undefined}
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
                    {renderDefaultPreview(field.id)}
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
                      value={mapping[field.id] || undefined}
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
                    {renderDefaultPreview(field.id)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={handleSubmit} 
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Confirm Mapping and Continue
          </Button>
        </CardFooter>
      </Card>
      
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Data Mapping Issues</AlertDialogTitle>
            <AlertDialogDescription>
              The following issues were found in your data mapping:
              
              {missingFields.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-amber-600">Missing required fields:</p>
                  <ul className="list-disc pl-5 mt-1">
                    {missingFields.map(field => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {blankValues.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-amber-600">Blank values detected:</p>
                  <ul className="list-disc pl-5 mt-1">
                    {blankValues.map(item => (
                      <li key={item.field}>
                        {item.field}: {item.count} blank values detected
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <p className="mt-3">
                Default values will be used for missing fields and blank values. Do you want to proceed?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={proceedWithMapping}>
              Continue with Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ColumnMapper;
