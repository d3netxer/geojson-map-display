
import { processGeoJSON } from '@/lib/mapUtils';
import { MapStats } from './types';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';

export const getColorScheme = (metric: string): string[] => {
  if (metric.includes('conge')) {
    // Enhanced color contrast for congestion
    return ['#E5F5E0', '#C0E5C8', '#86C49D', '#41A275', '#006C4A'];
  } else if (metric.includes('speed')) {
    return ['#FEE5D9', '#FCBBA1', '#FC9272', '#FB6A4A', '#DE2D26'];
  } else if (metric.includes('vktkm')) {
    return ['#F1EEF6', '#D4B9DA', '#C994C7', '#DF65B0', '#DD1C77'];
  } else {
    return ['#EDF8FB', '#B2E2E2', '#66C2A4', '#2CA25F', '#006D2C'];
  }
};

export const createGeoJSONLayer = (
  geoJSONData: any, 
  metric: string, 
  stats: MapStats, 
  colors: string[]
): GeoJSONLayer => {
  // Process the GeoJSON data
  const { processedGeoJSON } = processGeoJSON(geoJSONData, metric);
  
  // Create a blob URL for the GeoJSON data
  const geojsonBlob = new Blob([JSON.stringify(processedGeoJSON)], { type: "application/json" });
  const geojsonUrl = URL.createObjectURL(geojsonBlob);
  
  // Identical height settings to updateLayerVisualization for consistency
  const baseHeight = metric.includes('conge') ? 1000 : 800;
  const maxHeight = metric.includes('conge') ? 3000 : 2000;
  
  // Determine visualization method based on metric
  const visualVariables = [];
  
  if (metric === 'mean_conge' && stats.quantiles && stats.quantiles.length >= 4) {
    // Use steps for congestion with better visibility
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
    // Use interpolation for other metrics
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
  
  // Create and return the GeoJSON layer
  return new GeoJSONLayer({
    url: geojsonUrl,
    title: "Riyadh Hexagons",
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
              // Increase material transparency from 80 to 40 (60% transparent)
              transparency: 40  // 60% transparent 
            }
          }
        ]
      },
      visualVariables: visualVariables
    } as any,
    opacity: 0.6, // Reduced opacity from 0.8 to 0.6 for increased transparency
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
    // Create a proper renderer object
    const renderer = layer.renderer.clone();
    
    // Adjust base height based on metric - keeping consistent with createGeoJSONLayer
    const baseHeight = metric.includes('conge') ? 1000 : 800;
    const maxHeight = metric.includes('conge') ? 3000 : 2000;
    
    // Update the visual variables
    const visualVariables = [];
    
    if (metric === 'mean_conge' && stats.quantiles) {
      // Use steps for congestion with better visibility
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
      // Use interpolation for other metrics
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
    
    // Safely update the renderer with material transparency - completely rewritten for safety
    try {
      if (renderer) {
        // Create a new symbol definition rather than modifying existing potentially undefined properties
        const symbolConfig = {
          type: "polygon-3d",
          symbolLayers: [
            {
              type: "extrude",
              size: baseHeight,
              material: { 
                color: colors[0],
                transparency: 40 // Increased transparency from 80 to 40 (60% transparent)
              }
            }
          ]
        };
        
        // Apply the new symbol
        (renderer as any).symbol = symbolConfig;
        
        // Update the visualVariables
        (renderer as any).visualVariables = visualVariables;
        
        // Set the renderer
        layer.renderer = renderer;
      }
    } catch (err) {
      console.error("Error updating symbol material:", err);
    }
    
    // Update the layer's opacity - reduced from 0.99 to 0.6
    layer.opacity = 0.6;
    
    // Refresh the layer
    layer.refresh();
  } catch (err) {
    console.error("Error in updateLayerVisualization:", err);
  }
};

