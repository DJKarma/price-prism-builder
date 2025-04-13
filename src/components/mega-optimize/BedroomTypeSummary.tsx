
import React, { useState } from "react";
import { Building2, Check } from "lucide-react";
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

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-lg">Bedroom Type Summary</h4>
        
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select bedroom types" />
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
          .map(type => (
            <Card key={type.type} className="border-indigo-100 hover:border-indigo-300 transition-all">
              <CardHeader className="pb-2 pt-4 px-4 bg-gradient-to-r from-indigo-50 to-blue-50">
                <CardTitle className="text-base flex justify-between items-center">
                  <span className="flex items-center">
                    <Building2 className="h-4 w-4 mr-2 text-indigo-600" />
                    {type.type}
                  </span>
                  {isOptimized && type.originalBasePsf !== undefined && (
                    <Badge 
                      variant="outline" 
                      className={type.basePsf > type.originalBasePsf 
                        ? "bg-green-50 text-green-700 border-green-200" 
                        : "bg-amber-50 text-amber-700 border-amber-200"
                      }
                    >
                      {type.basePsf > type.originalBasePsf ? "↑" : "↓"} 
                      {Math.abs(((type.basePsf - type.originalBasePsf) / type.originalBasePsf) * 100).toFixed(1)}%
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4 px-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Base PSF</p>
                    <p className="font-medium">${type.basePsf.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Target Avg PSF</p>
                    <p className="font-medium">${type.targetAvgPsf.toFixed(2)}</p>
                  </div>
                  {isOptimized && type.originalBasePsf !== undefined && (
                    <div className="col-span-2 mt-2 pt-2 border-t">
                      <p className="text-muted-foreground">Original Base PSF</p>
                      <p className="font-medium">${type.originalBasePsf.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
};

export default BedroomTypeSummary;
