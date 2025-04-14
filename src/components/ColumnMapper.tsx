
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
  onMappingComplete: (mapping: Record<string, string>, data: any[]) => void;
  onBack: () => void; // New prop for back button
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
  onBack,
}) => {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  const [showWarningDialog, setShowWarningDialog] = useState<boolean>(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [blankValues, setBlankValues] = useState<{field: string, count: number}[]>([]);
  const [additionalCategories, setAdditionalCategories] = useState<{column: string, categories: string[]}[]>([]);
  const [selectedAdditionalCategories, setSelectedAdditionalCategories] = useState<Record<string, boolean>>({});

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
    
    // Detect potential additional categories in unmapped columns
    detectAdditionalCategories();
  }, [headers, data]);

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

  const detectAdditionalCategories = () => {
    if (!data.length) return;
    
    // Find unmapped columns that might contain categorical data
    const mappedColumns = new Set(Object.values(mapping));
    const unmappedColumns = headers.filter(header => !mappedColumns.has(header));
    
    const potentialCategories: {column: string, categories: string[]}[] = [];
    
    unmappedColumns.forEach(column => {
      // Skip columns that seem to contain numerical data
      const firstFewValues = data.slice(0, 10).map(row => row[column]);
      const seemsNumerical = firstFewValues.every(val => 
        val === undefined || val === null || val === "" || !isNaN(Number(val))
      );
      
      if (!seemsNumerical) {
        // Extract unique values from this column
        const uniqueValues = new Set<string>();
        data.forEach(row => {
          const value = row[column];
          if (value !== undefined && value !== null && value !== "") {
            uniqueValues.add(String(value));
          }
        });
        
        // If there's a reasonable number of unique values, it might be categorical
        if (uniqueValues.size > 1 && uniqueValues.size <= 15) {
          potentialCategories.push({
            column,
            categories: Array.from(uniqueValues)
          });
        }
      }
    });
    
    setAdditionalCategories(potentialCategories);
    
    // Initialize selected categories state
    const initialSelectedState: Record<string, boolean> = {};
    potentialCategories.forEach(cat => {
      cat.categories.forEach(category => {
        initialSelectedState[`${cat.column}:${category}`] = false;
      });
    });
    setSelectedAdditionalCategories(initialSelectedState);
  };

  const handleMappingChange = (fieldId: string, headerName: string) => {
    setMapping(prev => ({
      ...prev,
      [fieldId]: headerName
    }));
  };

  const toggleAdditionalCategory = (column: string, category: string) => {
    const key = `${column}:${category}`;
    setSelectedAdditionalCategories(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const validateData = () => {
    // Check for missing required field mappings
    const missing = requiredFields.filter(field => !mapping[field.id]);
    
    // Special check for floor mapping
    const floorMapped = mapping["floor"] !== undefined;
    
    // Check for blank values in mapped fields
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
    
    // Add special warning for floor if not mapped
    if (!floorMapped) {
      toast.warning("Floor column not detected. Units will default to floor 0 in simulation.");
    }
    
    // Show warning dialog if there are issues
    if (missing.length > 0 || blanks.length > 0) {
      setShowWarningDialog(true);
      return false;
    }
    
    return true;
  };

  const handleSubmit = () => {
    // Validate data first
    if (!validateData()) {
      return;
    }
    
    proceedWithMapping();
  };

  const proceedWithMapping = () => {
    // Transform data based on mapping, with default values for unmapped fields
    const transformedData = data.map(row => {
      const transformedRow: Record<string, any> = {};
      
      // Include default values for all fields, even if not mapped
      allFields.forEach(field => {
        if (mapping[field.id]) {
          // Use the mapped column value if available
          let value = row[mapping[field.id]];
          
          // Handle special cases and blank values
          if (field.id === "floor") {
            value = parseFloorValue(value);
          } else if (["sellArea", "acArea", "balcony"].includes(field.id)) {
            // Convert area values to numbers, handle blanks with default 0
            value = parseNumericValue(value, 0);
          }
          
          transformedRow[field.id] = value !== undefined && value !== null && value !== "" 
            ? value 
            : getDefaultValue(field.id);
        } else {
          // Use default value for unmapped fields
          transformedRow[field.id] = getDefaultValue(field.id);
        }
      });
      
      // Add selected additional categories as attributes
      Object.entries(selectedAdditionalCategories).forEach(([key, isSelected]) => {
        if (isSelected) {
          const [column, category] = key.split(':');
          // Check if this row has this category value
          if (row[column] === category) {
            // Add this as a boolean attribute
            transformedRow[`has_${column}_${category}`.replace(/\s+/g, '_').toLowerCase()] = true;
          }
        }
      });
      
      return transformedRow;
    });
    
    // Show a toast if some fields were not mapped
    const unmappedFields = allFields.filter(field => !mapping[field.id]);
    if (unmappedFields.length > 0) {
      toast.info(`Using default values for: ${unmappedFields.map(f => f.label).join(", ")}`);
    }
    
    // Pass the selected additional categories info to the next step
    const selectedCategories = Object.entries(selectedAdditionalCategories)
      .filter(([_, isSelected]) => isSelected)
      .map(([key, _]) => {
        const [column, category] = key.split(':');
        return { column, category };
      });
    
    onMappingComplete(mapping, transformedData);
  };

  // Helper function to parse floor values
  const parseFloorValue = (value: any): string => {
    if (value === undefined || value === null || value.toString().trim() === "") {
      return "0"; // Default floor value changed to 0
    }
    
    const strValue = value.toString().trim().toUpperCase();
    
    // Handle various forms of ground floor notation
    if (["G", "GF", "GROUND", "GROUND FLOOR", "G FLOOR", "G F"].includes(strValue)) {
      return "0";
    }
    
    // Handle numeric values
    const numValue = parseInt(strValue);
    if (!isNaN(numValue)) {
      return numValue.toString();
    }
    
    // For other non-numeric floor labels (like "B" for basement), keep as is
    return strValue;
  };

  // Helper function to parse numeric values with defaults
  const parseNumericValue = (value: any, defaultValue: number): number => {
    if (value === undefined || value === null || value.toString().trim() === "") {
      return defaultValue;
    }
    
    const numValue = parseFloat(value.toString().replace(/,/g, ''));
    return isNaN(numValue) ? defaultValue : numValue;
  };

  // Helper function to get default values
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
        return "0"; // Changed from "1" to "0"
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

  // Helper to render default value preview for unmapped fields
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
            
            {additionalCategories.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">Additional Categories Detected</h3>
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    We've detected additional categorical data in your CSV. Select any categories you'd like to include in pricing calculations.
                  </AlertDescription>
                </Alert>
                
                {additionalCategories.map((cat) => (
                  <div key={cat.column} className="mb-6">
                    <h4 className="text-sm font-medium mb-2">{cat.column}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {cat.categories.map((category) => {
                        const key = `${cat.column}:${category}`;
                        return (
                          <div 
                            key={key} 
                            className={`p-2 rounded border cursor-pointer flex items-center ${
                              selectedAdditionalCategories[key] 
                                ? 'bg-primary/10 border-primary/30' 
                                : 'bg-background border-input'
                            }`}
                            onClick={() => toggleAdditionalCategory(cat.column, category)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedAdditionalCategories[key] || false}
                              onChange={() => toggleAdditionalCategory(cat.column, category)}
                              className="mr-2"
                            />
                            <span className="text-sm truncate">{category}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSubmit} className="w-full sm:w-auto">
            Confirm Mapping and Continue
          </Button>
        </CardFooter>
      </Card>
      
      {/* Warning Dialog for missing fields or blank values */}
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
