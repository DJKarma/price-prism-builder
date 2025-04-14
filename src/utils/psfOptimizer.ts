
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
