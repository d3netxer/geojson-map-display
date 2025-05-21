
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { toast } from 'sonner';
import { processGeoJSON, getColorScale } from '@/lib/mapUtils';

interface UseMapboxProps {
  mapContainer: React.RefObject<HTMLDivElement>;
  token: string;
  mapStyle: string;
  geoJSONData: any;
  metric: string;
  onError?: (error: string) => void;
  onFeatureSelect: (feature: any) => void;
}

export const useMapbox = ({
  mapContainer,
  token,
  mapStyle,
  geoJSONData,
  metric,
  onError,
  onFeatureSelect
}: UseMapboxProps) => {
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricStats, setMetricStats] = useState<any>(null);
  const [colorScale, setColorScale] = useState<string[]>([]);

  const validateMapboxToken = (token: string) => {
    if (!token || token.trim() === '') {
      console.error("Mapbox token validation failed: Empty token");
      return false;
    }
    
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error("Mapbox token validation failed: Invalid format");
      return false;
    }
    return true;
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    
    if (!validateMapboxToken(token)) {
      const errorMsg = 'Please provide a valid Mapbox access token';
      toast.error(errorMsg);
      setLoading(false);
      if (onError) onError(errorMsg);
      return;
    }
    
    mapboxgl.accessToken = token;
    
    console.log("Initializing Mapbox map");
    
    try {
      const { processedGeoJSON, metricStats: stats } = processGeoJSON(geoJSONData, metric);
      const colors = getColorScale(stats.min, stats.max, metric);
      
      setMetricStats(stats);
      setColorScale(colors);
      
      // Create the map instance
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [46.73, 24.59], // Riyadh coordinates
        zoom: 11,
        minZoom: 9,
        maxZoom: 16,
        attributionControl: false,
        pitch: 45,
      });
      
      const mapInstance = map.current;
      
      // Add navigation controls
      mapInstance.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'bottom-right'
      );
      
      // Add attribution control
      mapInstance.addControl(new mapboxgl.AttributionControl({
        compact: true
      }), 'bottom-left');
      
      // When the map is loaded, add the data
      mapInstance.on('load', () => {
        console.log('Mapbox loaded successfully');
        
        // Add GeoJSON source
        mapInstance.addSource('riyadh-hexagons', {
          type: 'geojson',
          data: processedGeoJSON,
        });
        
        console.log('Adding hexagon layers with features count:', processedGeoJSON.features.length);
        
        // Process features to handle MultiPolygon geometries
        const features = processedGeoJSON.features.map((feature: any) => {
          const newFeature = { ...feature };
          if (feature.geometry && feature.geometry.type === 'MultiPolygon') {
            newFeature.geometry = {
              type: 'Polygon',
              coordinates: feature.geometry.coordinates[0]
            };
          }
          return newFeature;
        });
        
        // Update the source with processed features
        mapInstance.getSource('riyadh-hexagons').setData({
          type: 'FeatureCollection',
          features: features
        });
        
        // Apply visualization based on the current metric
        applyVisualization(stats, colors);
        
        // Add click interaction
        mapInstance.on('click', 'hexagons-fill', (e) => {
          if (!e.features || e.features.length === 0) return;
          
          const feature = e.features[0];
          onFeatureSelect({
            properties: feature.properties
          });
          
          // Fly to the clicked feature
          mapInstance.flyTo({
            center: e.lngLat,
            zoom: Math.max(mapInstance.getZoom(), 13),
            duration: 1000,
            essential: true
          });
        });
        
        // Change cursor on hover
        mapInstance.on('mouseenter', 'hexagons-fill', () => {
          mapInstance.getCanvas().style.cursor = 'pointer';
        });
        
        mapInstance.on('mouseleave', 'hexagons-fill', () => {
          mapInstance.getCanvas().style.cursor = '';
        });
        
        setLoading(false);
        
        toast.success(`Map data loaded successfully with ${processedGeoJSON.features.length} hexagons!`);
      });
      
      // Handle map load errors
      mapInstance.on('error', (e) => {
        console.error('Mapbox error:', e);
        if (onError) onError(`Mapbox error: ${e.error?.message || 'Unknown error'}`);
      });
      
    } catch (error: any) {
      console.error('Map initialization error:', error);
      const errorMsg = `Failed to initialize map: ${error.message || 'Unknown error'}`;
      toast.error(errorMsg);
      setLoading(false);
      if (onError) onError(errorMsg);
    }

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [token, mapStyle, geoJSONData, onError]);
  
  // Update visualization when metric changes
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || map.current.getSource('riyadh-hexagons') === undefined) return;
    
    try {
      const { metricStats: stats } = processGeoJSON(geoJSONData, metric);
      const colors = getColorScale(stats.min, stats.max, metric);
      
      setMetricStats(stats);
      setColorScale(colors);
      
      applyVisualization(stats, colors);
      
      toast.success(`Visualizing: ${getMetricLabel(metric)}`);
    } catch (error: any) {
      console.error('Error updating metric:', error);
      toast.error(`Error updating visualization: ${error.message || 'Unknown error'}`);
    }
  }, [metric, geoJSONData]);
  
  // Helper function to apply visualization based on metric
  const applyVisualization = (stats: any, colors: string[]) => {
    if (!map.current) return;
    
    let colorExpression;
    let heightExpression;
    
    if (metric.includes('conge') && stats.quantiles) {
      // Fix: Ensure quantiles are in strictly ascending order and unique for step expression
      let uniqueQuantiles = Array.from(new Set(stats.quantiles)).sort((a: number, b: number) => a - b);
      
      // Ensure the first value is greater than min (to avoid duplicate step values)
      if (uniqueQuantiles.length > 0 && uniqueQuantiles[0] <= stats.min) {
        uniqueQuantiles = uniqueQuantiles.filter((q: number) => q > stats.min);
      }
      
      // Ensure quantiles have at least a small difference between them
      const processedQuantiles: number[] = [];
      let prevValue = stats.min;
      
      for (const q of uniqueQuantiles) {
        // Add a small epsilon if the value is too close to previous
        if (q - prevValue < 0.001) {
          const adjustedValue = prevValue + 0.001;
          processedQuantiles.push(adjustedValue);
          prevValue = adjustedValue;
        } else {
          processedQuantiles.push(q);
          prevValue = q;
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
    
    if (map.current.getLayer('hexagons-fill')) {
      map.current.setPaintProperty('hexagons-fill', 'fill-extrusion-color', colorExpression);
      map.current.setPaintProperty('hexagons-fill', 'fill-extrusion-height', heightExpression);
    } else {
      // Add 3D hexagons layer if it doesn't exist
      map.current.addLayer({
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
  
  // Helper function to get label for a metric
  const getMetricLabel = (metricKey: string): string => {
    const labels: Record<string, string> = {
      'mean_speed': 'Average Speed (km/h)',
      'mean_conge': 'Congestion Level',
      'sum_vktkm': 'Total Vehicle Kilometers',
      'sum_urban_': 'Urban Road Length'
    };
    
    return labels[metricKey] || metricKey;
  };
  
  return {
    map,
    loading,
    metricStats,
    colorScale,
    getMetricLabel
  };
};
