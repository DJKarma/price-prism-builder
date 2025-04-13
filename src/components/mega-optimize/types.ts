
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
