
import React from "react";
import { ArrowRight } from "lucide-react";

interface OptimizationImpactProps {
  pricingConfig: any;
}

const OptimizationImpact: React.FC<OptimizationImpactProps> = ({ pricingConfig }) => {
  if (!pricingConfig.isOptimized) return null;

  return (
    <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
      <h4 className="font-medium mb-2 text-indigo-900">Optimization Impact</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h5 className="text-sm font-medium mb-1 text-indigo-800">Bedroom Type Adjustments</h5>
          <ul className="space-y-1 bg-white p-2 rounded">
            {pricingConfig.bedroomTypePricing.map((type: any) => {
              const original = type.originalBasePsf || type.basePsf;
              const current = type.basePsf;
              const change = ((current - original) / original * 100).toFixed(1);
              const isPositive = current > original;
              
              return (
                <li key={type.type} className="text-sm flex items-center justify-between">
                  <span className="font-medium">{type.type}:</span>
                  <span className="flex items-center">
                    {original.toFixed(2)}
                    <ArrowRight className="mx-1 h-3 w-3" />
                    <span className={isPositive ? "text-green-600" : "text-amber-600"}>
                      {current.toFixed(2)} ({isPositive ? "+" : ""}{change}%)
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        
        <div>
          <h5 className="text-sm font-medium mb-1 text-indigo-800">View Adjustments</h5>
          <ul className="space-y-1 bg-white p-2 rounded">
            {pricingConfig.viewPricing.map((view: any) => {
              const original = view.originalPsfAdjustment || view.psfAdjustment;
              const current = view.psfAdjustment;
              const diff = current - original;
              const isPositive = diff > 0;
              
              return (
                <li key={view.view} className="text-sm flex items-center justify-between">
                  <span className="font-medium">{view.view}:</span>
                  <span className="flex items-center">
                    {original.toFixed(2)}
                    <ArrowRight className="mx-1 h-3 w-3" />
                    <span className={isPositive ? "text-green-600" : "text-amber-600"}>
                      {current.toFixed(2)} ({isPositive ? "+" : ""}{diff.toFixed(2)})
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      
      {/* Floor Rules Adjustments - Only shown when All Parameters mode was used */}
      {pricingConfig.optimizationMode === "allParams" && pricingConfig.originalFloorRiseRules && (
        <div className="mt-3">
          <h5 className="text-sm font-medium mb-1 text-indigo-800">Floor Premium Adjustments</h5>
          <ul className="space-y-1 bg-white p-2 rounded">
            {pricingConfig.floorRiseRules.map((rule: any, index: number) => {
              const originalRule = pricingConfig.originalFloorRiseRules[index];
              if (!originalRule) return null;
              
              const origIncrement = originalRule.psfIncrement;
              const currentIncrement = rule.psfIncrement;
              const incrementChange = ((currentIncrement - origIncrement) / origIncrement * 100).toFixed(1);
              const isIncrementPositive = currentIncrement > origIncrement;
              
              return (
                <li key={`floor-${index}`} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      Floors {rule.startFloor}-{rule.endFloor === null ? "max" : rule.endFloor}:
                    </span>
                  </div>
                  <div className="pl-4 mt-1 grid grid-cols-1 gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>Base Increment:</span>
                      <span className="flex items-center">
                        {origIncrement.toFixed(2)}
                        <ArrowRight className="mx-1 h-3 w-3" />
                        <span className={isIncrementPositive ? "text-green-600" : "text-amber-600"}>
                          {currentIncrement.toFixed(2)} ({isIncrementPositive ? "+" : ""}{incrementChange}%)
                        </span>
                      </span>
                    </div>
                    
                    {rule.jumpEveryFloor && originalRule.jumpEveryFloor && (
                      <div className="flex items-center justify-between text-xs">
                        <span>Jump Increment:</span>
                        <span className="flex items-center">
                          {originalRule.jumpIncrement?.toFixed(2) || "0.00"}
                          <ArrowRight className="mx-1 h-3 w-3" />
                          <span className={
                            (rule.jumpIncrement || 0) > (originalRule.jumpIncrement || 0) 
                              ? "text-green-600" 
                              : "text-amber-600"
                          }>
                            {rule.jumpIncrement?.toFixed(2) || "0.00"}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default OptimizationImpact;
