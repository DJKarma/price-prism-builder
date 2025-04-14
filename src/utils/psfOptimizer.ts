// Utility function to calculate Overall Average PSF
export const calculateOverallAveragePsf = (data: any[], pricingConfig: any) => {
  if (!data.length || !pricingConfig) return 0;
  
  let totalSellArea = 0;
  let totalPrice = 0;
  
  data.forEach(unit => {
    const sellArea = parseFloat(unit.sellArea) || 0;
    if (sellArea <= 0) return; // Skip units with invalid sell area
    
    // Get bedroom type configuration
    const bedroomType = pricingConfig.bedroomTypePricing.find(
      (b: any) => b.type === unit.type
    );
    
    // Get view premium
    const viewAdjustment = pricingConfig.viewPricing.find(
      (v: any) => v.view === unit.view
    );
    
    // Calculate base PSF with adjustments
    const basePsf = bedroomType?.basePsf || pricingConfig.basePsf;
    const viewPsfAdjustment = viewAdjustment?.psfAdjustment || 0;
    
    // Calculate floor adjustments
    let floorAdjustment = 0;
    const floorLevel = parseInt(unit.floor) || 1;
    
    // Calculate floor adjustment using sorted rules
    const sortedFloorRules = [...pricingConfig.floorRiseRules].sort(
      (a: any, b: any) => a.startFloor - b.startFloor
    );
    
    let cumulativeAdjustment = 0;
    for (const rule of sortedFloorRules) {
      const ruleEnd = rule.endFloor === null ? 999 : rule.endFloor;
      if (floorLevel > ruleEnd) {
        for (let floor = Math.max(rule.startFloor, 1); floor <= ruleEnd; floor++) {
          cumulativeAdjustment += rule.psfIncrement;
          if (rule.jumpEveryFloor && rule.jumpIncrement) {
            if ((floor - rule.startFloor + 1) % rule.jumpEveryFloor === 0) {
              cumulativeAdjustment += rule.jumpIncrement;
            }
          }
        }
      } else if (floorLevel >= rule.startFloor) {
        for (let floor = Math.max(rule.startFloor, 1); floor <= floorLevel; floor++) {
          cumulativeAdjustment += rule.psfIncrement;
          if (rule.jumpEveryFloor && rule.jumpIncrement) {
            if ((floor - rule.startFloor + 1) % rule.jumpEveryFloor === 0) {
              cumulativeAdjustment += rule.jumpIncrement;
            }
          }
        }
        break;
      }
    }
    
    floorAdjustment = cumulativeAdjustment;
    
    // Add additional category adjustments if they exist
    let additionalAdjustment = 0;
    if (pricingConfig.additionalCategoryPricing) {
      pricingConfig.additionalCategoryPricing.forEach((cat: any) => {
        if (unit[`${cat.column}_value`] === cat.category) {
          additionalAdjustment += cat.psfAdjustment;
        }
      });
    }
    
    const basePsfWithAdjustments = basePsf + floorAdjustment + viewPsfAdjustment + additionalAdjustment;
    
    const unitTotalPrice = basePsfWithAdjustments * sellArea;
    const unitFinalPrice = Math.ceil(unitTotalPrice / 1000) * 1000;
    
    totalSellArea += sellArea;
    totalPrice += unitFinalPrice;
  });
  
  if (totalSellArea === 0) return 0;
  return totalPrice / totalSellArea;
};

