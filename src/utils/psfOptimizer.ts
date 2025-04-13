
/**
 * Gradient Descent PSF Optimizer
 * 
 * This utility uses a constrained gradient descent algorithm to find the optimal
 * base PSF value that minimizes the difference between achieved average PSF and target PSF.
 */

interface Unit {
  type: string;
  sellArea: string | number;
  view: string;
  floor: string | number;
  [key: string]: any;
}

interface BedroomTypePricing {
  type: string;
  basePsf: number;
  targetAvgPsf: number;
}

interface ViewPricing {
  view: string;
  psfAdjustment: number;
}

interface FloorRiseRule {
  startFloor: number;
  endFloor: number;
  psfIncrement: number;
  jumpEveryFloor?: number;
  jumpIncrement?: number;
}

interface PricingConfig {
  basePsf: number;
  bedroomTypePricing: BedroomTypePricing[];
  viewPricing: ViewPricing[];
  floorRiseRules: FloorRiseRule[];
  targetOverallPsf?: number;
}

/**
 * Calculate floor premium at a specific floor level
 */
const calculateFloorPremium = (
  floorLevel: number,
  floorRules: FloorRiseRule[]
): number => {
  // Sort floor rules by startFloor to process them in order
  const sortedFloorRules = [...floorRules].sort(
    (a, b) => a.startFloor - b.startFloor
  );
  
  // Calculate cumulative floor adjustment
  let cumulativeAdjustment = 0;
  
  // Track jump floors
  const jumpFloors: number[] = [];
  
  // Identify all jump floors first
  sortedFloorRules.forEach(rule => {
    if (rule.jumpEveryFloor && rule.jumpIncrement) {
      // Calculate jump floors within this rule's range
      for (let floor = rule.startFloor; floor <= rule.endFloor; floor++) {
        if ((floor - rule.startFloor) % rule.jumpEveryFloor === 0 && floor >= rule.startFloor + rule.jumpEveryFloor) {
          jumpFloors.push(floor);
        }
      }
    }
  });
  
  // Process each floor up to the requested floor
  for (let floor = 1; floor <= floorLevel; floor++) {
    // Find applicable rule for this floor
    const rule = sortedFloorRules.find(
      r => floor >= r.startFloor && floor <= r.endFloor
    );
    
    if (rule) {
      // Add the regular increment for each floor
      cumulativeAdjustment += rule.psfIncrement;
      
      // Check if this is a jump floor
      if (jumpFloors.includes(floor)) {
        // Add jump increment if applicable
        cumulativeAdjustment += rule.jumpIncrement || 0;
      }
    }
  }
  
  return cumulativeAdjustment;
};

/**
 * Calculate the PSF for a given unit with the provided base PSF for its type
 */
const calculateUnitPsf = (
  unit: Unit, 
  pricingConfig: PricingConfig, 
  overrideParams?: {
    basePsf?: number,
    viewAdjustments?: Record<string, number>,
    floorRules?: FloorRiseRule[]
  }
): number => {
  // Find bedroom type pricing
  const bedroomType = pricingConfig.bedroomTypePricing.find(
    (b) => b.type === unit.type
  );
  
  // Use override base PSF if provided, otherwise use configured value
  const basePsf = overrideParams?.basePsf !== undefined 
    ? overrideParams.basePsf 
    : (bedroomType?.basePsf || pricingConfig.basePsf);
  
  // Find view adjustment
  const unitView = unit.view as string;
  let viewPsfAdjustment = 0;
  
  if (overrideParams?.viewAdjustments && unitView in overrideParams.viewAdjustments) {
    viewPsfAdjustment = overrideParams.viewAdjustments[unitView];
  } else {
    const viewAdjustment = pricingConfig.viewPricing.find(
      (v) => v.view === unitView
    );
    viewPsfAdjustment = viewAdjustment?.psfAdjustment || 0;
  }
  
  // Calculate floor adjustment using the dedicated function
  const floorLevel = parseInt(unit.floor as string) || 1;
  const floorRules = overrideParams?.floorRules || pricingConfig.floorRiseRules;
  const floorAdjustment = calculateFloorPremium(floorLevel, floorRules);
  
  // Return final PSF
  return basePsf + floorAdjustment + viewPsfAdjustment;
};

