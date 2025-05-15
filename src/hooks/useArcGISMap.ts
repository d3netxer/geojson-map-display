
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { processGeoJSON } from '@/lib/mapUtils';

// Import our new modular files
import { 
  UseArcGISMapProps, 
  MapViewState, 
  MapStats, 
  UseArcGISMapReturn 
} from '@/lib/arcgis/types';
import { 
  validateAPIKey, 
  configureEsriAPI, 
  createMap, 
  createMapView, 
  createGraphicsLayer, 
  setupMapView 
} from '@/lib/arcgis/initMap';
import { 
  getColorScheme, 
  getInitialColorScheme, 
  createGeoJSONLayer, 
  updateLayerVisualization 
} from '@/lib/arcgis/layers';

export const useArcGISMap = ({
  apiKey,
  geoJSONData,
  metric,
  mapStyle,
  onFeatureSelect
}: UseArcGISMapProps): UseArcGISMapReturn => {
  const mapState = useRef<MapViewState>({
    view: null,
    map: null,
    hexLayer: null,
    highlightLayer: null,
    initialized: false
  });
  
  const [loading, setLoading] = useState(true);
  const [metricStats, setMetricStats] = useState<MapStats | null>(null);
  const [colorScale, setColorScale] = useState<string[]>([]);

  // Initialize the map
  useEffect(() => {
    if (!validateAPIKey(apiKey)) {
      setLoading(false);
      return;
    }

    // Configure ESRI API
    configureEsriAPI(apiKey);
    
    // Only initialize the map once
    if (mapState.current.initialized) {
      return;
    }
    
    console.log("Initializing ArcGIS map with basemap:", mapStyle);
    
    try {
      // Process the GeoJSON data for the selected metric
      const { metricStats: stats } = processGeoJSON(geoJSONData, metric);
      
      // Get initial colors
      const initialColors = getInitialColorScheme();
      
      console.log(`Initial visualization with translucent colors:`, initialColors);
      
      setMetricStats(stats);
      setColorScale(initialColors);

      // Create a new Map instance
      const map = createMap(mapStyle);
      mapState.current.map = map;

      // Create a graphics layer for selections
      const highlightLayer = createGraphicsLayer("Selected Feature");
      mapState.current.highlightLayer = highlightLayer;
      map.add(highlightLayer);
      
      // Create the hexagons layer
      const hexLayer = createGeoJSONLayer(geoJSONData, metric, stats, initialColors);
      mapState.current.hexLayer = hexLayer;
      map.add(hexLayer);
      
      // Create the SceneView
      const view = createMapView();
      view.map = map;
      mapState.current.view = view;
      
      // Mark as initialized
      mapState.current.initialized = true;

      return () => {
        if (mapState.current.view) {
          mapState.current.view.destroy();
          mapState.current.initialized = false;
        }
      };
    } catch (error) {
      console.error('Map initialization error:', error);
      toast({
        title: "Map Error",
        description: "Failed to initialize map. Check your API key and network connection.",
        variant: "destructive"
      });
      setLoading(false);
    }
  }, [apiKey, mapStyle]);

  // Initialize the view with a container
  const initializeView = (mapContainer: HTMLDivElement): void => {
    if (!mapState.current.view) return;
    
    setupMapView(mapContainer, mapState.current, onFeatureSelect);
    setLoading(false);
  };

  // Update visualization when metric changes
  useEffect(() => {
    if (!mapState.current.view || !mapState.current.view.ready || !mapState.current.hexLayer) return;
    
    try {
      console.log(`Updating map visualization for metric: ${metric}`);
      const { metricStats: stats } = processGeoJSON(geoJSONData, metric);
      
      // Get color scheme for the metric
      const colors = getColorScheme(metric);
      console.log(`Color scheme for ${metric}:`, colors);
      
      // Update state
      setMetricStats(stats);
      setColorScale(colors);
      
      // Save current camera position
      const currentCamera = mapState.current.view.camera.clone();
      
      // Update the layer visualization
      updateLayerVisualization(mapState.current.hexLayer, metric, stats, colors);
      
      // Restore camera position
      mapState.current.view.goTo(currentCamera, {
        duration: 0
      }).catch(error => {
        console.log("Camera position restore failed:", error);
      });
      
      toast({
        title: "Metric Updated",
        description: `Visualizing: ${metric}`
      });
    } catch (error) {
      console.error('Error updating metric:', error);
      toast({
        title: "Update Error",
        description: "There was an error updating the visualization.",
        variant: "destructive"
      });
    }
  }, [metric, geoJSONData]);

  // Update map style/basemap
  const updateMapStyle = (style: string): void => {
    if (!mapState.current.view || !mapState.current.view.ready || !mapState.current.map) return;
    
    try {
      // Save camera position
      const currentCamera = mapState.current.view.camera.clone();
      
      // Update the basemap
      mapState.current.map.basemap = style;
      
      // Restore camera position
      setTimeout(() => {
        if (mapState.current.view) {
          mapState.current.view.goTo(currentCamera, {
            duration: 0
          }).catch(error => {
            console.log("Camera position restore failed after style change:", error);
          });
        }
      }, 100);
    } catch (error) {
      console.error('Error updating map style:', error);
    }
  };

  return {
    loading,
    metricStats,
    colorScale,
    initializeView,
    updateMapStyle
  };
};