// Add a new function to calculate Overall Average AC PSF
export const calculateOverallAverageAcPsf = (data: any[], pricingConfig: any) => {
  if (!data.length || !pricingConfig) return 0;
  
  let totalAcArea = 0;
  let totalPrice = 0;
  
  data.forEach(unit => {
    const acArea = parseFloat(unit.acArea) || 0;
    if (acArea <= 0) return; // Skip units with invalid AC area
    
    // Get bedroom type configuration
    const bedroomType = pricingConfig.bedroomTypePricing.find(
      (b: any) => b.type === unit.type
    );
    
    // Get view premium
    const viewAdjustment = pricingConfig.viewPricing.find(
      (v: any) => v.view === unit.view
    );
    
    // Calculate base PSF with adjustments
    const basePsf = bedroomType?.basePsf || pricingConfig.basePsf;
    const viewPsfAdjustment = viewAdjustment?.psfAdjustment || 0;
    
    // Calculate floor adjustments
    let floorAdjustment = 0;
    const floorLevel = parseInt(unit.floor) || 1;
    
    // Calculate floor adjustment using sorted rules
    const sortedFloorRules = [...pricingConfig.floorRiseRules].sort(
      (a: any, b: any) => a.startFloor - b.startFloor
    );
    
    let cumulativeAdjustment = 0;
    for (const rule of sortedFloorRules) {
      const ruleEnd = rule.endFloor === null ? 999 : rule.endFloor;
      if (floorLevel > ruleEnd) {
        for (let floor = Math.max(rule.startFloor, 1); floor <= ruleEnd; floor++) {
          cumulativeAdjustment += rule.psfIncrement;
          if (rule.jumpEveryFloor && rule.jumpIncrement) {
            if ((floor - rule.startFloor + 1) % rule.jumpEveryFloor === 0) {
              cumulativeAdjustment += rule.jumpIncrement;
            }
          }
        }
      } else if (floorLevel >= rule.startFloor) {
        for (let floor = Math.max(rule.startFloor, 1); floor <= floorLevel; floor++) {
          cumulativeAdjustment += rule.psfIncrement;
          if (rule.jumpEveryFloor && rule.jumpIncrement) {
            if ((floor - rule.startFloor + 1) % rule.jumpEveryFloor === 0) {
              cumulativeAdjustment += rule.jumpIncrement;
            }
          }
        }
        break;
      }
    }
    
    floorAdjustment = cumulativeAdjustment;
    
    // Add additional category adjustments if they exist
    let additionalAdjustment = 0;
    if (pricingConfig.additionalCategoryPricing) {
      pricingConfig.additionalCategoryPricing.forEach((cat: any) => {
        if (unit[`${cat.column}_value`] === cat.category) {
          additionalAdjustment += cat.psfAdjustment;
        }
      });
    }
    
    const basePsfWithAdjustments = basePsf + floorAdjustment + viewPsfAdjustment + additionalAdjustment;
    
    const sellArea = parseFloat(unit.sellArea) || 0;
    if (sellArea <= 0) return; // Skip units with invalid sell area
    
    const unitTotalPrice = basePsfWithAdjustments * sellArea;
    const unitFinalPrice = Math.ceil(unitTotalPrice / 1000) * 1000;
    
    totalAcArea += acArea;
    totalPrice += unitFinalPrice;
  });
  
  if (totalAcArea === 0) return 0;
  return totalPrice / totalAcArea;
};

interface OptimizationResult {
  optimizedParams: {
    bedroomAdjustments: Record<string, number>;
    viewAdjustments: Record<string, number>;
    additionalCategoryAdjustments?: Record<string, Record<string, number>>;
  };
  summary: {
    initialOverallPsf: number;
    optimizedOverallPsf: number;
    psfChange: number;
  };
}

