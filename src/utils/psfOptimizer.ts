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
  endFloor: number | null;
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
  // Sort rules by start floor to ensure proper processing
  const sortedRules = [...floorRules].sort(
    (a, b) => a.startFloor - b.startFloor
  );
  
  let cumulativeAdjustment = 0;
  let currentFloor = 1;

  for (const rule of sortedRules) {
    // Ensure rule.endFloor is set (default to 99 if necessary)
    const ruleEnd = rule.endFloor !== null ? rule.endFloor : 99;

    if (floorLevel > ruleEnd) {
      // Process full range for the rule
      for (let floor = Math.max(currentFloor, rule.startFloor); floor <= ruleEnd; floor++) {
        cumulativeAdjustment += Math.max(0, rule.psfIncrement); // Ensure non-negative
        // Check if this floor qualifies as a jump floor
        if (rule.jumpEveryFloor && rule.jumpIncrement && ((floor - rule.startFloor + 1) % rule.jumpEveryFloor === 0)) {
          cumulativeAdjustment += Math.max(0, rule.jumpIncrement); // Ensure non-negative
        }
      }
      currentFloor = ruleEnd + 1;
    } else if (floorLevel >= rule.startFloor) {
      // Process up to the current floor within this rule
      for (let floor = Math.max(currentFloor, rule.startFloor); floor <= floorLevel; floor++) {
        cumulativeAdjustment += Math.max(0, rule.psfIncrement); // Ensure non-negative
        if (rule.jumpEveryFloor && rule.jumpIncrement && ((floor - rule.startFloor + 1) % rule.jumpEveryFloor === 0)) {
          cumulativeAdjustment += Math.max(0, rule.jumpIncrement); // Ensure non-negative
        }
      }
      break;
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
  return Math.max(0, basePsf + floorAdjustment + viewPsfAdjustment); // Ensure non-negative
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
  originalParams: number[],
  selectedTypes: string[]
): number => {
  // Make sure we enforce non-negative parameter values
  const safeParams = params.map(p => Math.max(0, p));
  
  // First N params are bedroom type adjustments
  const bedroomAdjustments: Record<string, number> = {};
  paramMap.bedroomTypes.forEach((type, index) => {
    // Only apply adjustments to selected bedroom types
    if (selectedTypes.includes(type)) {
      bedroomAdjustments[type] = safeParams[index];
    }
  });
  
  // Next M params are view adjustments
  const viewAdjustments: Record<string, number> = {};
  paramMap.views.forEach((view, index) => {
    viewAdjustments[view] = safeParams[paramMap.bedroomTypes.length + index];
  });
  
  // Calculate average PSF with these parameters
  const avgPsf = calculateOverallAveragePsf(
    // Filter units to only include selected bedroom types
    units.filter(unit => selectedTypes.includes(unit.type)), 
    pricingConfig, 
    {
      bedroomAdjustments,
      viewAdjustments
    }
  );
  
  // Add constraint penalty to avoid large changes
  const constraintFactor = 0.5;
  let constraintPenalty = 0;
  
  for (let i = 0; i < params.length; i++) {
    // Add penalty for negative values (should never happen due to safeParams)
    if (params[i] < 0) {
      constraintPenalty += 1000 * Math.abs(params[i]);
    }
    constraintPenalty += constraintFactor * Math.pow(safeParams[i] - originalParams[i], 2);
  }
  
  return Math.pow(avgPsf - targetPsf, 2) + constraintPenalty;
};

/**
 * Cost function for full optimization - optimizes all parameters
 */
const fullCostFunction = (
  params: number[],
  units: Unit[],
  pricingConfig: PricingConfig,
  paramMap: {
    bedroomTypes: string[],
    views: string[],
    floorRuleParams: number, // Total number of floor rule parameters
    floorRuleMap: { ruleIndex: number, paramType: string, originalValue: number }[]
  },
  targetPsf: number,
  originalParams: number[],
  selectedTypes: string[]
): number => {
  // Make sure we enforce non-negative parameter values
  const safeParams = params.map(p => Math.max(0, p));
  
  // First section: bedroom type adjustments
  const bedroomAdjustments: Record<string, number> = {};
  paramMap.bedroomTypes.forEach((type, index) => {
    // Only apply adjustments to selected bedroom types
    if (selectedTypes.includes(type)) {
      bedroomAdjustments[type] = safeParams[index];
    }
  });
  
  // Second section: view adjustments
  const viewAdjustments: Record<string, number> = {};
  const viewStartIndex = paramMap.bedroomTypes.length;
  paramMap.views.forEach((view, index) => {
    viewAdjustments[view] = safeParams[viewStartIndex + index];
  });
  
  // Third section: floor rule parameters
  const floorRules = [...pricingConfig.floorRiseRules]; // Clone the original rules
  const floorParamStartIndex = viewStartIndex + paramMap.views.length;
  
  // Apply floor rule parameter changes
  paramMap.floorRuleMap.forEach((mapping, index) => {
    const paramValue = safeParams[floorParamStartIndex + index];
    const ruleIndex = mapping.ruleIndex;
    const paramType = mapping.paramType;
    
    if (paramType === 'psfIncrement') {
      floorRules[ruleIndex].psfIncrement = paramValue;
    } else if (paramType === 'jumpIncrement' && floorRules[ruleIndex].jumpEveryFloor) {
      floorRules[ruleIndex].jumpIncrement = paramValue;
    }
  });
  
  // Calculate average PSF with these parameters
  const avgPsf = calculateOverallAveragePsf(
    // Filter units to only include selected bedroom types
    units.filter(unit => selectedTypes.includes(unit.type)), 
    pricingConfig, 
    {
      bedroomAdjustments,
      viewAdjustments,
      floorRules
    }
  );
  
  // Add constraint penalty to avoid large changes
  const constraintFactor = 0.5;
  let constraintPenalty = 0;
  
  for (let i = 0; i < params.length; i++) {
    // Higher penalty for floor parameters to prevent large changes
    const paramFactor = i >= floorParamStartIndex ? constraintFactor * 2 : constraintFactor;
    constraintPenalty += paramFactor * Math.pow(safeParams[i] - originalParams[i], 2);
  }
  
  // Add monotonicity constraints for floor parameters
  let monotonicityPenalty = 0;
  for (let i = 0; i < floorRules.length; i++) {
    // Penalty for negative psfIncrement (should never happen due to safeParams)
    if (floorRules[i].psfIncrement < 0) {
      monotonicityPenalty += 1000 * Math.abs(floorRules[i].psfIncrement);
    }
    
    // Penalty for negative jumpIncrement (should never happen due to safeParams)
    if (floorRules[i].jumpIncrement !== undefined && floorRules[i].jumpIncrement < 0) {
      monotonicityPenalty += 1000 * Math.abs(floorRules[i].jumpIncrement);
    }
  }
  
  // Ensure cumulative floor PSF is monotonically increasing
  for (let floor = 2; floor < 50; floor++) {
    const prevFloorPsf = calculateFloorPremium(floor - 1, floorRules);
    const currFloorPsf = calculateFloorPremium(floor, floorRules);
    
    // Add penalty if current floor PSF is less than previous floor
    if (currFloorPsf < prevFloorPsf) {
      monotonicityPenalty += 1000 * Math.abs(prevFloorPsf - currFloorPsf);
    }
  }
  
  return Math.pow(avgPsf - targetPsf, 2) + constraintPenalty + monotonicityPenalty;
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
  selectedTypes: string[] = [],
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
  
  // If no bedroom types are selected, use all types
  if (selectedTypes.length === 0) {
    selectedTypes = [...bedroomTypes];
  }
  
  // Filter units to only include selected bedroom types
  const filteredUnits = units.filter(unit => selectedTypes.includes(unit.type));
  
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
  const initialAvgPsf = calculateOverallAveragePsf(filteredUnits, pricingConfig);
  
  // Gradient descent loop
  while (iteration < maxIterations) {
    // Calculate current cost
    const currentCost = megaCostFunction(
      currentParams,
      units,
      pricingConfig,
      paramMap,
      targetOverallPsf,
      initialParams,
      selectedTypes
    );
    
    // Check convergence
    if (Math.abs(previousCost - currentCost) < convergenceThreshold) {
      break;
    }
    
    // Calculate gradient for each parameter
    const gradient: number[] = [];
    
    for (let i = 0; i < currentParams.length; i++) {
      // Skip optimization for non-selected bedroom types
      if (i < bedroomTypes.length && !selectedTypes.includes(bedroomTypes[i])) {
        gradient.push(0); // No change for unselected types
        continue;
      }
      
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
        initialParams,
        selectedTypes
      );
      
      const costMinus = megaCostFunction(
        paramsMinus,
        units,
        pricingConfig,
        paramMap,
        targetOverallPsf,
        initialParams,
        selectedTypes
      );
      
      // Estimate gradient component using central difference
      gradient.push((costPlus - costMinus) / (2 * epsilon));
    }
    
    // Update parameters using gradient descent
    for (let i = 0; i < currentParams.length; i++) {
      // Skip parameter updates for non-selected bedroom types
      if (i < bedroomTypes.length && !selectedTypes.includes(bedroomTypes[i])) {
        continue; // No change for unselected types
      }
      
      // Update parameter with gradient descent
      currentParams[i] = currentParams[i] - learningRate * gradient[i];
      
      // Ensure values don't go negative
      currentParams[i] = Math.max(currentParams[i], 0);
      
      // For view adjustments, limit the change to +/- 10% of original value
      if (i >= bedroomTypes.length) {
        const viewIndex = i - bedroomTypes.length;
        const originalValue = initialParams[i];
        const maxChange = Math.max(originalValue * 0.1, 1); // 10% or at least 1
        
        if (currentParams[i] > originalValue + maxChange) {
          currentParams[i] = originalValue + maxChange;
        } else if (currentParams[i] < originalValue - maxChange) {
          currentParams[i] = Math.max(0, originalValue - maxChange);
        }
      }
    }
    
    // Update previous cost
    previousCost = currentCost;
    iteration++;
  }
  
  // Map optimized parameters back to bedroom types and views
  const bedroomAdjustments: Record<string, number> = {};
  bedroomTypes.forEach((type, index) => {
    // Only include selected bedroom types
    if (selectedTypes.includes(type)) {
      bedroomAdjustments[type] = Math.max(0, currentParams[index]);
    }
  });
  
  const viewAdjustments: Record<string, number> = {};
  views.forEach((view, index) => {
    // Only include views that are related to selected bedroom types
    if (filteredUnits.some(unit => unit.view === view)) {
      viewAdjustments[view] = Math.max(0, currentParams[bedroomTypes.length + index]);
    }
  });
  
  // Calculate final average PSF
  const finalAvgPsf = calculateOverallAveragePsf(filteredUnits, pricingConfig, {
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

/**
 * Full Optimization algorithm that adjusts all parameters including floor rules
 * to achieve a target overall PSF
 */
export const fullOptimizePsf = (
  units: Unit[],
  pricingConfig: PricingConfig,
  targetOverallPsf: number,
  selectedTypes: string[] = [],
  options = {
    learningRate: 0.03,
    maxIterations: 300,
    convergenceThreshold: 0.01,
    epsilon: 0.1,
    constraintFactor: 0.8
  }
): {
  optimizedParams: {
    bedroomAdjustments: Record<string, number>,
    viewAdjustments: Record<string, number>,
    floorRules: FloorRiseRule[]
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
  
  // If no bedroom types are selected, use all types
  if (selectedTypes.length === 0) {
    selectedTypes = [...bedroomTypes];
  }
  
  // Filter units to only include selected bedroom types
  const filteredUnits = units.filter(unit => selectedTypes.includes(unit.type));
  
  // Find unique views used by the selected bedroom types
  const usedViews = Array.from(new Set(
    filteredUnits.map(unit => unit.view as string)
  ));
  
  // Create a mapping of floor rule parameters
  const floorRuleMap: Array<{ ruleIndex: number, paramType: string, originalValue: number }> = [];
  pricingConfig.floorRiseRules.forEach((rule, index) => {
    // Add psfIncrement parameter
    floorRuleMap.push({
      ruleIndex: index,
      paramType: 'psfIncrement',
      originalValue: rule.psfIncrement
    });
    
    // Add jumpIncrement if it exists
    if (rule.jumpEveryFloor && rule.jumpIncrement !== undefined) {
      floorRuleMap.push({
        ruleIndex: index,
        paramType: 'jumpIncrement',
        originalValue: rule.jumpIncrement
      });
    }
  });
  
  // Parameter mapping for optimization
  const paramMap = {
    bedroomTypes,
    views,
    floorRuleParams: floorRuleMap.length,
    floorRuleMap
  };
  
  // Initial parameter values
  const initialParams: number[] = [
    // Bedroom type parameters
    ...bedroomTypes.map(type => {
      const pricing = pricingConfig.bedroomTypePricing.find(b => b.type === type);
      return pricing?.basePsf || pricingConfig.basePsf;
    }),
    // View parameters
    ...views.map(view => {
      const pricing = pricingConfig.viewPricing.find(v => v.view === view);
      return pricing?.psfAdjustment || 0;
    }),
    // Floor rule parameters
    ...floorRuleMap.map(mapping => mapping.originalValue)
  ];
  
  // Current parameters (will be updated during optimization)
  let currentParams = [...initialParams];
  
  // Iteration control
  let iteration = 0;
  let previousCost = Infinity;
  
  // Calculate initial average PSF
  const initialAvgPsf = calculateOverallAveragePsf(filteredUnits, pricingConfig);
  
  // Gradient descent loop
  while (iteration < maxIterations) {
    // Calculate current cost
    const currentCost = fullCostFunction(
      currentParams,
      units,
      pricingConfig,
      paramMap,
      targetOverallPsf,
      initialParams,
      selectedTypes
    );
    
    // Check convergence
    if (Math.abs(previousCost - currentCost) < convergenceThreshold) {
      break;
    }
    
    // Calculate gradient for each parameter
    const gradient: number[] = [];
    
    for (let i = 0; i < currentParams.length; i++) {
      // Skip optimization for non-selected bedroom types
      if (i < bedroomTypes.length && !selectedTypes.includes(bedroomTypes[i])) {
        gradient.push(0); // No change for unselected types
        continue;
      }
      
      // Skip optimization for views not used by selected bedroom types
      if (i >= bedroomTypes.length && i < bedroomTypes.length + views.length) {
        const viewIndex = i - bedroomTypes.length;
        const view = views[viewIndex];
        if (!usedViews.includes(view)) {
          gradient.push(0); // No change for unused views
          continue;
        }
      }
      
      // Create parameter vectors for numerical differentiation
      const paramsPlus = [...currentParams];
      paramsPlus[i] += epsilon;
      
      const paramsMinus = [...currentParams];
      paramsMinus[i] -= epsilon;
      
      // Calculate costs for +/- epsilon
      const costPlus = fullCostFunction(
        paramsPlus,
        units,
        pricingConfig,
        paramMap,
        targetOverallPsf,
        initialParams,
        selectedTypes
      );
      
      const costMinus = fullCostFunction(
        paramsMinus,
        units,
        pricingConfig,
        paramMap,
        targetOverallPsf,
        initialParams,
        selectedTypes
      );
      
      // Estimate gradient component using central difference
      gradient.push((costPlus - costMinus) / (2 * epsilon));
    }
    
    // Update parameters using gradient descent
    for (let i = 0; i < currentParams.length; i++) {
      // Skip parameter updates for non-selected bedroom types
      if (i < bedroomTypes.length && !selectedTypes.includes(bedroomTypes[i])) {
        continue; // No change for unselected types
      }
      
      // Skip updates for views not used by selected bedroom types
      if (i >= bedroomTypes.length && i < bedroomTypes.length + views.length) {
        const viewIndex = i - bedroomTypes.length;
        const view = views[viewIndex];
        if (!usedViews.includes(view)) {
          continue; // No change for unused views
        }
      }
      
      // Update parameter with gradient descent
      currentParams[i] = currentParams[i] - learningRate * gradient[i];
      
      // Apply constraints based on parameter type
      const bedroomCount = bedroomTypes.length;
      const viewCount = views.length;
      
      if (i < bedroomCount) { 
        // Bedroom PSF - ensure positive
        currentParams[i] = Math.max(currentParams[i], 1);
      } else if (i >= bedroomCount && i < bedroomCount + viewCount) {
        // View adjustment - ensure positive and limit change to +/- 10%
        const originalValue = initialParams[i];
        const maxChange = Math.max(originalValue * 0.1, 1); // 10% or at least 1
        
        currentParams[i] = Math.max(0, currentParams[i]); // Ensure non-negative
        
        if (currentParams[i] > originalValue + maxChange) {
          currentParams[i] = originalValue + maxChange;
        } else if (currentParams[i] < originalValue - maxChange) {
          currentParams[i] = Math.max(0, originalValue - maxChange);
        }
      } else if (i >= bedroomCount + viewCount) {
        // Floor rule parameter - apply appropriate constraints
        const floorParamIndex = i - (bedroomCount + viewCount);
        const paramMapping = floorRuleMap[floorParamIndex];
        
        if (paramMapping.paramType === 'psfIncrement') {
          // Ensure psfIncrement is positive but not too large
          currentParams[i] = Math.max(currentParams[i], 0.01);
          const maxIncrement = Math.max(paramMapping.originalValue * 1.5, 1); // Limit to 1.5x original
          currentParams[i] = Math.min(currentParams[i], maxIncrement);
        } else if (paramMapping.paramType === 'jumpIncrement') {
          // Ensure jumpIncrement is positive but not too large
          currentParams[i] = Math.max(currentParams[i], 0);
          const maxJumpIncrement = Math.max(paramMapping.originalValue * 1.5, 1); // Limit to 1.5x original
          currentParams[i] = Math.min(currentParams[i], maxJumpIncrement);
        }
      }
    }
    
    // Update previous cost
    previousCost = currentCost;
    iteration++;
  }
  
  // Map optimized parameters back to bedroom types and views
  const bedroomAdjustments: Record<string, number> = {};
  bedroomTypes.forEach((type, index) => {
    // Only include selected bedroom types
    if (selectedTypes.includes(type)) {
      bedroomAdjustments[type] = Math.max(0, currentParams[index]);
    }
  });
  
  const viewAdjustments: Record<string, number> = {};
  views.forEach((view, index) => {
    // Only include views that are related to selected bedroom types
    if (usedViews.includes(view)) {
      viewAdjustments[view] = Math.max(0, currentParams[bedroomTypes.length + index]);
    }
  });
  
  // Create optimized floor rules
  const optimizedFloorRules = [...pricingConfig.floorRiseRules]; // Clone original rules
  const floorParamStartIndex = bedroomTypes.length + views.length;
  
  floorRuleMap.forEach((mapping, index) => {
    const paramValue = Math.max(0, currentParams[floorParamStartIndex + index]);
    const { ruleIndex, paramType } = mapping;
    
    if (paramType === 'psfIncrement') {
      optimizedFloorRules[ruleIndex].psfIncrement = paramValue;
    } else if (paramType === 'jumpIncrement') {
      optimizedFloorRules[ruleIndex].jumpIncrement = paramValue;
    }
  });
  
  // Calculate final average PSF
  const finalAvgPsf = calculateOverallAveragePsf(filteredUnits, pricingConfig, {
    bedroomAdjustments,
    viewAdjustments,
    floorRules: optimizedFloorRules
  });
  
  return {
    optimizedParams: {
      bedroomAdjustments,
      viewAdjustments,
      floorRules: optimizedFloorRules
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
