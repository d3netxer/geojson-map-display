
import { processGeoJSON } from '@/lib/mapUtils';
import { MapStats } from './types';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';

// Memory-efficient color scheme generator
export const getColorScheme = (metric: string): string[] => {
  // Use predefined color schemes to avoid generating new arrays
  const colorSchemes = {
    congestion: ['#E5F5E0', '#C0E5C8', '#86C49D', '#41A275', '#006C4A'],
    speed: ['#FEE5D9', '#FCBBA1', '#FC9272', '#FB6A4A', '#DE2D26'],
    volume: ['#F1EEF6', '#D4B9DA', '#C994C7', '#DF65B0', '#DD1C77'],
    default: ['#EDF8FB', '#B2E2E2', '#66C2A4', '#2CA25F', '#006D2C']
  };
  
  if (metric.includes('conge')) return colorSchemes.congestion;
  if (metric.includes('speed')) return colorSchemes.speed;
  if (metric.includes('vktkm')) return colorSchemes.volume;
  return colorSchemes.default;
};

// Create simplified GeoJSON data for layer creation
const createSimplifiedGeoJSON = (geoJSONData: any, metric: string) => {
  // Only include essential data to minimize memory use
  if (!geoJSONData || !Array.isArray(geoJSONData.features)) {
    return { type: "FeatureCollection", features: [] };
  }
  
  return {
    type: "FeatureCollection",
    features: geoJSONData.features.map(feature => ({
      type: "Feature",
      properties: { [metric]: feature.properties?.[metric] || 0 },
      geometry: feature.geometry
    }))
  };
};

// Helper function to efficiently dispose of blob URLs
const createBlobURL = (data: any): string => {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  // Auto-revoke URL after a delay to free memory
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  
  return url;
};

// Helper function to create visual variables (extracted to reduce code duplication)
const createVisualVariables = (
  metric: string, 
  stats: MapStats, 
  colors: string[],
  baseHeight: number,
  maxHeight: number
) => {
  const visualVariables = [];
  
  if (metric === 'mean_conge' && Array.isArray(stats.quantiles) && stats.quantiles.length >= 4) {
    visualVariables.push({
      type: "size",
      valueExpression: `$feature.${metric}`,
      stops: [
        { value: stats.min, size: 1000 },
        { value: stats.quantiles[1], size: 1500 },
        { value: stats.quantiles[2], size: 2000 },
        { value: stats.quantiles[3], size: 2500 },
        { value: stats.max, size: 3000 }
      ]
    });
    
    visualVariables.push({
      type: "color",
      valueExpression: `$feature.${metric}`,
      stops: [
        { value: stats.min, color: colors[0] },
        { value: stats.quantiles[1], color: colors[1] },
        { value: stats.quantiles[2], color: colors[2] },
        { value: stats.quantiles[3], color: colors[3] },
        { value: stats.max, color: colors[4] }
      ]
    });
  } else {
    visualVariables.push({
      type: "size",
      valueExpression: `$feature.${metric}`,
      valueUnit: "meters",
      minDataValue: stats.min,
      maxDataValue: stats.max,
      minSize: baseHeight,
      maxSize: maxHeight
    });
    
    visualVariables.push({
      type: "color",
      valueExpression: `$feature.${metric}`,
      stops: [
        { value: stats.min, color: colors[0] },
        { value: stats.min + (stats.range * 0.25), color: colors[1] },
        { value: stats.min + (stats.range * 0.5), color: colors[2] },
        { value: stats.min + (stats.range * 0.75), color: colors[3] },
        { value: stats.max, color: colors[4] }
      ]
    });
  }
  
  return visualVariables;
};

// More memory-efficient layer creation with optimization
export const createGeoJSONLayer = (
  geoJSONData: any, 
  metric: string, 
  stats: MapStats, 
  colors: string[]
): GeoJSONLayer => {
  // Process the GeoJSON data with extreme optimizations
  const { metricStats } = processGeoJSON(geoJSONData, metric);
  const simplifiedData = createSimplifiedGeoJSON(geoJSONData, metric);
  
  // Create a blob URL for the GeoJSON data to minimize memory usage
  const blobUrl = createBlobURL(simplifiedData);
  
  // Identical height settings for consistency
  const baseHeight = metric.includes('conge') ? 1000 : 800;
  const maxHeight = metric.includes('conge') ? 3000 : 2000;
  
  // Determine visualization method based on metric with memory optimizations
  const visualVariables = createVisualVariables(metric, stats, colors, baseHeight, maxHeight);
  
  // Create the layer with minimal configuration to save memory
  return new GeoJSONLayer({
    url: blobUrl,
    title: "Hexagons",
    renderer: {
      type: "simple",
      symbol: {
        type: "polygon-3d",
        symbolLayers: [
          {
            type: "extrude",
            size: baseHeight,
            material: { 
              color: colors[0],
              transparency: 0.98 // 98% transparent
            }
          }
        ]
      },
      visualVariables: visualVariables
    } as any,
    opacity: 0.3, // 70% transparent at layer level
    popupEnabled: false,
    outFields: ["*"]
  });
};

export const updateLayerVisualization = (
  layer: GeoJSONLayer | null,
  metric: string,
  stats: MapStats,
  colors: string[]
): void => {
  if (!layer) return;
  
  try {
    // Clone renderer to avoid modifying the original
    const renderer = layer.renderer.clone();
    
    // Maintain consistent heights
    const baseHeight = metric.includes('conge') ? 1000 : 800;
    const maxHeight = metric.includes('conge') ? 3000 : 2000;
    
    // Create visual variables using the helper function
    const visualVariables = createVisualVariables(metric, stats, colors, baseHeight, maxHeight);
    
    // Create a new symbol definition rather than modifying existing
    const symbolConfig = {
      type: "polygon-3d",
      symbolLayers: [
        {
          type: "extrude",
          size: baseHeight,
          material: { 
            color: colors[0],
            transparency: 0.98 // 98% transparent
          }
        }
      ]
    };
    
    // Apply the new symbol and visual variables
    (renderer as any).symbol = symbolConfig;
    (renderer as any).visualVariables = visualVariables;
    
    // Set the renderer and opacity
    layer.renderer = renderer;
    layer.opacity = 0.3; // 70% transparent
    
    // Refresh the layer
    layer.refresh();
  } catch (err) {
    console.error("Error in updateLayerVisualization:", err);
  }
};