// Optimize base PSF values for selected bedroom types
export const megaOptimizePsf = (
  data: any[],
  pricingConfig: any,
  targetPsf: number,
  selectedBedroomTypes: string[] = [],
  psfType: "sellArea" | "acArea" = "sellArea"
): OptimizationResult => {
  const { bedroomTypePricing, viewPricing, floorRiseRules, additionalCategoryPricing } = pricingConfig;

  // Initial overall PSF
  const initialOverallPsf = calculateOverallAveragePsf(data, pricingConfig);

  // Prepare adjustments storage
  const bedroomAdjustments: Record<string, number> = {};

  // Optimization parameters
  const learningRate = 0.01;
  const maxIterations = 100;
  const convergenceThreshold = 0.001;

  // Helper function to calculate overall PSF
  const calculateCurrentOverallPsf = (adjustments: Record<string, number>) => {
    let totalWeightedPsf = 0;
    let totalWeight = 0;

    data.forEach((unit) => {
      if (!selectedBedroomTypes.includes(unit.type)) return;

      const bedroomType = bedroomTypePricing.find((b: any) => b.type === unit.type);
      const viewAdjustment = viewPricing.find((v: any) => v.view === unit.view);

      let basePsf = bedroomType?.basePsf || pricingConfig.basePsf;
      basePsf += adjustments[unit.type] || 0; // Apply adjustment
      const viewPsfAdjustment = viewAdjustment?.psfAdjustment || 0;

      let floorAdjustment = 0;
      const floorLevel = parseInt(unit.floor) || 1;

      const sortedFloorRules = [...floorRiseRules].sort(
        (a: any, b: any) => a.startFloor - b.startFloor
      );

      let cumulativeAdjustment = 0;
      for (const rule of sortedFloorRules) {
        const ruleEnd = rule.endFloor === null ? 999 : rule.endFloor;
        if (floorLevel > ruleEnd) {
          for (let floor = Math.max(rule.startFloor, 1); floor <= ruleEnd; floor++) {
            cumulativeAdjustment += rule.psfIncrement;
            if (rule.jumpEveryFloor && rule.jumpIncrement) {
              if ((floor - rule.startFloor + 1) % rule.jumpEveryFloor === 0) {
                cumulativeAdjustment += rule.jumpIncrement;
              }
            }
          }
        } else if (floorLevel >= rule.startFloor) {
          for (let floor = Math.max(rule.startFloor, 1); floor <= floorLevel; floor++) {
            cumulativeAdjustment += rule.psfIncrement;
            if (rule.jumpEveryFloor && rule.jumpIncrement) {
              if ((floor - rule.startFloor + 1) % rule.jumpEveryFloor === 0) {
                cumulativeAdjustment += rule.jumpIncrement;
              }
            }
          }
          break;
        }
      }

      floorAdjustment = cumulativeAdjustment;

      // Add additional category adjustments if they exist
      let additionalAdjustment = 0;
      if (additionalCategoryPricing) {
        additionalCategoryPricing.forEach((cat: any) => {
          if (unit[`${cat.column}_value`] === cat.category) {
            additionalAdjustment += cat.psfAdjustment;
          }
        });
      }

      const basePsfWithAdjustments = basePsf + floorAdjustment + viewPsfAdjustment + additionalAdjustment;

      const sellArea = parseFloat(unit.sellArea) || 0;
      const acArea = parseFloat(unit.acArea) || 0;
      const unitArea = psfType === "sellArea" ? sellArea : acArea;

      const totalPrice = basePsfWithAdjustments * sellArea; // Still use sellArea for price
      const finalTotalPrice = Math.ceil(totalPrice / 1000) * 1000;
      const finalPsf = unitArea > 0 ? finalTotalPrice / unitArea : 0;

      totalWeightedPsf += finalPsf * unitArea;
      totalWeight += unitArea;
    });

    return totalWeight > 0 ? totalWeightedPsf / totalWeight : 0;
  };

  // Optimization loop
  let previousPsf = initialOverallPsf;
  for (let i = 0; i < maxIterations; i++) {
    // Calculate gradients for each bedroom type
    const gradients: Record<string, number> = {};
    selectedBedroomTypes.forEach((type) => {
      const positiveAdjustment = { ...bedroomAdjustments, [type]: (bedroomAdjustments[type] || 0) + convergenceThreshold };
      const negativeAdjustment = { ...bedroomAdjustments, [type]: (bedroomAdjustments[type] || 0) - convergenceThreshold };

      const psfPositive = calculateCurrentOverallPsf(positiveAdjustment);
      const psfNegative = calculateCurrentOverallPsf(negativeAdjustment);

      gradients[type] = (psfPositive - psfNegative) / (2 * convergenceThreshold);
    });

    // Update adjustments based on gradients
    selectedBedroomTypes.forEach((type) => {
      bedroomAdjustments[type] = (bedroomAdjustments[type] || 0) - learningRate * (gradients[type] * (calculateCurrentOverallPsf(bedroomAdjustments) - targetPsf));
    });

    // Check for convergence
    const currentPsf = calculateCurrentOverallPsf(bedroomAdjustments);
    if (Math.abs(currentPsf - previousPsf) < convergenceThreshold) {
      console.log(`Optimization converged after ${i + 1} iterations.`);
      break;
    }
    previousPsf = currentPsf;
  }

  // Final optimized PSF
  const optimizedOverallPsf = calculateCurrentOverallPsf(bedroomAdjustments);
  const psfChange = optimizedOverallPsf - initialOverallPsf;

  console.log("Optimized adjustments:", bedroomAdjustments);
  console.log("Initial PSF:", initialOverallPsf);
  console.log("Optimized PSF:", optimizedOverallPsf);
  console.log("PSF Change:", psfChange);

  return {
    optimizedParams: { bedroomAdjustments, viewAdjustments: {} },
    summary: { initialOverallPsf, optimizedOverallPsf, psfChange },
  };
};

