
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { toast } from 'sonner';
import { processGeoJSON, getColorScale } from '@/lib/mapUtils';
import { validateMapboxToken } from '@/lib/mapUtils/validation';
import { applyVisualization, getMetricLabel } from '@/lib/mapUtils/visualization';
import { initializeMap, setupMapEventHandlers } from '@/lib/mapUtils/initialization';
import { addGeoJSONToMap } from '@/lib/mapUtils/geoJsonProcessing';

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
    
    console.log("Initializing Mapbox map");
    
    try {
      const { processedGeoJSON, metricStats: stats } = processGeoJSON(geoJSONData, metric);
      const colors = getColorScale(stats.min, stats.max, metric);
      
      setMetricStats(stats);
      setColorScale(colors);
      
      // Create the map instance
      map.current = initializeMap(mapContainer.current, mapStyle, token);
      
      const mapInstance = map.current;
      
      // When the map is loaded, add the data
      mapInstance.on('load', () => {
        console.log('Mapbox loaded successfully');
        
        // Add GeoJSON data to the map
        addGeoJSONToMap(mapInstance, processedGeoJSON);
        
        // Apply visualization based on the current metric
        applyVisualization(mapInstance, stats, colors, metric);
        
        // Setup map event handlers
        setupMapEventHandlers(mapInstance, onFeatureSelect);
        
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
      
      applyVisualization(map.current, stats, colors, metric);
      
      toast.success(`Visualizing: ${getMetricLabel(metric)}`);
    } catch (error: any) {
      console.error('Error updating metric:', error);
      toast.error(`Error updating visualization: ${error.message || 'Unknown error'}`);
    }
  }, [metric, geoJSONData]);
  
  return {
    map,
    loading,
    metricStats,
    colorScale,
    getMetricLabel
  };
};
