
export interface MegaOptimizeProps {
  data: any[];
  pricingConfig: any;
  onOptimized: (updatedConfig: any) => void;
}

export interface TransformedUnit {
  name: string;
  sellArea: number;
  acArea?: number;
  balcony?: number;
  floor: string;
  type: string;
  view: string;
  [key: string]: any;
}

export interface AdditionalCategory {
  column: string;
  categories: string[];
}

export interface OptimizationMode {
  id: string;
  name: string;
  description: string;
}

export interface OptimizationResult {
  config: any;
  impact: {
    revenue: number;
    percentChange: number;
    unitsAffected: number;
  };
}
