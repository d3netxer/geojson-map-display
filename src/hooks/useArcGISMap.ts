import { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { processGeoJSON } from '@/lib/mapUtils';

// ESRI imports
import Map from '@arcgis/core/Map';
import SceneView from '@arcgis/core/views/SceneView';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import esriConfig from '@arcgis/core/config';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import NavigationToggle from '@arcgis/core/widgets/NavigationToggle';
import Zoom from '@arcgis/core/widgets/Zoom';

interface UseArcGISMapProps {
  apiKey: string;
  geoJSONData: any;
  metric: string;
  mapStyle: string;
  onFeatureSelect: (feature: any) => void;
}

export const useArcGISMap = ({
  apiKey,
  geoJSONData,
  metric,
  mapStyle,
  onFeatureSelect
}: UseArcGISMapProps) => {
  const mapView = useRef<SceneView | null>(null);
  const mapInitialized = useRef<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [metricStats, setMetricStats] = useState<any>(null);
  const [colorScale, setColorScale] = useState<string[]>([]);

  const validateAPIKey = (token: string) => {
    if (!token || token.trim() === '') {
      toast({
        title: "API Key Error",
        description: "No API key provided",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!validateAPIKey(apiKey)) {
      setLoading(false);
      return;
    }

    // Configure ESRI API
    if (apiKey) {
      esriConfig.apiKey = apiKey;
    }
    
    // Only initialize the map once
    if (mapInitialized.current) {
      return;
    }
    
    console.log("Initializing ArcGIS map with basemap:", mapStyle);
    
    try {
      // Process the GeoJSON data for the selected metric
      const { processedGeoJSON, metricStats: stats } = processGeoJSON(geoJSONData, metric);
      
      // Get translucent light gray colors instead of the default colorful ones
      const baseColors = ['#F1F1F1', '#E0E0E0', '#C8C8C9', '#AAADB0', '#9F9EA1'];
      const translucentColors = baseColors.map(color => {
        // Add 60% opacity to all colors
        return color + '99';
      });
      
      console.log(`Initial visualization with translucent colors:`, translucentColors);
      
      setMetricStats(stats);
      setColorScale(translucentColors);

      // Create a new Map instance with a streets basemap
      const map = new Map({
        basemap: "streets" // This should ensure streets are visible
      });

      // Create a graphics layer to hold selected features
      const highlightLayer = new GraphicsLayer({
        title: "Selected Feature"
      });
      
      map.add(highlightLayer);
      
      // Create a GeoJSON layer from the blob
      const geojsonBlob = new Blob([JSON.stringify(processedGeoJSON)], { type: "application/json" });
      const geojsonUrl = URL.createObjectURL(geojsonBlob);
      
      // Create a GeoJSON layer with translucent hexagons
      const hexagonsLayer = new GeoJSONLayer({
        url: geojsonUrl,
        title: "Riyadh Hexagons",
        renderer: {
          type: "simple",
          symbol: {
            type: "polygon-3d",
            symbolLayers: [
              {
                type: "extrude",
                size: 350, // Default size (reduced height)
                material: { 
                  color: translucentColors[0],
                }
              }
            ]
          },
          // Fix TypeScript errors by using proper types for visual variables
          visualVariables: [
            {
              // Size visual variable - now varies with the data value
              type: "size",
              valueExpression: `$feature.${metric}`,
              valueUnit: "meters",
              minDataValue: stats.min,
              maxDataValue: stats.max,
              minSize: 200, // Smaller values get lower height
              maxSize: 1500  // Larger values get taller height
            } as any, // Type assertion to fix TypeScript error
            {
              // Color visual variable
              type: "color",
              valueExpression: `$feature.${metric}`,
              stops: [
                { value: stats.min, color: translucentColors[0] },
                { value: stats.min + (stats.range * 0.25), color: translucentColors[1] },
                { value: stats.min + (stats.range * 0.5), color: translucentColors[2] },
                { value: stats.min + (stats.range * 0.75), color: translucentColors[3] },
                { value: stats.max, color: translucentColors[4] }
              ]
            } as any // Type assertion to fix TypeScript error
          ]
        },
        opacity: 0.7, // Make the entire layer more translucent
        popupEnabled: false,
        outFields: ["*"]
      });
      
      map.add(hexagonsLayer);
      
      // Define target coordinates - explicit use of longitude and latitude
      const targetLongitude = 46.7319571; // Longitude
      const targetLatitude = 24.5979086;  // Latitude
      
      // Create a 3D SceneView with a 55-degree tilt view centered at the specific coordinates
      const view = new SceneView({
        container: null, // This will be set later when we have the DOM element
        map: map,
        center: [targetLongitude, targetLatitude], // Set center explicitly
        zoom: 12, // Set an appropriate zoom level
        camera: {
          position: {
            x: targetLongitude, // Longitude
            y: targetLatitude,  // Latitude
            z: 15000  // Lower altitude for better initial view
          },
          tilt: 55, // 55 degrees tilt
          heading: 0
        },
        // Force the view to start at our specified center
        viewpoint: {
          targetGeometry: {
            type: "point",
            x: targetLongitude,
            y: targetLatitude,
            spatialReference: { wkid: 4326 } // WGS84
          },
          scale: 50000 // Set an appropriate scale
        },
        environment: {
          lighting: {
            directShadowsEnabled: true,
            date: new Date()
          },
          starsEnabled: false,
          atmosphereEnabled: true
        } as any, // Type assertion to fix TypeScript error
        popup: {
          dockEnabled: true,
          dockOptions: {
            position: "top-right",
            breakpoint: false
          }
        },
        // Don't include UI components here, we'll add them manually
        ui: {
          components: [],
          padding: {
            bottom: 25,
            right: 25
          }
        }
      });
      
      mapView.current = view;
      mapInitialized.current = true;

      return () => {
        if (mapView.current) {
          mapView.current.destroy();
          mapInitialized.current = false;
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

  const initializeView = (mapContainer: HTMLDivElement) => {
    if (!mapView.current) return;
    
    // Set the container for the view
    mapView.current.container = mapContainer;
    
    // Add navigation controls when the view is ready
    mapView.current.when(() => {
      console.log('ArcGIS SceneView loaded successfully');
      console.log('Current basemap:', mapView.current?.map.basemap?.id);
      console.log('View center:', mapView.current?.center);
      console.log('Camera position:', mapView.current?.camera.position);
      
      if (!mapView.current) return;
      
      // Create custom zoom widget with improved visibility
      const zoom = new Zoom({
        view: mapView.current,
        layout: "vertical"
      });
      
      // Create compass widget with improved visibility
      const compass = new NavigationToggle({
        view: mapView.current
      });
      
      // Add widgets to bottom-right with clear spacing
      mapView.current.ui.add(zoom, "bottom-right");
      mapView.current.ui.add(compass, "bottom-right");
      
      // Force center the view at the target coordinates
      const targetLongitude = 46.7319571; // Longitude
      const targetLatitude = 24.5979086;  // Latitude
      
      mapView.current.goTo({
        center: [targetLongitude, targetLatitude],
        zoom: 12,
        tilt: 55
      }, {
        duration: 0 // No animation for initial centering
      }).catch((error) => {
        console.error("View navigation failed:", error);
      });
      
      // Improve visibility by adding CSS
      const widgetContainer = document.createElement('style');
      widgetContainer.textContent = `
        .esri-widget {
          background-color: rgba(255, 255, 255, 0.9) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
        }
        .esri-zoom .esri-widget--button {
          background-color: white !important;
          color: #333 !important;
          font-weight: bold !important;
        }
        .esri-navigation-toggle {
          background-color: white !important;
        }
        .esri-navigation-toggle__button {
          color: #333 !important;
        }
      `;
      document.head.appendChild(widgetContainer);
      
      setLoading(false);
      toast({
        title: "Map Centered",
        description: `Map centered at ${targetLatitude.toFixed(4)}, ${targetLongitude.toFixed(4)}`
      });
      toast({
        title: "Data Loaded",
        description: `Map data loaded with ${geoJSONData.features.length} hexagons!`
      });
      
      // Add click handler for features
      mapView.current.on("click", (event) => {
        mapView.current?.hitTest(event).then((response) => {
          const results = response.results;
          if (results.length > 0) {
            // Check if it's a feature from our layer
            const result = results.find((r: any) => {
              // We need to use type assertion here due to ESRI API typing issues
              return r.layer && r.layer.title === "Riyadh Hexagons";
            });
            
            if (result && result.layer) {
              // Use type assertion to access graphic property
              const feature = (result as any).graphic;
              if (feature && feature.attributes) {
                onFeatureSelect({
                  properties: feature.attributes
                });
                
                // Fly to the clicked location
                mapView.current?.goTo({
                  target: event.mapPoint,
                  tilt: 30, // Matching the view tilt
                  zoom: 14
                }, {
                  duration: 1000,
                  easing: "ease-out"
                });
              }
            }
          }
        });
      });
    });
  };

  // Update the visualization when metric changes, but keep the map visible
  useEffect(() => {
    if (!mapView.current || !mapView.current.ready) return;
    
    try {
      console.log(`Updating map visualization for metric: ${metric}`);
      const { metricStats: stats } = processGeoJSON(geoJSONData, metric);
      
      // Update colors based on the chosen metric
      let colors: string[];
      if (metric.includes('conge')) {
        colors = ['#E5F5E0', '#C0E5C8', '#86C49D', '#41A275', '#006C4A'];
      } else if (metric.includes('speed')) {
        colors = ['#FEE5D9', '#FCBBA1', '#FC9272', '#FB6A4A', '#DE2D26'];
      } else if (metric.includes('vktkm')) {
        colors = ['#F1EEF6', '#D4B9DA', '#C994C7', '#DF65B0', '#DD1C77'];
      } else {
        colors = ['#EDF8FB', '#B2E2E2', '#66C2A4', '#2CA25F', '#006D2C'];
      }
      
      console.log(`Color scheme for ${metric}:`, colors);
      
      setMetricStats(stats);
      setColorScale(colors);
      
      // First, preserve the current camera position before updating
      const currentCamera = mapView.current.camera.clone();
      
      // Update the layer renderer with new metric
      const hexLayer = mapView.current.map.layers.find(layer => layer.title === "Riyadh Hexagons") as GeoJSONLayer;
      
      if (hexLayer) {
        // Create a proper renderer object instead of directly modifying properties
        const renderer = hexLayer.renderer.clone();
        
        // Update the visual variables with proper types
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
            maxSize: 2500  // Increased maximum height for more dramatic effect
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
        
        // Update the renderer's visualVariables property
        (renderer as any).visualVariables = visualVariables;
        hexLayer.renderer = renderer;
        
        // Apply the renderer and refresh the layer
        hexLayer.refresh();
        
        // Restore the camera position after updating the renderer
        mapView.current.goTo(currentCamera, {
          duration: 0 // No animation to avoid flicker
        }).catch(error => {
          console.log("Camera position restore failed:", error);
          // Even if restoring fails, the map should still be visible
        });
      }
      
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

  const updateMapStyle = (style: string) => {
    if (!mapView.current || !mapView.current.ready) return;
    
    try {
      // Save camera position before changing basemap
      const currentCamera = mapView.current.camera.clone();
      
      // Update the basemap
      mapView.current.map.basemap = style;
      
      // Restore camera position after changing basemap
      setTimeout(() => {
        if (mapView.current) {
          mapView.current.goTo(currentCamera, {
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
