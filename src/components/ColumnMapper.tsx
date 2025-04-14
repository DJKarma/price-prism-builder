
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
  { id: "name", label: "Unit Name", keywords: ["unit", "name", "id", "number", "no", "apartment", "apt", "property", "lot"] },
  { id: "sellArea", label: "Sell Area", keywords: ["sell", "area", "sellable", "saleable", "sales", "sqft", "sq ft", "sqm", "sq m", "square", "size", "built up", "gross", "net", "usable", "carpet"] },
];

const optionalFields = [
  { id: "acArea", label: "AC Area", keywords: ["ac", "air", "conditioning", "climate", "cool", "controlled", "hvac"] },
  { id: "balcony", label: "Balcony", keywords: ["balcony", "patio", "outdoor", "terrace", "deck", "veranda", "porch"] },
  { id: "floor", label: "Floor Level", keywords: ["floor", "level", "story", "storey", "elevation", "height", "tier"] },
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
  const [additionalCategories, setAdditionalCategories] = useState<AdditionalCategory[]>([]);
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
  
  // Detect unmapped columns that could be used for additional categories
  useEffect(() => {
    if (!data.length) return;
    
    const mappedColumns = new Set(Object.values(mapping));
    const unmappedColumns = headers.filter(header => !mappedColumns.has(header));
    
    const potentialCategories: AdditionalCategory[] = [];
    
    unmappedColumns.forEach(column => {
      // Exclude view and bedroom type columns 
      const columnLower = column.toLowerCase();
      const isViewOrType = 
        columnLower.includes("view") || 
        columnLower.includes("facing") || 
        columnLower.includes("direction") ||
        columnLower.includes("bed") || 
        columnLower.includes("type") || 
        columnLower.includes("layout");
      
      if (isViewOrType) {
        return;
      }
      
      const firstFewValues = data.slice(0, 10).map(row => row[column]);
      const seemsNumerical = firstFewValues.every(val => 
        val === undefined || val === null || val === "" || !isNaN(Number(val))
      );
      
      if (!seemsNumerical) {
        const uniqueValues = new Set<string>();
        data.forEach(row => {
          const value = row[column];
          if (value !== undefined && value !== null && value !== "") {
            uniqueValues.add(String(value));
          }
        });
        
        if (uniqueValues.size > 1 && uniqueValues.size <= 20) {
          // Set all categories as selected by default
          const categories = Array.from(uniqueValues).sort();
          potentialCategories.push({
            column,
            categories: categories,
            selectedCategories: [...categories] // Select all by default
          });
        }
      }
    });
    
    setAdditionalCategories(potentialCategories);
  }, [headers, data, mapping]);

  // Update available headers whenever mappings change
  useEffect(() => {
    const mappedHeaders = new Set(Object.values(mapping));
    setAvailableHeaders(headers.filter(header => !mappedHeaders.has(header)));
  }, [headers, mapping]);

  // Initialize mappings with smart detection based on enhanced fuzzy matching
  useEffect(() => {
    const initialMapping: Record<string, string> = {};
    const usedHeaders = new Set<string>();
    
    // Exact matches have highest priority
    allFields.forEach(field => {
      if (initialMapping[field.id]) return;
      
      // Try exact match (case insensitive)
      const exactMatch = headers.find(header => {
        const headerLower = header.toLowerCase();
        return !usedHeaders.has(header) && (
          headerLower === field.id.toLowerCase() || 
          headerLower === field.label.toLowerCase()
        );
      });
      
      if (exactMatch) {
        initialMapping[field.id] = exactMatch;
        usedHeaders.add(exactMatch);
      }
    });
    
    // Look for keyword matches next
    allFields.forEach(field => {
      if (initialMapping[field.id]) return;
      
      // Score-based fuzzy matching for keywords
      const scoredHeaders = headers
        .filter(header => !usedHeaders.has(header))
        .map(header => {
          const headerLower = header.toLowerCase();
          let score = 0;
          
          // Score each keyword match
          field.keywords.forEach(keyword => {
            const keywordLower = keyword.toLowerCase();
            if (headerLower === keywordLower) {
              score += 10; // Exact keyword match
            } else if (headerLower.includes(keywordLower)) {
              score += 5; // Partial keyword match
            } else if (keywordLower.includes(headerLower)) {
              score += 3; // Header is contained in keyword
            }
            
            // Distance-based scoring for fuzzy matching
            const distance = levenshteinDistance(headerLower, keywordLower);
            if (distance <= 2) {
              score += (3 - distance); // Close matches get higher scores
            }
          });
          
          return { header, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);
      
      if (scoredHeaders.length > 0) {
        initialMapping[field.id] = scoredHeaders[0].header;
        usedHeaders.add(scoredHeaders[0].header);
      }
    });
    
    // Additional contextual matching
    allFields.forEach(field => {
      if (initialMapping[field.id]) return;
      
      // For area fields, check for numerical columns
      if (field.id.includes("Area") && data.length > 0) {
        const numericalHeaders = headers
          .filter(header => !usedHeaders.has(header))
          .filter(header => {
            // Check if the column contains mostly numbers
            const sample = data.slice(0, 5).map(row => row[header]);
            return sample.every(val => val === undefined || val === null || val === "" || !isNaN(Number(val)));
          });
        
        // Choose the best match based on name and content
        const bestMatch = numericalHeaders.find(header => 
          header.toLowerCase().includes("area") || 
          header.toLowerCase().includes("size") || 
          header.toLowerCase().includes("sqft") ||
          header.toLowerCase().includes("sq") ||
          header.toLowerCase().includes("sqm")
        );
        
        if (bestMatch) {
          initialMapping[field.id] = bestMatch;
          usedHeaders.add(bestMatch);
        }
      }
      
      // For floor field, look for numerical columns that could represent floors
      if (field.id === "floor" && data.length > 0) {
        const potentialFloorHeaders = headers
          .filter(header => !usedHeaders.has(header))
          .filter(header => {
            const headerLower = header.toLowerCase();
            return headerLower.includes("fl") || 
                  headerLower.includes("level") || 
                  headerLower.includes("storey");
          });
        
        if (potentialFloorHeaders.length > 0) {
          initialMapping[field.id] = potentialFloorHeaders[0];
          usedHeaders.add(potentialFloorHeaders[0]);
        }
      }
    });
    
    setMapping(initialMapping);
  }, [headers, data]);

  // Calculate Levenshtein distance for fuzzy matching
  const levenshteinDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
  
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
    for (let i = 0; i <= a.length; i++) {
      matrix[0][i] = i;
    }
  
    for (let j = 0; j <= b.length; j++) {
      matrix[j][0] = j;
    }
  
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }
  
    return matrix[b.length][a.length];
  };

  useEffect(() => {
    if (data.length > 0) {
      const preview: Record<string, any> = {};
      
      Object.entries(mapping).forEach(([fieldId, headerName]) => {
        preview[fieldId] = data[0][headerName];
      });
      
      setPreviewData(preview);
    }
  }, [mapping, data]);

  const handleMappingChange = (fieldId: string, headerName: string | null) => {
    setMapping(prev => {
      const newMapping = { ...prev };
      
      // If there was a previous mapping for this field, remove it
      if (newMapping[fieldId]) {
        // No action needed since we'll update it or delete it below
      }
      
      // If headerName is null (unselected) or empty, delete the mapping
      if (!headerName) {
        delete newMapping[fieldId];
      } else {
        // Add the new mapping
        newMapping[fieldId] = headerName;
      }
      
      return newMapping;
    });
  };

  const toggleAdditionalCategory = (columnIndex: number, category: string) => {
    setAdditionalCategories(prev => {
      const updated = [...prev];
      const categoryIndex = updated[columnIndex].selectedCategories.indexOf(category);
      
      if (categoryIndex > -1) {
        updated[columnIndex].selectedCategories = 
          updated[columnIndex].selectedCategories.filter(cat => cat !== category);
      } else {
        updated[columnIndex].selectedCategories = 
          [...updated[columnIndex].selectedCategories, category];
      }
      
      return updated;
    });
  };

  const toggleAllCategoriesInColumn = (columnIndex: number, select: boolean) => {
    setAdditionalCategories(prev => {
      const updated = [...prev];
      if (select) {
        updated[columnIndex].selectedCategories = [...updated[columnIndex].categories];
      } else {
        updated[columnIndex].selectedCategories = [];
      }
      return updated;
    });
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

      additionalCategories.forEach(cat => {
        if (cat.selectedCategories.length > 0) {
          const columnValue = row[cat.column];

          cat.selectedCategories.forEach(category => {
            const key = `additional_${cat.column}_${category}`.replace(/\s+/g, '_').toLowerCase();
            transformedRow[key] = columnValue === category;
          });

          transformedRow[`${cat.column}_value`] = columnValue;
        }
      });

      return transformedRow;
    });

    const unmappedFields = allFields.filter(field => !mapping[field.id]);
    if (unmappedFields.length > 0) {
      toast.info(`Using default values for: ${unmappedFields.map(f => f.label).join(", ")}`);
    }

    const selectedCategoriesData = additionalCategories
      .filter(cat => cat.selectedCategories.length > 0)
      .map(cat => ({
        column: cat.column,
        categories: cat.selectedCategories
      }));

    onMappingComplete(mapping, transformedData, selectedCategoriesData);
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

  // Get currently available headers for a field's dropdown
  const getSelectableHeaders = (fieldId: string): string[] => {
    // If this field already has a mapping, include that header in the options
    const currentMapping = mapping[fieldId];
    if (currentMapping) {
      return [...availableHeaders, currentMapping];
    }
    return availableHeaders;
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
                      value={mapping[field.id] || ""}
                      onValueChange={(value) => handleMappingChange(field.id, value || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a column" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSelectableHeaders(field.id).map((header) => (
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
                      value={mapping[field.id] || ""}
                      onValueChange={(value) => handleMappingChange(field.id, value || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a column" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSelectableHeaders(field.id).map((header) => (
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
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-3 text-indigo-800">Additional Pricing Factors</h3>
                <Alert className="mb-4 bg-indigo-50">
                  <AlertTriangle className="h-4 w-4 text-indigo-600" />
                  <AlertDescription className="text-indigo-700">
                    We've detected additional columns in your data that can be used for pricing adjustments. 
                    These categories are selected by default.
                  </AlertDescription>
                </Alert>
                
                {additionalCategories.map((cat, catIndex) => (
                  <div key={cat.column} className="mb-8 border rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-md font-medium text-indigo-700">{cat.column}</h4>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs h-7 px-2 border-indigo-200 hover:bg-indigo-50"
                          onClick={() => toggleAllCategoriesInColumn(catIndex, true)}
                        >
                          Select All
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs h-7 px-2 border-indigo-200 hover:bg-indigo-50"
                          onClick={() => toggleAllCategoriesInColumn(catIndex, false)}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {cat.categories.map((category) => {
                        const isSelected = cat.selectedCategories.includes(category);
                        return (
                          <div 
                            key={category} 
                            className={`p-2 rounded border cursor-pointer flex items-center ${
                              isSelected 
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-800' 
                                : 'bg-background border-input'
                            }`}
                            onClick={() => toggleAdditionalCategory(catIndex, category)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleAdditionalCategory(catIndex, category)}
                              className="mr-2 text-indigo-600"
                            />
                            <span className="text-sm truncate">{category}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 text-xs text-indigo-600">
                      {cat.selectedCategories.length} of {cat.categories.length} categories selected
                    </div>
                  </div>
                ))}
              </div>
            )}
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
