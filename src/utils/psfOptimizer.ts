
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
}

interface PricingConfig {
  basePsf: number;
  bedroomTypePricing: BedroomTypePricing[];
  viewPricing: ViewPricing[];
  floorRiseRules: FloorRiseRule[];
}

/**
 * Calculate the PSF for a given unit with the provided base PSF for its type
 */
const calculateUnitPsf = (
  unit: Unit, 
  pricingConfig: PricingConfig, 
  overrideBasePsf?: number
): number => {
  // Find bedroom type pricing
  const bedroomType = pricingConfig.bedroomTypePricing.find(
    (b) => b.type === unit.type
  );
  
  // Use override base PSF if provided, otherwise use configured value
  const basePsf = overrideBasePsf !== undefined 
    ? overrideBasePsf 
    : (bedroomType?.basePsf || pricingConfig.basePsf);
  
  // Find view adjustment
  const viewAdjustment = pricingConfig.viewPricing.find(
    (v) => v.view === unit.view
  );
  const viewPsfAdjustment = viewAdjustment?.psfAdjustment || 0;
  
  // Calculate floor adjustment - cumulative
  let floorAdjustment = 0;
  const floorLevel = parseInt(unit.floor as string) || 1;
  
  // Sort floor rules by startFloor to process them in order
  const sortedFloorRules = [...pricingConfig.floorRiseRules].sort(
    (a, b) => a.startFloor - b.startFloor
  );
  
  // Calculate cumulative floor adjustment
  let currentFloor = 1;
  let cumulativeAdjustment = 0;
  
  for (const rule of sortedFloorRules) {
    // If we already passed this rule's range, apply full adjustment
    if (floorLevel > rule.endFloor) {
      // Apply adjustment for all floors in this range
      const floorsInRange = rule.endFloor - Math.max(currentFloor, rule.startFloor) + 1;
      cumulativeAdjustment += floorsInRange * rule.psfIncrement;
      currentFloor = rule.endFloor + 1;
    } 
    // If we're within this rule's range
    else if (floorLevel >= rule.startFloor) {
      // Apply adjustment for floors up to the unit's floor
      const floorsInRange = floorLevel - Math.max(currentFloor, rule.startFloor) + 1;
      cumulativeAdjustment += floorsInRange * rule.psfIncrement;
      break;
    }
  }
  
  floorAdjustment = cumulativeAdjustment;
  
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
    const psf = calculateUnitPsf(unit, pricingConfig, testBasePsf);
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