// Full optimization function including floor, view, and additional category adjustments
export const fullOptimizePsf = (
  data: any[],
  pricingConfig: any,
  targetPsf: number,
  selectedBedroomTypes: string[] = [],
  psfType: "sellArea" | "acArea" = "sellArea"
): OptimizationResult => {
  const { bedroomTypePricing, viewPricing, floorRiseRules, additionalCategoryPricing } = pricingConfig;

  // Initial overall PSF
  const initialOverallPsf = calculateOverallAveragePsf(data, pricingConfig);

  // Prepare adjustments storage
  const bedroomAdjustments: Record<string, number> = {};
  const viewAdjustments: Record<string, number> = {};
  const additionalCategoryAdjustments: Record<string, Record<string, number>> = {};

  // Initialize adjustments with current values
  viewPricing.forEach(view => {
    viewAdjustments[view.view] = view.psfAdjustment;
  });

  if (additionalCategoryPricing) {
    additionalCategoryPricing.forEach(cat => {
      if (!additionalCategoryAdjustments[cat.column]) {
        additionalCategoryAdjustments[cat.column] = {};
      }
      additionalCategoryAdjustments[cat.column][cat.category] = cat.psfAdjustment;
    });
  }

  // Optimization parameters
  const learningRate = 0.01;
  const maxIterations = 100;
  const convergenceThreshold = 0.001;

  // Helper function to calculate overall PSF with all adjustments
  const calculateCurrentOverallPsf = (
    bedroomAdj: Record<string, number>,
    viewAdj: Record<string, number>,
    categoryAdj: Record<string, Record<string, number>>
  ) => {
    let totalWeightedPsf = 0;
    let totalWeight = 0;

    data.forEach((unit) => {
      if (!selectedBedroomTypes.includes(unit.type)) return;

      const bedroomType = bedroomTypePricing.find((b: any) => b.type === unit.type);
      const viewAdjustment = viewPricing.find((v: any) => v.view === unit.view);

      let basePsf = bedroomType?.basePsf || pricingConfig.basePsf;
      basePsf += bedroomAdj[unit.type] || 0; // Apply bedroom adjustment
      const viewPsfAdjustment = (viewAdj[unit.view] !== undefined ? viewAdj[unit.view] : viewAdjustment?.psfAdjustment) || 0; // Apply view adjustment

      let floorAdjustment = 0;
      const floorLevel = parseInt(unit.floor) || 1;

      const sortedFloorRules = [...floorRiseRules].sort(
        (a: any, b: any) => a.startFloor - b.startFloor
      );

      let cumulativeAdjustment = 0;
      for (const rule of sortedFloorRules) {
        const ruleEnd = rule.endFloor === null ? 999 : rule.endFloor;
        if (floorLevel > ruleEnd) {
          for (let floor = Math.max(rule.startFloor, 1); floor <= ruleEnd; floor++) {
            cumulativeAdjustment += rule.psfIncrement;
            if (rule.jumpEveryFloor && rule.jumpIncrement) {
              if ((floor - rule.startFloor + 1) % rule.jumpEveryFloor === 0) {
                cumulativeAdjustment += rule.jumpIncrement;
              }
            }
          }
        } else if (floorLevel >= rule.startFloor) {
          for (let floor = Math.max(rule.startFloor, 1); floor <= floorLevel; floor++) {
            cumulativeAdjustment += rule.psfIncrement;
            if (rule.jumpEveryFloor && rule.jumpIncrement) {
              if ((floor - rule.startFloor + 1) % rule.jumpEveryFloor === 0) {
                cumulativeAdjustment += rule.jumpIncrement;
              }
            }
          }
          break;
        }
      }

      floorAdjustment = cumulativeAdjustment;

      // Apply additional category adjustments
      let additionalAdjustment = 0;
      if (additionalCategoryPricing) {
        additionalCategoryPricing.forEach((cat: any) => {
          const categoryValue = unit[`${cat.column}_value`];
          const adjustment = categoryAdj?.[cat.column]?.[cat.category];

          if (categoryValue === cat.category && adjustment !== undefined) {
            additionalAdjustment += adjustment;
          } else if (categoryValue === cat.category) {
            additionalAdjustment += cat.psfAdjustment;
          }
        });
      }

      const basePsfWithAdjustments = basePsf + floorAdjustment + viewPsfAdjustment + additionalAdjustment;

      const sellArea = parseFloat(unit.sellArea) || 0;
      const acArea = parseFloat(unit.acArea) || 0;
      const unitArea = psfType === "sellArea" ? sellArea : acArea;

      const totalPrice = basePsfWithAdjustments * sellArea; // Still use sellArea for price
      const finalTotalPrice = Math.ceil(totalPrice / 1000) * 1000;
      const finalPsf = unitArea > 0 ? finalTotalPrice / unitArea : 0;

      totalWeightedPsf += finalPsf * unitArea;
      totalWeight += unitArea;
    });

    return totalWeight > 0 ? totalWeightedPsf / totalWeight : 0;
  };

  // Optimization loop
  let previousPsf = initialOverallPsf;
  for (let i = 0; i < maxIterations; i++) {
    // Calculate gradients for each parameter
    const bedroomGradients: Record<string, number> = {};
    selectedBedroomTypes.forEach((type) => {
      const positiveAdjustment = { ...bedroomAdjustments, [type]: (bedroomAdjustments[type] || 0) + convergenceThreshold };
      const negativeAdjustment = { ...bedroomAdjustments, [type]: (bedroomAdjustments[type] || 0) - convergenceThreshold };

      const psfPositive = calculateCurrentOverallPsf(positiveAdjustment, viewAdjustments, additionalCategoryAdjustments);
      const psfNegative = calculateCurrentOverallPsf(negativeAdjustment, viewAdjustments, additionalCategoryAdjustments);

      bedroomGradients[type] = (psfPositive - psfNegative) / (2 * convergenceThreshold);
    });

    const viewGradients: Record<string, number> = {};
    viewPricing.forEach((view) => {
      const positiveAdjustment = { ...viewAdjustments, [view.view]: (viewAdjustments[view.view] || 0) + convergenceThreshold };
      const negativeAdjustment = { ...viewAdjustments, [view.view]: (viewAdjustments[view.view] || 0) - convergenceThreshold };

      const psfPositive = calculateCurrentOverallPsf(bedroomAdjustments, positiveAdjustment, additionalCategoryAdjustments);
      const psfNegative = calculateCurrentOverallPsf(bedroomAdjustments, negativeAdjustment, additionalCategoryAdjustments);

      viewGradients[view.view] = (psfPositive - psfNegative) / (2 * convergenceThreshold);
    });

    const categoryGradients: Record<string, Record<string, number>> = {};
    if (additionalCategoryPricing) {
      additionalCategoryPricing.forEach(cat => {
        const column = cat.column;
        const category = cat.category;

        if (!categoryGradients[column]) {
          categoryGradients[column] = {};
        }

        const originalValue = additionalCategoryAdjustments[column]?.[category] || cat.psfAdjustment;
        const positiveAdjustment = {
          ...additionalCategoryAdjustments,
          [column]: { ...additionalCategoryAdjustments[column], [category]: originalValue + convergenceThreshold }
        };
        const negativeAdjustment = {
          ...additionalCategoryAdjustments,
          [column]: { ...additionalCategoryAdjustments[column], [category]: originalValue - convergenceThreshold }
        };

        const psfPositive = calculateCurrentOverallPsf(bedroomAdjustments, viewAdjustments, positiveAdjustment);
        const psfNegative = calculateCurrentOverallPsf(bedroomAdjustments, viewAdjustments, negativeAdjustment);

        categoryGradients[column][category] = (psfPositive - psfNegative) / (2 * convergenceThreshold);
      });
    }

    // Update adjustments based on gradients
    selectedBedroomTypes.forEach((type) => {
      bedroomAdjustments[type] = (bedroomAdjustments[type] || 0) - learningRate * (bedroomGradients[type] * (calculateCurrentOverallPsf(bedroomAdjustments, viewAdjustments, additionalCategoryAdjustments) - targetPsf));
    });

    viewPricing.forEach((view) => {
      viewAdjustments[view.view] = (viewAdjustments[view.view] || 0) - learningRate * (viewGradients[view.view] * (calculateCurrentOverallPsf(bedroomAdjustments, viewAdjustments, additionalCategoryAdjustments) - targetPsf));
    });

    if (additionalCategoryPricing) {
      additionalCategoryPricing.forEach(cat => {
        const column = cat.column;
        const category = cat.category;
        const gradient = categoryGradients[column]?.[category];

        if (gradient !== undefined) {
          if (!additionalCategoryAdjustments[column]) {
            additionalCategoryAdjustments[column] = {};
          }
          additionalCategoryAdjustments[column][category] = (additionalCategoryAdjustments[column][category] || 0) - learningRate * (gradient * (calculateCurrentOverallPsf(bedroomAdjustments, viewAdjustments, additionalCategoryAdjustments) - targetPsf));
        }
      });
    }

    // Check for convergence
    const currentPsf = calculateCurrentOverallPsf(bedroomAdjustments, viewAdjustments, additionalCategoryAdjustments);
    if (Math.abs(currentPsf - previousPsf) < convergenceThreshold) {
      console.log(`Optimization converged after ${i + 1} iterations.`);
      break;
    }
    previousPsf = currentPsf;
  }

  // Final optimized PSF
  const optimizedOverallPsf = calculateCurrentOverallPsf(bedroomAdjustments, viewAdjustments, additionalCategoryAdjustments);
  const psfChange = optimizedOverallPsf - initialOverallPsf;

  console.log("Optimized bedroom adjustments:", bedroomAdjustments);
  console.log("Optimized view adjustments:", viewAdjustments);
  console.log("Optimized category adjustments:", additionalCategoryAdjustments);
  console.log("Initial PSF:", initialOverallPsf);
  console.log("Optimized PSF:", optimizedOverallPsf);
  console.log("PSF Change:", psfChange);

  return {
    optimizedParams: { bedroomAdjustments, viewAdjustments, additionalCategoryAdjustments },
    summary: { initialOverallPsf, optimizedOverallPsf, psfChange },
  };
};