/**
 * Calculates the average PSF for a bedroom type with a given base PSF
 */
const calculateAveragePsf = (
  units: Unit[], 
  pricingConfig: PricingConfig, 
  bedroomType: string,
  testBasePsf: number
): number => {
  // Filter units of the target bedroom type
  const typeUnits = units.filter(unit => unit.type === bedroomType);
  
  if (typeUnits.length === 0) return 0;
  
  // Calculate PSF for each unit with the test base PSF
  const psfValues = typeUnits.map(unit => {
    const psf = calculateUnitPsf(unit, pricingConfig, { basePsf: testBasePsf });
    const sellArea = parseFloat(unit.sellArea as string) || 0;
    const totalPrice = psf * sellArea;
    // Ceiling to nearest 1000
    const finalTotalPrice = Math.ceil(totalPrice / 1000) * 1000;
    // Final PSF based on ceiled price
    return sellArea > 0 ? finalTotalPrice / sellArea : 0;
  });
  
  // Calculate average PSF
  return psfValues.reduce((sum, psf) => sum + psf, 0) / psfValues.length;
};

/**
 * Calculates the overall average PSF across all units
 */
const calculateOverallAveragePsf = (
  units: Unit[], 
  pricingConfig: PricingConfig,
  overrideParams?: {
    bedroomAdjustments?: Record<string, number>,
    viewAdjustments?: Record<string, number>,
    floorRules?: FloorRiseRule[]
  }
): number => {
  if (units.length === 0) return 0;
  
  // Calculate PSF for each unit with the overrides
  const psfValues = units.map(unit => {
    // Find bedroom type for potential override
    const unitType = unit.type as string;
    let overrideBasePsf;
    
    if (overrideParams?.bedroomAdjustments && unitType in overrideParams.bedroomAdjustments) {
      overrideBasePsf = overrideParams.bedroomAdjustments[unitType];
    }
    
    const psf = calculateUnitPsf(unit, pricingConfig, {
      basePsf: overrideBasePsf,
      viewAdjustments: overrideParams?.viewAdjustments,
      floorRules: overrideParams?.floorRules
    });
    
    const sellArea = parseFloat(unit.sellArea as string) || 0;
    const totalPrice = psf * sellArea;
    // Ceiling to nearest 1000
    const finalTotalPrice = Math.ceil(totalPrice / 1000) * 1000;
    // Final PSF based on ceiled price
    return sellArea > 0 ? finalTotalPrice / sellArea : 0;
  });
  
  // Calculate average PSF
  return psfValues.reduce((sum, psf) => sum + psf, 0) / psfValues.length;
};

/**
 * Cost function for optimization - squared difference between achieved and target PSF
 */
const costFunction = (
  basePsf: number,
  units: Unit[],
  pricingConfig: PricingConfig,
  bedroomType: string,
  targetPsf: number
): number => {
  const avgPsf = calculateAveragePsf(units, pricingConfig, bedroomType, basePsf);
  return Math.pow(avgPsf - targetPsf, 2);
};

/**
 * Cost function for mega optimization - optimizes across multiple parameters
 */
const megaCostFunction = (
  params: number[],
  units: Unit[],
  pricingConfig: PricingConfig,
  paramMap: {
    bedroomTypes: string[],
    views: string[]
  },
  targetPsf: number,
  originalParams: number[]
): number => {
  // First N params are bedroom type adjustments
  const bedroomAdjustments: Record<string, number> = {};
  paramMap.bedroomTypes.forEach((type, index) => {
    bedroomAdjustments[type] = params[index];
  });
  
  // Next M params are view adjustments
  const viewAdjustments: Record<string, number> = {};
  paramMap.views.forEach((view, index) => {
    viewAdjustments[view] = params[paramMap.bedroomTypes.length + index];
  });
  
  // Calculate average PSF with these parameters
  const avgPsf = calculateOverallAveragePsf(units, pricingConfig, {
    bedroomAdjustments,
    viewAdjustments
  });
  
  // Add constraint penalty to avoid large changes
  const constraintFactor = 0.5;
  let constraintPenalty = 0;
  
  for (let i = 0; i < params.length; i++) {
    constraintPenalty += constraintFactor * Math.pow(params[i] - originalParams[i], 2);
  }
  
  return Math.pow(avgPsf - targetPsf, 2) + constraintPenalty;
};

