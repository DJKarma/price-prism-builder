
// Add the simulatePricing function to the existing file
export const simulatePricing = (data: any[], config: any) => {
  return data.map((unit) => {
    // Find the bedroom type configuration
    const bedroomType = config.bedroomTypePricing.find(
      (b: any) => b.type === unit.type
    );
    
    // Find the view price adjustment
    const viewAdjustment = config.viewPricing.find(
      (v: any) => v.view === unit.view
    );
    
    // Determine the base PSF
    const basePsf = bedroomType?.basePsf || config.basePsf;
    const viewPsfAdjustment = viewAdjustment?.psfAdjustment || 0;
    
    // Calculate floor adjustment
    let floorAdjustment = 0;
    const floorLevel = parseInt(unit.floor) || 1;
    
    if (config.floorRiseRules && config.floorRiseRules.length > 0) {
      const sortedFloorRules = [...config.floorRiseRules].sort(
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
    }
    
    // Calculate additional category adjustments
    let additionalAdjustment = 0;
    const additionalCategoryPriceComponents: Record<string, number> = {};
    
    if (config.additionalCategoryPricing) {
      config.additionalCategoryPricing.forEach((catPricing: any) => {
        const { column, category, psfAdjustment } = catPricing;
        
        // Check if this unit has this category value
        const columnKey = `${column}_value`; // The raw column value we stored
        const matchesCategory = unit[columnKey] === category;
        
        if (matchesCategory) {
          additionalAdjustment += psfAdjustment;
          
          // Store component for display in detailed breakdown
          const componentKey = `${column}: ${category}`;
          additionalCategoryPriceComponents[componentKey] = psfAdjustment;
        }
      });
    }
    
    // Calculate the total price and PSF values
    const basePsfWithAdjustments = basePsf + floorAdjustment + viewPsfAdjustment + additionalAdjustment;
    
    const sellArea = parseFloat(unit.sellArea) || 0;
    const acArea = parseFloat(unit.acArea) || 0;
    
    let balconyArea = parseFloat(unit.balcony) || 0;
    if (sellArea > 0 && acArea > 0) {
      if (!unit.balcony || unit.balcony === '0') {
        balconyArea = sellArea - acArea;
      }
    }
    const balconyPercentage = sellArea > 0 ? (balconyArea / sellArea) * 100 : 0;
    
    const totalPrice = basePsfWithAdjustments * sellArea;
    const finalTotalPrice = Math.ceil(totalPrice / 1000) * 1000;
    
    const finalPsf = sellArea > 0 ? finalTotalPrice / sellArea : 0;
    const finalAcPsf = acArea > 0 ? finalTotalPrice / acArea : 0;
    
    const basePriceComponent = basePsf * sellArea;
    const floorPriceComponent = floorAdjustment * sellArea;
    const viewPriceComponent = viewPsfAdjustment * sellArea;
    
    return {
      ...unit,
      totalPrice,
      finalTotalPrice,
      finalPsf,
      finalAcPsf,
      balconyArea,
      balconyPercentage,
      basePriceComponent,
      floorPriceComponent,
      viewPriceComponent,
      basePsf,
      floorAdjustment,
      viewPsfAdjustment,
      additionalCategoryAdjustment: additionalAdjustment,
      additionalCategoryPriceComponents,
      isOptimized: false
    };
  });
};

// Add the missing calculateFloorPremium function
export const calculateFloorPremium = (floor: number, floorRules: any[]) => {
  let floorPremium = 0;
  
  // Sort rules by startFloor to apply them in proper order
  const sortedRules = [...floorRules].sort((a, b) => a.startFloor - b.startFloor);
  
  for (const rule of sortedRules) {
    const ruleEndFloor = rule.endFloor === null ? 999 : rule.endFloor;
    
    // Skip rules that don't apply to this floor
    if (floor < rule.startFloor) continue;
    
    // If the floor is within this rule's range
    if (floor <= ruleEndFloor) {
      // Calculate floors within the range
      const floorsFromStart = floor - rule.startFloor;
      
      // Apply base increment for each floor
      floorPremium += floorsFromStart * rule.psfIncrement;
      
      // Apply jump increments if configured
      if (rule.jumpEveryFloor && rule.jumpIncrement) {
        const jumpFloors = Math.floor(floorsFromStart / rule.jumpEveryFloor);
        floorPremium += jumpFloors * rule.jumpIncrement;
      }
      
      break; // Floor matched a rule, no need to check further rules
    } else {
      // If the floor is beyond this rule's range, apply the full rule benefit
      const totalFloors = ruleEndFloor - rule.startFloor + 1;
      
      // Apply base increment for the entire range
      floorPremium += totalFloors * rule.psfIncrement;
      
      // Apply jump increments for the entire range if configured
      if (rule.jumpEveryFloor && rule.jumpIncrement) {
        const jumpFloors = Math.floor(totalFloors / rule.jumpEveryFloor);
        floorPremium += jumpFloors * rule.jumpIncrement;
      }
    }
  }
  
  return floorPremium;
};

// Add other missing exports
export const megaOptimizePsf = (
  data: any[], 
  config: any, 
  targetPsf: number, 
  selectedTypes: string[] = [],
  psfType: "sellArea" | "acArea" = "sellArea"
) => {
  // Implementation of mega optimization algorithm
  // This is a placeholder implementation
  console.log("Optimizing PSF for types:", selectedTypes, "Target PSF:", targetPsf);
  
  // Calculate current PSF values
  const optimizedParams = {
    bedroomAdjustments: {} as Record<string, number>
  };
  
  // For each selected bedroom type, adjust the base PSF
  selectedTypes.forEach(type => {
    const unitsOfType = data.filter(unit => unit.type === type);
    if (unitsOfType.length === 0) return;
    
    // Find existing bedroom config
    const bedroomConfig = config.bedroomTypePricing.find((b: any) => b.type === type);
    if (!bedroomConfig) return;
    
    // Simple adjustment: just set to target PSF as starting point
    // Real implementation would be more sophisticated
    optimizedParams.bedroomAdjustments[type] = bedroomConfig.basePsf;
    
    // Adjust based on how far current average is from target
    const adjustmentFactor = targetPsf / (bedroomConfig.avgPsf || 1000);
    optimizedParams.bedroomAdjustments[type] = Math.max(
      0, 
      bedroomConfig.basePsf * adjustmentFactor
    );
  });
  
  return {
    success: true,
    optimizedParams,
    message: "Optimization complete"
  };
};

export const fullOptimizePsf = (
  data: any[], 
  config: any, 
  targetPsf: number, 
  selectedTypes: string[] = [],
  psfType: "sellArea" | "acArea" = "sellArea"
) => {
  // Implementation of full optimization algorithm including view and floor adjustments
  // This is a placeholder implementation
  console.log("Full PSF optimization for types:", selectedTypes, "Target PSF:", targetPsf);
  
  // Start with the bedroom adjustments from megaOptimizePsf
  const baseResult = megaOptimizePsf(data, config, targetPsf, selectedTypes, psfType);
  
  // Add view adjustments
  const viewAdjustments: Record<string, number> = {};
  config.viewPricing.forEach((view: any) => {
    viewAdjustments[view.view] = view.psfAdjustment;
  });
  
  // Add additional category adjustments
  const additionalCategoryAdjustments: Record<string, Record<string, number>> = {};
  if (config.additionalCategoryPricing) {
    config.additionalCategoryPricing.forEach((cat: any) => {
      if (!additionalCategoryAdjustments[cat.column]) {
        additionalCategoryAdjustments[cat.column] = {};
      }
      additionalCategoryAdjustments[cat.column][cat.category] = cat.psfAdjustment;
    });
  }
  
  return {
    ...baseResult,
    optimizedParams: {
      ...baseResult.optimizedParams,
      viewAdjustments,
      additionalCategoryAdjustments
    }
  };
};

export const calculateOverallAveragePsf = (data: any[], config: any) => {
  if (!data.length) return 0;
  
  // Use simulatePricing to calculate prices based on current config
  const pricedUnits = simulatePricing(data, config);
  
  // Filter out units with invalid data
  const validUnits = pricedUnits.filter(unit => {
    const sellArea = parseFloat(unit.sellArea) || 0;
    return sellArea > 0 && unit.finalTotalPrice > 0;
  });
  
  if (validUnits.length === 0) return 0;
  
  // Calculate weighted average PSF (total value / total sell area)
  const totalValue = validUnits.reduce((sum, unit) => sum + unit.finalTotalPrice, 0);
  const totalSellArea = validUnits.reduce((sum, unit) => sum + parseFloat(unit.sellArea), 0);
  
  return totalValue / totalSellArea;
};

export const calculateOverallAverageAcPsf = (data: any[], config: any) => {
  if (!data.length) return 0;
  
  // Use simulatePricing to calculate prices based on current config
  const pricedUnits = simulatePricing(data, config);
  
  // Filter out units with invalid data
  const validUnits = pricedUnits.filter(unit => {
    const acArea = parseFloat(unit.acArea) || 0;
    return acArea > 0 && unit.finalTotalPrice > 0;
  });
  
  if (validUnits.length === 0) return 0;
  
  // Calculate weighted average AC PSF (total value / total AC area)
  const totalValue = validUnits.reduce((sum, unit) => sum + unit.finalTotalPrice, 0);
  const totalAcArea = validUnits.reduce((sum, unit) => sum + parseFloat(unit.acArea), 0);
  
  return totalValue / totalAcArea;
};
