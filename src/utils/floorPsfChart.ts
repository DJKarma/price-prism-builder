
export interface FloorPsfPoint {
  floor: number;
  psf: number;
  isJump: boolean;
}

/**
 * Generates a dataset of floor PSF values for visualization
 */
export const generateFloorPsfData = (
  floorRules: Array<{
    startFloor: number;
    endFloor: number;
    psfIncrement: number;
    jumpEveryFloor?: number;
    jumpIncrement?: number;
  }>,
  maxFloor: number = 50
): FloorPsfPoint[] => {
  // Sort rules by startFloor
  const sortedRules = [...floorRules].sort((a, b) => a.startFloor - b.startFloor);
  
  // Calculate PSF for each floor
  const floorPsfData: FloorPsfPoint[] = [];
  
  for (let floor = 1; floor <= maxFloor; floor++) {
    let cumulativePsf = 0;
    let isJump = false;
    
    // Calculate cumulative PSF for this floor
    for (let currentFloor = 1; currentFloor <= floor; currentFloor++) {
      // Find applicable rule for this floor
      const rule = sortedRules.find(
        r => currentFloor >= r.startFloor && currentFloor <= r.endFloor
      );
      
      if (rule) {
        // Check if this is a jump floor
        const jumpFloor = rule.jumpEveryFloor && rule.jumpIncrement && 
                         ((currentFloor - rule.startFloor) % rule.jumpEveryFloor === 0) && 
                         currentFloor > rule.startFloor;
                         
        // Add regular increment
        cumulativePsf += rule.psfIncrement;
        
        // Add jump increment if applicable
        if (jumpFloor) {
          cumulativePsf += rule.jumpIncrement || 0;
          
          if (currentFloor === floor) {
            isJump = true;
          }
        }
      }
    }
    
    floorPsfData.push({
      floor,
      psf: cumulativePsf,
      isJump
    });
  }
  
  return floorPsfData;
};