/**
 * Gradient Descent optimization algorithm
 * Uses numerical differentiation to estimate gradient
 */
export const optimizeBasePsf = (
  units: Unit[],
  pricingConfig: PricingConfig,
  bedroomType: string,
  targetPsf: number,
  originalBasePsf: number,
  options = {
    learningRate: 0.1,
    maxIterations: 100,
    convergenceThreshold: 0.01,
    epsilon: 0.1, // For numerical differentiation
    constraintFactor: 0.5, // Penalizes large deviations from original
  }
): { 
  optimizedBasePsf: number; 
  finalAvgPsf: number; 
  iterations: number;
  initialAvgPsf: number;
} => {
  const { 
    learningRate, 
    maxIterations, 
    convergenceThreshold, 
    epsilon,
    constraintFactor
  } = options;
  
  let currentBasePsf = originalBasePsf;
  let iteration = 0;
  let previousCost = Infinity;
  
  // Calculate initial average PSF
  const initialAvgPsf = calculateAveragePsf(
    units, 
    pricingConfig, 
    bedroomType, 
    originalBasePsf
  );
  
  while (iteration < maxIterations) {
    // Calculate current cost
    const currentCost = costFunction(
      currentBasePsf, 
      units, 
      pricingConfig, 
      bedroomType, 
      targetPsf
    ) + 
    // Add constraint penalty to avoid large changes
    constraintFactor * Math.pow(currentBasePsf - originalBasePsf, 2);
    
    // Check convergence
    if (Math.abs(previousCost - currentCost) < convergenceThreshold) {
      break;
    }
    
    // Numerical differentiation to estimate gradient
    const costPlus = costFunction(
      currentBasePsf + epsilon, 
      units, 
      pricingConfig, 
      bedroomType, 
      targetPsf
    ) + 
    constraintFactor * Math.pow((currentBasePsf + epsilon) - originalBasePsf, 2);
    
    const costMinus = costFunction(
      currentBasePsf - epsilon, 
      units, 
      pricingConfig, 
      bedroomType, 
      targetPsf
    ) + 
    constraintFactor * Math.pow((currentBasePsf - epsilon) - originalBasePsf, 2);
    
    // Estimate gradient using central difference
    const gradient = (costPlus - costMinus) / (2 * epsilon);
    
    // Update base PSF using gradient descent
    currentBasePsf = currentBasePsf - learningRate * gradient;
    
    // Ensure base PSF doesn't go negative
    currentBasePsf = Math.max(currentBasePsf, 1);
    
    // Update previous cost for next iteration
    previousCost = currentCost;
    iteration++;
  }
  
  // Calculate final average PSF with optimized base PSF
  const finalAvgPsf = calculateAveragePsf(
    units, 
    pricingConfig, 
    bedroomType, 
    currentBasePsf
  );
  
  return {
    optimizedBasePsf: currentBasePsf,
    finalAvgPsf,
    iterations: iteration,
    initialAvgPsf
  };
};

/**
 * Mega Optimization algorithm that adjusts all bedroom types and views
 * to achieve a target overall PSF
 */
