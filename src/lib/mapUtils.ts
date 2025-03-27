
/**
 * Helper functions for processing GeoJSON data and handling map-related operations
 */

interface MetricStats {
  min: number;
  max: number;
  range: number;
  avg: number;
}

/**
 * Process the GeoJSON data to ensure it's properly formatted and calculate stats for a given metric
 */
export function processGeoJSON(geojson: any, metric: string = 'mean_speed') {
  const features = geojson.features;
  
  // Extract metric values for calculating min/max
  const metricValues = features.map((f: any) => f.properties[metric]).filter((val: any) => val !== undefined && !isNaN(val));
  
  const min = Math.min(...metricValues);
  const max = Math.max(...metricValues);
  const range = max - min;
  const avg = metricValues.reduce((sum: number, val: number) => sum + val, 0) / metricValues.length;
  
  // Copy the GeoJSON to avoid mutating the original
  const processedGeoJSON = JSON.parse(JSON.stringify(geojson));
  
  // Ensure each feature has the metric property as a number
  processedGeoJSON.features = features.map((feature: any) => {
    // Make a copy of the feature
    const newFeature = { ...feature };
    
    // Ensure the metric value is a number
    if (newFeature.properties[metric] === undefined || isNaN(newFeature.properties[metric])) {
      newFeature.properties[metric] = min;
    }
    
    return newFeature;
  });
  
  return {
    processedGeoJSON,
    metricStats: { min, max, range, avg }
  };
}

/**
 * Generate a color scale for the given metric range
 */
export function getColorScale(min: number, max: number) {
  // Different color scales based on metric ranges
  const colorScales: Record<string, string[]> = {
    // Cool blue scale (good for speed)
    blue: ['#cfe2f3', '#9fc5e8', '#6fa8dc', '#3d85c6', '#0b5394'],
    
    // Red scale (good for congestion)
    red: ['#f4cccc', '#ea9999', '#e06666', '#cc0000', '#990000'],
    
    // Green scale (good for green metrics)
    green: ['#d9ead3', '#b6d7a8', '#93c47d', '#6aa84f', '#38761d'],
    
    // Purple scale (good for urban metrics)
    purple: ['#d9d2e9', '#b4a7d6', '#8e7cc3', '#674ea7', '#351c75'],
  };
  
  // Default to blue scale for now, but could be selected based on metric type
  return colorScales.blue;
}

/**
 * Format a value with the appropriate units
 */
export function formatValue(value: number, metric: string): string {
  if (metric.includes('speed')) {
    return `${value.toFixed(1)} km/h`;
  } else if (metric.includes('conge')) {
    return value.toFixed(2);
  } else if (metric.includes('vktkm')) {
    return `${value.toFixed(0)} km`;
  } else if (metric.includes('urban_')) {
    return `${value.toFixed(0)} m`;
  } else if (metric.includes('segme')) {
    return `${value.toFixed(1)} m`;
  }
  
  return value.toFixed(1);
}
