
import { processGeoJSON } from '@/lib/mapUtils';
import { MapStats } from './types';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';

export const getColorScheme = (metric: string): string[] => {
  if (metric.includes('conge')) {
    return ['#E5F5E0', '#C0E5C8', '#86C49D', '#41A275', '#006C4A'];
  } else if (metric.includes('speed')) {
    return ['#FEE5D9', '#FCBBA1', '#FC9272', '#FB6A4A', '#DE2D26'];
  } else if (metric.includes('vktkm')) {
    return ['#F1EEF6', '#D4B9DA', '#C994C7', '#DF65B0', '#DD1C77'];
  } else {
    return ['#EDF8FB', '#B2E2E2', '#66C2A4', '#2CA25F', '#006D2C'];
  }
};

export const getInitialColorScheme = (): string[] => {
  // Translucent light gray colors for initial view
  const baseColors = ['#F1F1F1', '#E0E0E0', '#C8C8C9', '#AAADB0', '#9F9EA1'];
  return baseColors.map(color => `${color}99`); // Add 60% opacity
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
            size: 350,
            material: { 
              color: colors[0],
            }
          }
        ]
      },
      visualVariables: [
        {
          type: "size",
          valueExpression: `$feature.${metric}`,
          valueUnit: "meters",
          minDataValue: stats.min,
          maxDataValue: stats.max,
          minSize: 200,
          maxSize: 1500
        } as any,
        {
          type: "color",
          valueExpression: `$feature.${metric}`,
          stops: [
            { value: stats.min, color: colors[0] },
            { value: stats.min + (stats.range * 0.25), color: colors[1] },
            { value: stats.min + (stats.range * 0.5), color: colors[2] },
            { value: stats.min + (stats.range * 0.75), color: colors[3] },
            { value: stats.max, color: colors[4] }
          ]
        } as any
      ]
    },
    opacity: 0.7,
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
  
  // Create a proper renderer object
  const renderer = layer.renderer.clone();
  
  // Update the visual variables
  const visualVariables = [];
  
  if (metric.includes('conge') && stats.quantiles) {
    // Use steps for congestion
    visualVariables.push({
      type: "size",
      stops: [
        { value: stats.quantiles[0], size: 500 },
        { value: stats.quantiles[1], size: 1000 },
        { value: stats.quantiles[2], size: 1500 },
        { value: stats.quantiles[3], size: 2000 },
        { value: stats.quantiles[4], size: 2500 }
      ]
    });
    
    visualVariables.push({
      type: "color",
      stops: [
        { value: stats.quantiles[0], color: colors[0] },
        { value: stats.quantiles[1], color: colors[1] },
        { value: stats.quantiles[2], color: colors[2] },
        { value: stats.quantiles[3], color: colors[3] },
        { value: stats.quantiles[4], color: colors[4] }
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
      minSize: 500,
      maxSize: 2500
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
  
  // Update the renderer
  (renderer as any).visualVariables = visualVariables;
  layer.renderer = renderer;
  
  // Refresh the layer
  layer.refresh();
};
