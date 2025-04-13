
import React, { useState, useEffect } from "react";
import { Building2, Check, ArrowUp, ArrowDown, Ruler, DollarSign, Home } from "lucide-react";
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
  // Added mock data properties for the mini-cards
  unitCount?: number;
  avgSize?: number;
  avgPsf?: number;
}

interface BedroomTypeSummaryProps {
  bedroomTypes: BedroomType[];
  isOptimized: boolean;
}

const BedroomTypeSummary: React.FC<BedroomTypeSummaryProps> = ({
  bedroomTypes,
  isOptimized
}) => {
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

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Mock data function - in a real app, this would come from props or be calculated
  const getMockData = (type: string): { unitCount: number; avgSize: number; avgPsf: number } => {
    // Generate consistent mock data based on the type string
    const typeSum = type.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return {
      unitCount: 10 + (typeSum % 40),
      avgSize: 500 + (typeSum % 1500),
      avgPsf: 1000 + (typeSum % 500),
    };
  };

  return (
    <div className="space-y-4 mt-6 mb-6">
      <div className="flex justify-between items-center">
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
            const hasChanged = isOptimized && type.originalBasePsf !== undefined;
            const changePercent = hasChanged 
              ? ((type.basePsf - (type.originalBasePsf || 0)) / (type.originalBasePsf || 1)) * 100 
              : 0;
            const isIncrease = changePercent > 0;
            
            // Get mock data for this bedroom type
            const { unitCount, avgSize, avgPsf } = type.unitCount && type.avgSize && type.avgPsf 
              ? { unitCount: type.unitCount, avgSize: type.avgSize, avgPsf: type.avgPsf }
              : getMockData(type.type);
            
            return (
              <Card 
                key={type.type} 
                className={`border hover:shadow-md transition-all ${
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
                    {/* Primary pricing info */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Base PSF</p>
                        <p className="font-medium">${type.basePsf.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Target Avg PSF</p>
                        <p className="font-medium">${type.targetAvgPsf.toFixed(2)}</p>
                      </div>
                      {hasChanged && (
                        <div className="col-span-2 mt-2 pt-2 border-t">
                          <p className="text-muted-foreground">Original Base PSF</p>
                          <p className="font-medium">${type.originalBasePsf?.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Mini-cards section */}
                    <div className="mt-2 pt-4 border-t grid grid-cols-3 gap-2">
                      {/* Units mini-card */}
                      <div className="bg-purple-50 p-2 rounded-md border border-purple-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-purple-700">Units</span>
                          <Home className="h-3 w-3 text-purple-500" />
                        </div>
                        <p className="font-medium text-sm">{unitCount}</p>
                      </div>
                      
                      {/* Average Size mini-card */}
                      <div className="bg-blue-50 p-2 rounded-md border border-blue-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-blue-700">Avg Size</span>
                          <Ruler className="h-3 w-3 text-blue-500" />
                        </div>
                        <p className="font-medium text-sm">{avgSize} sf</p>
                      </div>
                      
                      {/* Average PSF mini-card */}
                      <div className="bg-green-50 p-2 rounded-md border border-green-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-green-700">Avg PSF</span>
                          <DollarSign className="h-3 w-3 text-green-500" />
                        </div>
                        <p className="font-medium text-sm">${avgPsf.toFixed(2)}</p>
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
