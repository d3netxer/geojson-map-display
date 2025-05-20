
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
  createGeoJSONLayer, 
  updateLayerVisualization 
} from '@/lib/arcgis/layers';

export const useArcGISMap = ({
  apiKey,
  geoJSONData,
  metric,
  mapStyle,
  onFeatureSelect
}: UseArcGISMapProps): UseArcGISMapReturn & { error: string | null } => {
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
  const [error, setError] = useState<string | null>(null);

  // Initialize the map
  useEffect(() => {
    if (!validateAPIKey(apiKey)) {
      setLoading(false);
      setError("Invalid or missing API key");
      return;
    }

    // Enhanced console log for debugging in production
    console.log(`Initializing ArcGIS with API key: ${apiKey ? `${apiKey.substring(0, 5)}...` : 'missing'}`);
    console.log(`Base path: ${window.location.origin}${window.location.pathname}`);
    
    // Configure ESRI API with enhanced error handling
    try {
      // Set ArcGIS assets path explicitly for GitHub Pages
      const isGitHubPages = window.location.hostname.includes('github.io');
      if (isGitHubPages) {
        // Explicitly set the assets path for GitHub Pages
        console.log("GitHub Pages environment detected, configuring ArcGIS paths");
        
        // Import path setting function dynamically to avoid reference errors
        import('@arcgis/core/config').then(esriConfig => {
          // Set the asset path to the correct GitHub Pages URL
          const basePath = `${window.location.origin}${window.location.pathname}`;
          esriConfig.default.assetsPath = `${basePath}assets`;
          console.log(`ArcGIS assets path set to: ${esriConfig.default.assetsPath}`);
        }).catch(err => {
          console.error("Failed to import esriConfig:", err);
          setError("Failed to configure ArcGIS paths");
        });
      }
      
      configureEsriAPI(apiKey);
    } catch (err) {
      console.error("Failed to configure ESRI API:", err);
      setLoading(false);
      setError("Failed to initialize ArcGIS - API configuration error");
      return;
    }
    
    // Only initialize the map once
    if (mapState.current.initialized) {
      return;
    }
    
    console.log("Initializing ArcGIS map with basemap:", mapStyle);
    
    try {
      // Process the GeoJSON data for the selected metric
      const { metricStats } = processGeoJSON(geoJSONData, metric);
      
      if (!metricStats) {
        throw new Error("Failed to process GeoJSON data");
      }
      
      // Get actual colors for the metric instead of initial translucent ones
      const colors = getColorScheme(metric);
      
      console.log(`Initial visualization with colors for ${metric}:`, colors);
      
      // Fix TS errors by ensuring we have a complete MapStats object
      const completeStats: MapStats = {
        min: metricStats.min || 0,
        max: metricStats.max || 1,
        mean: metricStats.mean,
        range: metricStats.range || 1,
        quantiles: metricStats.quantiles || []
      };
      
      setMetricStats(completeStats);
      setColorScale(colors);

      // Create a new Map instance
      const map = createMap(mapStyle);
      mapState.current.map = map;

      // Create a graphics layer for selections
      const highlightLayer = createGraphicsLayer("Selected Feature");
      mapState.current.highlightLayer = highlightLayer;
      map.add(highlightLayer);
      
      // Create the hexagons layer with actual colors
      const hexLayer = createGeoJSONLayer(geoJSONData, metric, completeStats, colors);
      mapState.current.hexLayer = hexLayer;
      map.add(hexLayer);
      
      // Create the SceneView
      const view = createMapView();
      view.map = map;
      mapState.current.view = view;
      
      // Mark as initialized
      mapState.current.initialized = true;
      
      // Clear any previous errors
      setError(null);

      return () => {
        if (mapState.current.view) {
          mapState.current.view.destroy();
          mapState.current.initialized = false;
        }
      };
    } catch (error: any) {
      console.error('Map initialization error:', error);
      setError(`Failed to initialize map: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  }, [apiKey, mapStyle]);

  // Initialize the view with a container
  const initializeView = (mapContainer: HTMLDivElement): void => {
    if (!mapState.current.view) {
      setError("Map view not initialized");
      return;
    }
    
    try {
      setupMapView(mapContainer, mapState.current, onFeatureSelect);
      setLoading(false);
      setError(null);
    } catch (err: any) {
      console.error("Error setting up map view:", err);
      setError(`Error setting up map view: ${err.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  // Update visualization when metric changes
  useEffect(() => {
    if (!mapState.current.view || !mapState.current.view.ready || !mapState.current.hexLayer) return;
    
    try {
      console.log(`Updating map visualization for metric: ${metric}`);
      const { metricStats } = processGeoJSON(geoJSONData, metric);
      
      if (!metricStats) {
        throw new Error("Failed to process GeoJSON data for metric update");
      }
      
      // Fix TS errors by ensuring we have a complete MapStats object
      const completeStats: MapStats = {
        min: metricStats.min || 0,
        max: metricStats.max || 1,
        mean: metricStats.mean,
        range: metricStats.range || 1,
        quantiles: metricStats.quantiles || []
      };
      
      // Get color scheme for the metric
      const colors = getColorScheme(metric);
      console.log(`Color scheme for ${metric}:`, colors);
      
      // Update state
      setMetricStats(completeStats);
      setColorScale(colors);
      
      // Save current camera position
      const currentCamera = mapState.current.view.camera.clone();
      
      // Update the layer visualization
      updateLayerVisualization(mapState.current.hexLayer, metric, completeStats, colors);
      
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
    } catch (error: any) {
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
    updateMapStyle,
    error
  };
};
