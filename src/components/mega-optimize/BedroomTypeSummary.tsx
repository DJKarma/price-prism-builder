
import React, { useState, useEffect } from "react";
import { Building2, ArrowUp, ArrowDown, Ruler, SquareStack } from "lucide-react";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface BedroomType {
  type: string;
  basePsf: number;
  targetAvgPsf: number;
  originalBasePsf?: number;
  unitCount?: number;
  avgSize?: number;
  avgPsf?: number;
}

interface BedroomTypeSummaryProps {
  bedroomTypes: BedroomType[];
  isOptimized: boolean;
  onSelectedTypesChange?: (selectedTypes: string[]) => void;
}

const BedroomTypeSummary: React.FC<BedroomTypeSummaryProps> = ({
  bedroomTypes,
  isOptimized,
  onSelectedTypesChange
}) => {
  // Console log the bedroom types to debug
  console.log('BedroomTypeSummary received types:', bedroomTypes);

  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    bedroomTypes.map(type => type.type)
  );
  
  useEffect(() => {
    const allTypes = bedroomTypes.map(type => type.type);
    setSelectedTypes(prev => {
      const filteredTypes = prev.filter(type => allTypes.includes(type));
      return filteredTypes.length ? filteredTypes : allTypes;
    });
  }, [bedroomTypes]);

  useEffect(() => {
    if (onSelectedTypesChange) {
      onSelectedTypesChange(selectedTypes);
    }
  }, [selectedTypes, onSelectedTypesChange]);

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-lg">Bedroom Type Summary</h4>
        
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={`${selectedTypes.length} types selected`} />
          </SelectTrigger>
          <SelectContent>
            <div className="p-2">
              {bedroomTypes.map(type => (
                <div key={type.type} className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id={`type-${type.type}`}
                    checked={selectedTypes.includes(type.type)}
                    onCheckedChange={() => handleTypeToggle(type.type)}
                  />
                  <label
                    htmlFor={`type-${type.type}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {type.type}
                  </label>
                </div>
              ))}
            </div>
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bedroomTypes
          .filter(type => selectedTypes.includes(type.type))
          .map(type => {
            // Debug log for each type
            console.log(`Rendering bedroom type ${type.type}:`, type);
            
            const hasChanged = isOptimized && type.originalBasePsf !== undefined;
            const changePercent = hasChanged 
              ? ((type.basePsf - (type.originalBasePsf || 0)) / (type.originalBasePsf || 1)) * 100 
              : 0;
            const isIncrease = changePercent > 0;
            
            // Use provided values with proper fallbacks, ensuring we don't override with 0
            const unitCount = type.unitCount !== undefined ? type.unitCount : 0;
            const avgSize = type.avgSize !== undefined && type.avgSize > 0 ? type.avgSize : 0;
            
            // Use the correct avgPsf value that matches PricingSummary's calculation
            // This ensures consistency between the two components
            const avgPsf = type.avgPsf !== undefined ? type.avgPsf : 0;
            
            // Display targetAvgPsf as 0 initially, but show the actual value when optimized
            const displayTargetAvgPsf = isOptimized ? type.targetAvgPsf : 0;
            
            return (
              <Card 
                key={type.type} 
                className={`border hover:shadow-md transition-all h-full ${
                  hasChanged 
                    ? isIncrease 
                      ? 'border-green-200' 
                      : 'border-amber-200'
                    : 'border-indigo-100'
                }`}
              >
                <CardHeader className="pb-2 pt-4 px-4 bg-gradient-to-r from-indigo-50 to-blue-50">
                  <CardTitle className="text-base flex justify-between items-center">
                    <span className="flex items-center">
                      <Building2 className="h-4 w-4 mr-2 text-indigo-600" />
                      {type.type}
                    </span>
                    {hasChanged && (
                      <Badge 
                        variant="outline" 
                        className={isIncrease 
                          ? "bg-green-50 text-green-700 border-green-200" 
                          : "bg-amber-50 text-amber-700 border-amber-200"
                        }
                      >
                        {isIncrease ? (
                          <ArrowUp className="h-3 w-3 mr-1 inline" />
                        ) : (
                          <ArrowDown className="h-3 w-3 mr-1 inline" />
                        )}
                        {Math.abs(changePercent).toFixed(1)}%
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="grid grid-cols-1 gap-4">
                    {/* Primary pricing info with improved layout */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Base PSF</p>
                        <p className="font-medium">{type.basePsf.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Target Avg PSF</p>
                        <p className="font-medium">{displayTargetAvgPsf.toFixed(2)}</p>
                      </div>
                      {hasChanged && (
                        <div className="col-span-2 mt-2 pt-2 border-t">
                          <p className="text-muted-foreground text-xs">Original Base PSF</p>
                          <p className="font-medium">{type.originalBasePsf?.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Enhanced mini-cards section with fixed width issues */}
                    <div className="mt-2 pt-4 border-t grid grid-cols-3 gap-2">
                      {/* Units mini-card */}
                      <div className="bg-purple-50 rounded-lg p-2 flex flex-col">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-purple-700">Units</span>
                          <SquareStack className="h-3.5 w-3.5 text-purple-600" />
                        </div>
                        <p className="font-semibold text-sm text-purple-900 mt-1">{unitCount}</p>
                      </div>
                      
                      {/* Average Size mini-card */}
                      <div className="bg-blue-50 rounded-lg p-2 flex flex-col">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-blue-700">Avg Size</span>
                          <Ruler className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <p className="font-semibold text-sm text-blue-900 mt-1">
                          {avgSize > 0 ? avgSize.toFixed(0) : "0"} sf
                        </p>
                      </div>
                      
                      {/* Average PSF mini-card */}
                      <div className="bg-green-50 rounded-lg p-2 flex flex-col">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-green-700">Avg PSF</span>
                        </div>
                        <p className="font-semibold text-sm text-green-900 mt-1">
                          {avgPsf > 0 ? avgPsf.toFixed(2) : "0.00"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
};

export default BedroomTypeSummary;
