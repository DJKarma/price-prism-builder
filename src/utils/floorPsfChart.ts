
export interface FloorPsfPoint {
  floor: number;
  psf: number;
  isJump: boolean;
}

/**
 * Generates a dataset of floor PSF values for visualization
 * This has been completely rewritten to use the same logic as calculateFloorPremium
 */
export const generateFloorPsfData = (
  floorRules: Array<{
    startFloor: number;
    endFloor: number | null;
    psfIncrement: number;
    jumpEveryFloor?: number;
    jumpIncrement?: number;
  }>,
  maxFloor: number = 50
): FloorPsfPoint[] => {
  // Process rules to ensure endFloor is properly handled
  const processedRules = floorRules.map(rule => ({
    ...rule,
    endFloor: rule.endFloor === null ? maxFloor : rule.endFloor
  }));
  
  // Sort rules by startFloor
  const sortedRules = [...processedRules].sort((a, b) => a.startFloor - b.startFloor);
  
  // Generate data points for each floor
  const floorPsfData: FloorPsfPoint[] = [];
  
  for (let floor = 1; floor <= maxFloor; floor++) {
    // Find the rule that applies to this floor
    const applicableRule = sortedRules.find(
      r => floor >= r.startFloor && floor <= r.endFloor
    );
    
    if (!applicableRule) {
      // No rule applies, use 0 PSF
      floorPsfData.push({
        floor,
        psf: 0,
        isJump: false
      });
      continue;
    }
    
    // Calculate cumulative PSF for this floor
    const floorOffset = floor - applicableRule.startFloor;
    let psf = (floorOffset + 1) * applicableRule.psfIncrement;
    
    // Check if this is a jump floor
    let isJump = false;
    
    if (applicableRule.jumpEveryFloor && applicableRule.jumpIncrement) {
      // Only floors after the start floor can be jump floors
      if (floorOffset > 0) {
        // Calculate jumps
        const jumps = Math.floor(floorOffset / applicableRule.jumpEveryFloor);
        
        if (jumps > 0) {
          // Add jump increments
          psf += jumps * applicableRule.jumpIncrement;
          
          // Check if this specific floor is a jump floor
          isJump = floorOffset % applicableRule.jumpEveryFloor === 0;
        }
      }
    }
    
    floorPsfData.push({
      floor,
      psf,
      isJump
    });
  }
  
  return floorPsfData;
};
