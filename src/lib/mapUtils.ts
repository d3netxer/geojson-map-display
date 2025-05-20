
// Function to process GeoJSON data for visualization
export const processGeoJSON = (geojson: any, metric: string) => {
  if (!geojson || !geojson.features) {
    console.error('Invalid GeoJSON data provided');
    return { processedGeoJSON: { type: 'FeatureCollection', features: [] }, metricStats: {} };
  }

  // Deep clone the GeoJSON to avoid mutating the original
  const processedGeoJSON = JSON.parse(JSON.stringify(geojson));

  // Calculate statistics for the selected metric
  const values = processedGeoJSON.features
    .map((feature: any) => feature.properties[metric])
    .filter((val: any) => val !== undefined && val !== null);

  if (values.length === 0) {
    console.error(`No valid values found for metric: ${metric}`);
    return { 
      processedGeoJSON, 
      metricStats: { min: 0, max: 1, mean: 0, range: 1, quantiles: [0.2, 0.4, 0.6, 0.8] } 
    };
  }

  // Get min, max, mean, and range
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min > 0 ? max - min : 1; // Avoid division by zero
  const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;

  // Calculate quantiles for better visualization
  const sortedValues = [...values].sort((a, b) => a - b);
  const quantiles = [
    sortedValues[Math.floor(sortedValues.length * 0.2)],
    sortedValues[Math.floor(sortedValues.length * 0.4)],
    sortedValues[Math.floor(sortedValues.length * 0.6)],
    sortedValues[Math.floor(sortedValues.length * 0.8)],
  ];

  // Return processed GeoJSON and statistics
  return {
    processedGeoJSON,
    metricStats: {
      min,
      max,
      mean,
      range,
      quantiles
    }
  };
};

// Function to get color scale based on metric
export const getColorScale = (min: number, max: number, metric: string) => {
  // Different color schemes for different metrics
  if (metric === 'mean_speed') {
    // Speed: green (slow) to red (fast)
    return ['#198754', '#5cb85c', '#6c757d', '#fd7e14', '#dc3545'];
  } else if (metric === 'mean_conge') {
    // Congestion: green (low) to red (high) - more distinct color gradient
    return ['#E5F5E0', '#C0E5C8', '#86C49D', '#41A275', '#006C4A'];
  } else if (metric === 'sum_vktkm') {
    // Vehicle kilometers: light to dark blue
    return ['#cfe2ff', '#9ec5fe', '#6ea8fe', '#3d8bfd', '#0d6efd'];
  } else {
    // Default: purple gradient
    return ['#e2d9f3', '#c5b3e6', '#a98eda', '#8c68cd', '#6f42c1'];
  }
};

// Function to format metric values for display with safe handling for undefined/null
export const formatValue = (value: number | undefined | null, metric: string) => {
  // Return placeholder if value is undefined or null
  if (value === undefined || value === null) {
    return 'N/A';
  }

  if (metric === 'mean_speed') {
    return `${value.toFixed(1)} km/h`;
  } else if (metric === 'mean_conge') {
    return value.toFixed(2);
  } else if (metric === 'sum_vktkm') {
    return `${value.toFixed(0)} km`;
  } else if (metric === 'sum_urban_') {
    return `${value.toFixed(0)} m`;
  }
  return value.toFixed(2);
};

// Function to calculate height multiplier based on metric type
export const getHeightMultiplier = (metric: string, value: number, min: number, max: number) => {
  // Avoid division by zero
  const normalizedValue = max > min ? (value - min) / (max - min) : 0.5;
  
  // For congestion, we want higher congestion to have taller hexagons
  if (metric === 'mean_conge') {
    // Scale from 300 to 3000 for better visibility
    return 300 + (normalizedValue * 2700);
  } 
  
  // For speed, higher speeds should be taller
  else if (metric === 'mean_speed') {
    // Scale from 200 to 2000
    return 200 + (normalizedValue * 1800);
  }
  
  // For volumes (vkt, urban road length), higher volumes = taller
  else {
    // Scale from 300 to 2500
    return 300 + (normalizedValue * 2200);
  }
};
