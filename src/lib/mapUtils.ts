
/**
 * Helper functions for processing GeoJSON data and handling map-related operations
 */

interface MetricStats {
  min: number;
  max: number;
  range: number;
  avg: number;
  quantiles?: number[];
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
  
  // Calculate quantiles for congestion metric (5 quantiles for 5 color classes)
  let quantiles: number[] | undefined = undefined;
  
  if (metric.includes('conge')) {
    // Sort values for quantile calculation
    const sortedValues = [...metricValues].sort((a, b) => a - b);
    
    // Ensure we have unique, ascending values for the quantiles
    // This is critical for Mapbox's step expression which requires strictly ascending values
    const length = sortedValues.length;
    quantiles = [
      min,
      sortedValues[Math.floor(length * 0.2)],
      sortedValues[Math.floor(length * 0.4)],
      sortedValues[Math.floor(length * 0.6)],
      sortedValues[Math.floor(length * 0.8)],
      max
    ];
    
    // Ensure strictly ascending order by adjusting any identical values
    for (let i = 1; i < quantiles.length; i++) {
      if (quantiles[i] <= quantiles[i-1]) {
        // Add a small epsilon to make it strictly greater than the previous value
        quantiles[i] = quantiles[i-1] + 0.000001;
      }
    }
    
    console.log('Quantiles for congestion:', quantiles);
  }
  
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
    metricStats: { min, max, range, avg, quantiles }
  };
}

/**
 * Generate a color scale for the given metric range
 */
export function getColorScale(min: number, max: number, metric?: string) {
  // Different color scales based on metric types
  const colorScales: Record<string, string[]> = {
    // Cool blue scale (good for speed)
    blue: ['#cfe2f3', '#9fc5e8', '#6fa8dc', '#3d85c6', '#0b5394'],
    
    // Green to red scale (good for congestion - red is high congestion, green is low congestion)
    congestion: ['#F2FCE2', '#A4D86E', '#FFD166', '#F17A3A', '#EA384C'],
    
    // Green scale (good for green metrics)
    green: ['#d9ead3', '#b6d7a8', '#93c47d', '#6aa84f', '#38761d'],
    
    // Purple scale (good for urban metrics)
    purple: ['#d9d2e9', '#b4a7d6', '#8e7cc3', '#674ea7', '#351c75'],
  };
  
  // Select color scale based on metric name if provided
  if (metric) {
    if (metric.includes('conge')) {
      return colorScales.congestion;
    } else if (metric.includes('urban_')) {
      return colorScales.purple;
    } else if (metric.includes('vktkm')) {
      return colorScales.green;
    }
  }
  
  // Default to blue scale for speed and other metrics
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

/**
 * Get height multiplier based on metric type - useful for 3D visualization
 * For congestion, higher values should be taller
 */
export function getHeightMultiplier(value: number, min: number, max: number, metric?: string): number {
  // For congestion, higher values = taller hexagons
  if (metric && metric.includes('conge')) {
    const range = max - min;
    if (range === 0) return 1;
    return 1 + ((value - min) / range) * 2; // Scale factor of 2 to make the difference more noticeable
  }
  
  // For other metrics, higher values get taller
  const range = max - min;
  if (range === 0) return 1;
  return 1 + ((value - min) / range);
}
