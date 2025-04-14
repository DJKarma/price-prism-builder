
import { UnitWithPricing } from '../PricingSimulator';

// Format numbers with thousand separators
export const formatNumberWithCommas = (num: number): string => {
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

// Format numbers for display (K/M for thousands/millions) but only for price values, not PSF
export const formatNumber = (num: number, isTotalPrice: boolean = false): string => {
  if (!isFinite(num)) return "0";
  
  if (isTotalPrice) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0) + "K";
    }
  }
  
  return num.toFixed(2);
};

// Create summary data for export
export const createSummaryData = (filteredUnits: UnitWithPricing[]) => {
  // Group by bedroom type for summary
  const typeGroups: Record<string, UnitWithPricing[]> = {};
  filteredUnits.forEach((item) => {
    const type = item.type || "Unknown";
    if (!typeGroups[type]) {
      typeGroups[type] = [];
    }
    typeGroups[type].push(item);
  });
  
  // Calculate metrics for each type and create summary rows
  const summaryRows = Object.keys(typeGroups).map((type) => {
    const items = typeGroups[type];
    
    // Filter out items with missing essential data
    const validItems = items.filter(item => {
      const hasValidSellArea = parseFloat(item.sellArea) > 0;
      const hasValidPrice = typeof item.finalTotalPrice === 'number' && item.finalTotalPrice > 0;
      return hasValidSellArea && hasValidPrice;
    });
    
    if (validItems.length === 0) {
      return {
        Type: type,
        Units: 0,
        "Avg Size": 0,
        "Total Value": 0,
        "Min SA PSF": 0,
        "Avg SA PSF": 0,
        "Max SA PSF": 0,
        "Min AC PSF": 0,
        "Avg AC PSF": 0,
        "Max AC PSF": 0
      };
    }
    
    // Calculate metrics
    const unitCount = validItems.length;
    const totalArea = validItems.reduce((sum, item) => sum + parseFloat(item.sellArea || 0), 0);
    const avgSize = totalArea / unitCount;
    const totalValue = validItems.reduce((sum, item) => sum + (item.finalTotalPrice || 0), 0);
    
    // SA PSF
    const psfs = validItems.map(item => item.finalPsf || (item.finalTotalPrice / parseFloat(item.sellArea || 1)));
    const avgPsf = psfs.reduce((sum, psf) => sum + psf, 0) / unitCount;
    const minPsf = Math.min(...psfs);
    const maxPsf = Math.max(...psfs);
    
    // AC PSF
    const validItemsWithAcArea = validItems.filter(item => parseFloat(item.acArea) > 0);
    let avgAcPsf = 0, minAcPsf = 0, maxAcPsf = 0;
    
    if (validItemsWithAcArea.length > 0) {
      const acPsfs = validItemsWithAcArea.map(item => item.finalAcPsf || (item.finalTotalPrice / parseFloat(item.acArea || 1)));
      avgAcPsf = acPsfs.reduce((sum, psf) => sum + psf, 0) / validItemsWithAcArea.length;
      minAcPsf = Math.min(...acPsfs);
      maxAcPsf = Math.max(...acPsfs);
    }
    
    return {
      Type: type,
      Units: unitCount,
      "Avg Size": avgSize,
      "Total Value": totalValue,
      "Min SA PSF": minPsf,
      "Avg SA PSF": avgPsf,
      "Max SA PSF": maxPsf,
      "Min AC PSF": minAcPsf,
      "Avg AC PSF": avgAcPsf,
      "Max AC PSF": maxAcPsf
    };
  });
  
  // Add total row
  const allValidItems = filteredUnits.filter(item => {
    const hasValidSellArea = parseFloat(item.sellArea) > 0;
    const hasValidPrice = typeof item.finalTotalPrice === 'number' && item.finalTotalPrice > 0;
    return hasValidSellArea && hasValidPrice;
  });
  
  if (allValidItems.length > 0) {
    const totalUnitCount = allValidItems.length;
    const totalSellArea = allValidItems.reduce((sum, item) => sum + parseFloat(item.sellArea || 0), 0);
    const avgSize = totalSellArea / totalUnitCount;
    const totalValue = allValidItems.reduce((sum, item) => sum + (item.finalTotalPrice || 0), 0);
    
    // Overall average PSF based on total value divided by total area
    const overallAvgPsf = totalValue / totalSellArea;
    
    // Min and max PSF across all units
    const allPsfs = allValidItems.map(item => item.finalPsf || (item.finalTotalPrice / parseFloat(item.sellArea || 1)));
    const minPsf = Math.min(...allPsfs);
    const maxPsf = Math.max(...allPsfs);
    
    // AC PSF calculations for all units
    const validItemsWithAcArea = allValidItems.filter(item => parseFloat(item.acArea) > 0);
    let overallAvgAcPsf = 0, minAcPsf = 0, maxAcPsf = 0;
    
    if (validItemsWithAcArea.length > 0) {
      const totalAcArea = validItemsWithAcArea.reduce((sum, item) => sum + parseFloat(item.acArea || 0), 0);
      const acPsfs = validItemsWithAcArea.map(item => item.finalAcPsf || (item.finalTotalPrice / parseFloat(item.acArea || 1)));
      
      overallAvgAcPsf = totalValue / totalAcArea;
      minAcPsf = Math.min(...acPsfs);
      maxAcPsf = Math.max(...acPsfs);
    }
    
    summaryRows.push({
      Type: "TOTAL",
      Units: totalUnitCount,
      "Avg Size": avgSize,
      "Total Value": totalValue,
      "Min SA PSF": minPsf,
      "Avg SA PSF": overallAvgPsf,
      "Max SA PSF": maxPsf,
      "Min AC PSF": minAcPsf,
      "Avg AC PSF": overallAvgAcPsf,
      "Max AC PSF": maxAcPsf
    });
  }
  
  return summaryRows;
};
