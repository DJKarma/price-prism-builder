
export interface MegaOptimizeProps {
  data: any[];
  pricingConfig: any;
  onOptimized: (optimizedConfig: any) => void;
}

export interface OptimizationResult {
  bedroomAdjustments: Record<string, number>;
  viewAdjustments: Record<string, number>;
  floorRules?: any[];
}

export interface BedroomType {
  type: string;
  basePsf: number;
  targetAvgPsf: number;
  originalBasePsf?: number;
}

export interface ViewPricing {
  view: string;
  psfAdjustment: number;
  originalPsfAdjustment?: number;
}

export interface FloorRiseRule {
  startFloor: number;
  endFloor: number | null;
  psfIncrement: number;
  jumpEveryFloor?: number;
  jumpIncrement?: number;
}

export interface PricingConfig {
  bedroomTypePricing: BedroomType[];
  viewPricing: ViewPricing[];
  floorRiseRules: FloorRiseRule[];
  originalFloorRiseRules?: FloorRiseRule[];
  basePsf: number;
  targetOverallPsf?: number;
  isOptimized?: boolean;
  optimizationMode?: "basePsf" | "allParams";
}