export const megaOptimizePsf = (
  units: Unit[],
  pricingConfig: PricingConfig,
  targetOverallPsf: number,
  options = {
    learningRate: 0.05,
    maxIterations: 200,
    convergenceThreshold: 0.01,
    epsilon: 0.1,
    constraintFactor: 0.5
  }
): {
  optimizedParams: {
    bedroomAdjustments: Record<string, number>,
    viewAdjustments: Record<string, number>
  },
  finalAvgPsf: number,
  iterations: number,
  initialAvgPsf: number
} => {
  const {
    learningRate,
    maxIterations,
    convergenceThreshold,
    epsilon,
    constraintFactor
  } = options;
  
  // Extract all bedroom types and views for optimization
  const bedroomTypes = pricingConfig.bedroomTypePricing.map(b => b.type);
  const views = pricingConfig.viewPricing.map(v => v.view);
  
  // Parameter mapping for optimization
  const paramMap = {
    bedroomTypes,
    views
  };
  
  // Initial parameter values
  const initialParams: number[] = [
    ...bedroomTypes.map(type => {
      const pricing = pricingConfig.bedroomTypePricing.find(b => b.type === type);
      return pricing?.basePsf || pricingConfig.basePsf;
    }),
    ...views.map(view => {
      const pricing = pricingConfig.viewPricing.find(v => v.view === view);
      return pricing?.psfAdjustment || 0;
    })
  ];
  
  // Current parameters (will be updated during optimization)
  let currentParams = [...initialParams];
  
  // Iteration control
  let iteration = 0;
  let previousCost = Infinity;
  
  // Calculate initial average PSF
  const initialAvgPsf = calculateOverallAveragePsf(units, pricingConfig);
  
  // Gradient descent loop
  while (iteration < maxIterations) {
    // Calculate current cost
    const currentCost = megaCostFunction(
      currentParams,
      units,
      pricingConfig,
      paramMap,
      targetOverallPsf,
      initialParams
    );
    
    // Check convergence
    if (Math.abs(previousCost - currentCost) < convergenceThreshold) {
      break;
    }
    
    // Calculate gradient for each parameter
    const gradient: number[] = [];
    
    for (let i = 0; i < currentParams.length; i++) {
      // Create parameter vectors for numerical differentiation
      const paramsPlus = [...currentParams];
      paramsPlus[i] += epsilon;
      
      const paramsMinus = [...currentParams];
      paramsMinus[i] -= epsilon;
      
      // Calculate costs for +/- epsilon
      const costPlus = megaCostFunction(
        paramsPlus,
        units,
        pricingConfig,
        paramMap,
        targetOverallPsf,
        initialParams
      );
      
      const costMinus = megaCostFunction(
        paramsMinus,
        units,
        pricingConfig,
        paramMap,
        targetOverallPsf,
        initialParams
      );
      
      // Estimate gradient component using central difference
      gradient.push((costPlus - costMinus) / (2 * epsilon));
    }
    
    // Update parameters using gradient descent
    for (let i = 0; i < currentParams.length; i++) {
      currentParams[i] = currentParams[i] - learningRate * gradient[i];
      
      // Ensure values don't go negative
      if (i < bedroomTypes.length) { // Bedroom PSF
        currentParams[i] = Math.max(currentParams[i], 1);
      }
    }
    
    // Update previous cost
    previousCost = currentCost;
    iteration++;
  }
  
  // Map optimized parameters back to bedroom types and views
  const bedroomAdjustments: Record<string, number> = {};
  bedroomTypes.forEach((type, index) => {
    bedroomAdjustments[type] = currentParams[index];
  });
  
  const viewAdjustments: Record<string, number> = {};
  views.forEach((view, index) => {
    viewAdjustments[view] = currentParams[bedroomTypes.length + index];
  });
  
  // Calculate final average PSF
  const finalAvgPsf = calculateOverallAveragePsf(units, pricingConfig, {
    bedroomAdjustments,
    viewAdjustments
  });
  
  return {
    optimizedParams: {
      bedroomAdjustments,
      viewAdjustments
    },
    finalAvgPsf,
    iterations: iteration,
    initialAvgPsf
  };
};

// Export utility functions for use in components
export {
  calculateUnitPsf,
  calculateAveragePsf,
  calculateOverallAveragePsf,
  calculateFloorPremium
};