/**
 * Calculate floor premium for a given floor based on floor rise rules
 */
export const calculateFloorPremium = (
  floor: number,
  floorRules: Array<{
    startFloor: number;
    endFloor: number | null;
    psfIncrement: number;
    jumpEveryFloor?: number;
    jumpIncrement?: number;
  }>
): number => {
  if (!floorRules.length) return 0;
  
  // Sort rules by startFloor to ensure proper application
  const sortedRules = [...floorRules].sort((a, b) => a.startFloor - b.startFloor);
  
  let cumulativePremium = 0;
  
  for (const rule of sortedRules) {
    const ruleEnd = rule.endFloor === null ? 999 : rule.endFloor;
    
    if (floor > ruleEnd) {
      // If floor is beyond this rule's range, apply the full range premium
      for (let f = Math.max(rule.startFloor, 1); f <= ruleEnd; f++) {
        cumulativePremium += rule.psfIncrement;
        
        // Apply jump increments if applicable
        if (rule.jumpEveryFloor && rule.jumpIncrement) {
          const floorsFromStart = f - rule.startFloor;
          if (floorsFromStart > 0 && floorsFromStart % rule.jumpEveryFloor === 0) {
            cumulativePremium += rule.jumpIncrement;
          }
        }
      }
    } else if (floor >= rule.startFloor) {
      // If floor is within this rule's range, apply up to the current floor
      for (let f = Math.max(rule.startFloor, 1); f <= floor; f++) {
        cumulativePremium += rule.psfIncrement;
        
        // Apply jump increments if applicable
        if (rule.jumpEveryFloor && rule.jumpIncrement) {
          const floorsFromStart = f - rule.startFloor;
          if (floorsFromStart > 0 && floorsFromStart % rule.jumpEveryFloor === 0) {
            cumulativePremium += rule.jumpIncrement;
          }
        }
      }
      
      // We found the applicable rule, no need to check further rules
      break;
    }
  }
  
  return cumulativePremium;
};
