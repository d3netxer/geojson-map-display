
import mapboxgl from 'mapbox-gl';

/**
 * Applies visualization to the map based on the provided metric
 */
export const applyVisualization = (
  map: mapboxgl.Map | null,
  stats: any,
  colors: string[],
  metric: string
): void => {
  if (!map) return;
  
  let colorExpression;
  let heightExpression;
  
  if (metric.includes('conge') && stats.quantiles) {
    // Fix: Ensure quantiles are in strictly ascending order and unique for step expression
    let uniqueQuantiles = Array.from(new Set(stats.quantiles)).sort((a: number, b: number) => a - b);
    
    // Ensure the first value is greater than min (to avoid duplicate step values)
    if (uniqueQuantiles.length > 0 && uniqueQuantiles[0] <= stats.min) {
      uniqueQuantiles = uniqueQuantiles.filter((q: number) => q > stats.min);
    }
    
    // Ensure quantiles are unique and strictly ascending
    const processedQuantiles: number[] = [];
    let prevValue: number = stats.min;
    
    for (const q of uniqueQuantiles) {
      // Make sure q is treated as a number
      const qAsNumber = Number(q);
      
      // Add a small epsilon if the value is too close to previous
      if (qAsNumber - prevValue < 0.001) {
        const adjustedValue = prevValue + 0.001;
        processedQuantiles.push(adjustedValue);
        prevValue = adjustedValue;
      } else {
        processedQuantiles.push(qAsNumber);
        prevValue = qAsNumber;
      }
    }
    
    console.log(`Quantiles for ${metric}:`, processedQuantiles);
    
    // Create step pairs ensuring strictly ascending order
    const stepPairs: (number | string)[] = [];
    for (let i = 0; i < Math.min(processedQuantiles.length, colors.length - 1); i++) {
      stepPairs.push(processedQuantiles[i], colors[i + 1]);
    }
    
    // Build the complete step expression with strictly ascending values
    colorExpression = [
      'step',
      ['get', metric],
      colors[0],
      ...stepPairs
    ];
    
    console.log('Step expression for color:', colorExpression);
    
    // Use interpolate for height to avoid step expression errors
    heightExpression = [
      'interpolate',
      ['linear'],
      ['get', metric],
      stats.min, 500,
      stats.min + (stats.range * 0.25), 800,
      stats.min + (stats.range * 0.5), 1200,
      stats.min + (stats.range * 0.75), 1600,
      stats.max, 2000
    ];
  } else {
    colorExpression = [
      'interpolate',
      ['linear'],
      ['get', metric],
      stats.min, colors[0],
      stats.min + (stats.range * 0.25), colors[1],
      stats.min + (stats.range * 0.5), colors[2],
      stats.min + (stats.range * 0.75), colors[3],
      stats.max, colors[4],
    ];
    
    heightExpression = [
      'interpolate',
      ['linear'],
      ['get', metric],
      stats.min, 500,
      stats.max, 2000
    ];
  }
  
  if (map.getLayer('hexagons-fill')) {
    map.setPaintProperty('hexagons-fill', 'fill-extrusion-color', colorExpression);
    map.setPaintProperty('hexagons-fill', 'fill-extrusion-height', heightExpression);
  } else {
    // Add 3D hexagons layer if it doesn't exist
    map.addLayer({
      id: 'hexagons-fill',
      type: 'fill-extrusion',
      source: 'riyadh-hexagons',
      paint: {
        'fill-extrusion-color': colorExpression,
        'fill-extrusion-height': heightExpression,
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.7,
      }
    });
  }
};

/**
 * Get a label for a metric key
 */
export const getMetricLabel = (metricKey: string): string => {
  const labels: Record<string, string> = {
    'mean_speed': 'Average Speed (km/h)',
    'mean_conge': 'Congestion Level',
    'sum_vktkm': 'Total Vehicle Kilometers',
    'sum_urban_': 'Urban Road Length'
  };
  
  return labels[metricKey] || metricKey;
};
