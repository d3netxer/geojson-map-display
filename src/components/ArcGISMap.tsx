import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, Layers, Maximize2, BarChart3, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { processGeoJSON, getColorScale, formatValue, getHeightMultiplier } from '@/lib/mapUtils';
import MapLegend from './MapLegend';

// ESRI imports
import Map from '@arcgis/core/Map';
import SceneView from '@arcgis/core/views/SceneView';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import esriConfig from '@arcgis/core/config';
import { SimpleRenderer } from '@arcgis/core/renderers';
import { ExtrudeSymbol3DLayer, PolygonSymbol3D } from '@arcgis/core/symbols';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Color from '@arcgis/core/Color';

// Import ESRI CSS
import '@arcgis/core/assets/esri/themes/light/main.css';

interface ArcGISMapProps {
  apiKey?: string;
  geoJSONData: any;
}

const ArcGISMap: React.FC<ArcGISMapProps> = ({ apiKey, geoJSONData }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapView = useRef<SceneView | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<string>('mean_speed');
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState<string>('streets');
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [metricStats, setMetricStats] = useState<any>(null);
  const [colorScale, setColorScale] = useState<string[]>([]);
  
  const validateAPIKey = (token: string) => {
    if (!token || token.trim() === '') {
      toast.error('No API key provided');
      return false;
    }
    return true;
  };

  const token = apiKey || '';

  useEffect(() => {
    if (!mapContainer.current) return;
    
    if (token && !validateAPIKey(token)) {
      setLoading(false);
      return;
    }
    
    // Configure ESRI API
    if (token) {
      esriConfig.apiKey = token;
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
                  // Use transparency (0-1) instead of opacity
                  transparency: 0.4 
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
      
      // Create a 3D SceneView with a more top-down view to better see street names
      const view = new SceneView({
        container: mapContainer.current,
        map: map,
        camera: {
          position: {
            x: 46.67,
            y: 24.71,
            z: 20000  // Reduced altitude to see street basemap better
          },
          tilt: 15, // Less tilt to see more of the map from above
          heading: 0
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
        ui: {
          components: ["zoom", "compass", "attribution"]
        }
      });
      
      // Fix to ensure basemap is loaded first before adding layers
      view.when(() => {
        console.log('ArcGIS SceneView loaded successfully');
        console.log('Current basemap:', map.basemap?.id);
        
        // Force basemap refresh if needed
        map.basemap = map.basemap;
        
        setLoading(false);
        toast.success(`Map data loaded successfully with ${processedGeoJSON.features.length} hexagons!`);
      });
      
      mapView.current = view;
      
      // Fix the TypeScript error in the click handler
      view.on("click", (event) => {
        view.hitTest(event).then((response) => {
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
                setSelectedFeature({
                  properties: feature.attributes
                });
                
                // Fly to the clicked location
                view.goTo({
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

    } catch (error) {
      console.error('Map initialization error:', error);
      toast.error('Failed to initialize map. Check your API key and network connection.');
      setLoading(false);
    }

    return () => {
      if (mapView.current) {
        mapView.current.destroy();
      }
    };
  }, [token, mapStyle, geoJSONData]);
  
  useEffect(() => {
    if (!mapView.current || !mapView.current.ready) return;
    
    try {
      const { metricStats: stats } = processGeoJSON(geoJSONData, metric);
      const colors = getColorScale(stats.min, stats.max, metric);
      
      console.log(`Updating visualization for ${metric} with colors:`, colors);
      
      setMetricStats(stats);
      setColorScale(colors);
      
      // Update the layer renderer with new metric
      const hexLayer = mapView.current.map.layers.find(layer => layer.title === "Riyadh Hexagons") as GeoJSONLayer;
      
      if (hexLayer) {
        let visualVariables = [];
        
        if (metric.includes('conge') && stats.quantiles) {
          // Use steps for congestion
          visualVariables = [
            {
              type: "size",
              stops: [
                { value: stats.quantiles[0], size: 500 },
                { value: stats.quantiles[1], size: 1000 },
                { value: stats.quantiles[2], size: 1500 },
                { value: stats.quantiles[3], size: 2000 },
                { value: stats.quantiles[4], size: 2500 }
              ]
            },
            {
              type: "color",
              stops: [
                { value: stats.quantiles[0], color: colors[0] },
                { value: stats.quantiles[1], color: colors[1] },
                { value: stats.quantiles[2], color: colors[2] },
                { value: stats.quantiles[3], color: colors[3] },
                { value: stats.quantiles[4], color: colors[4] }
              ]
            }
          ];
        } else {
          // Use interpolation for other metrics
          visualVariables = [
            {
              type: "size",
              field: metric,
              valueExpression: `$feature.${metric}`,
              valueUnit: "meters",
              minDataValue: stats.min,
              maxDataValue: stats.max,
              minSize: 500,
              maxSize: 2500  // Increased maximum height for more dramatic effect
            },
            {
              type: "color",
              field: metric,
              valueExpression: `$feature.${metric}`,
              stops: [
                { value: stats.min, color: colors[0] },
                { value: stats.min + (stats.range * 0.25), color: colors[1] },
                { value: stats.min + (stats.range * 0.5), color: colors[2] },
                { value: stats.min + (stats.range * 0.75), color: colors[3] },
                { value: stats.max, color: colors[4] }
              ]
            }
          ];
        }
        
        // Update the renderer
        const renderer = hexLayer.renderer as SimpleRenderer;
        renderer.visualVariables = visualVariables;
        
        // Refresh the layer
        hexLayer.refresh();
      }
      
      toast.success(`Visualizing: ${getMetricLabel(metric)}`);
    } catch (error) {
      console.error('Error updating metric:', error);
    }
  }, [metric]);
  
  useEffect(() => {
    if (!mapContainer.current) return;
    
    if (fullscreen) {
      mapContainer.current.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
        setFullscreen(false);
      });
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  }, [fullscreen]);
  
  // Update basemap when the map style changes
  useEffect(() => {
    if (!mapView.current || !mapView.current.ready) return;
    mapView.current.map.basemap = mapStyle;
  }, [mapStyle]);
  
  const handleMetricChange = (newMetric: string) => {
    setMetric(newMetric);
  };
  
  const getMetricLabel = (metricKey: string): string => {
    const labels: Record<string, string> = {
      'mean_speed': 'Average Speed (km/h)',
      'mean_conge': 'Congestion Level',
      'sum_vktkm': 'Total Vehicle Kilometers',
      'sum_urban_': 'Urban Road Length'
    };
    
    return labels[metricKey] || metricKey;
  };
  
  const toggleMapStyle = () => {
    // Include styles that emphasize street names
    const styles = [
      'streets',
      'streets-night',
      'streets-navigation',
      'osm'
    ];
    
    const currentIndex = styles.indexOf(mapStyle);
    const nextIndex = (currentIndex + 1) % styles.length;
    setMapStyle(styles[nextIndex]);
    
    const styleNames = ['Streets', 'Streets Night', 'Navigation', 'OpenStreetMap'];
    toast.success(`Map style changed to ${styleNames[nextIndex]}`);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p className="mt-4 text-muted-foreground animate-pulse">Loading map visualization...</p>
        </div>
      )}
      
      <div ref={mapContainer} className="map-container" />
      
      <div className="map-overlay glass-card bg-white/80">
        <div className="chip mb-2">Traffic Analysis</div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Riyadh Hexagonal Analysis</h1>
        <p className="text-muted-foreground text-sm mb-4">
          Traffic metrics across {geoJSONData.features.length} hexagonal cells
        </p>
        <Separator className="my-3" />
        <div className="info-row">
          <span className="info-label">Current Metric</span>
          <span className="info-value">{getMetricLabel(metric)}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Grid Cells</span>
          <span className="info-value">{geoJSONData.features.length}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Area Coverage</span>
          <span className="info-value">Central Riyadh</span>
        </div>
      </div>
      
      {metricStats && colorScale.length > 0 && (
        <MapLegend 
          title={`${getMetricLabel(metric)}`}
          min={metricStats.min}
          max={metricStats.max}
          colorScale={colorScale}
          metric={metric}
          quantiles={metricStats.quantiles}
        />
      )}
      
      <div className="map-control glass-card bg-white/80">
        <Button 
          variant="secondary" 
          size="sm" 
          className="flex items-center justify-between gap-2 w-full" 
          onClick={toggleMapStyle}
        >
          <Layers size={16} />
          <span>Change Style</span>
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="secondary" 
              size="sm" 
              className="flex items-center justify-between gap-2 w-full"
            >
              <BarChart3 size={16} />
              <span>Select Metric</span>
              <ArrowDown size={14} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="end">
            <div className="p-2">
              <Button 
                variant={metric === 'mean_speed' ? 'default' : 'ghost'} 
                className="w-full justify-start mb-1" 
                size="sm"
                onClick={() => handleMetricChange('mean_speed')}
              >
                Average Speed
              </Button>
              <Button 
                variant={metric === 'mean_conge' ? 'default' : 'ghost'} 
                className="w-full justify-start mb-1" 
                size="sm"
                onClick={() => handleMetricChange('mean_conge')}
              >
                Congestion Level
              </Button>
              <Button 
                variant={metric === 'sum_vktkm' ? 'default' : 'ghost'} 
                className="w-full justify-start mb-1" 
                size="sm"
                onClick={() => handleMetricChange('sum_vktkm')}
              >
                Vehicle Kilometers
              </Button>
              <Button 
                variant={metric === 'sum_urban_' ? 'default' : 'ghost'} 
                className="w-full justify-start" 
                size="sm"
                onClick={() => handleMetricChange('sum_urban_')}
              >
                Urban Road Length
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        
        <Button 
          variant="secondary" 
          size="sm" 
          className="flex items-center justify-between gap-2 w-full"
          onClick={() => setFullscreen(!fullscreen)}
        >
          <Maximize2 size={16} />
          <span>{fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </Button>
        
        {selectedFeature && (
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="secondary" 
                size="sm" 
                className="flex items-center justify-between gap-2 w-full"
              >
                <Info size={16} />
                <span>Grid {selectedFeature.properties.GRID_ID}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-2">
                <h3 className="font-semibold">Hexagon Grid {selectedFeature.properties.GRID_ID}</h3>
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Average Speed:</div>
                  <div className="text-right">{selectedFeature.properties.mean_speed.toFixed(1)} km/h</div>
                  
                  <div className="font-medium">Congestion Level:</div>
                  <div className="text-right">{selectedFeature.properties.mean_conge.toFixed(2)}</div>
                  
                  <div className="font-medium">Vehicle Kilometers:</div>
                  <div className="text-right">{selectedFeature.properties.sum_vktkm.toFixed(0)} km</div>
                  
                  <div className="font-medium">Urban Road Length:</div>
                  <div className="text-right">{selectedFeature.properties.sum_urban_.toFixed(0)} m</div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};

export default ArcGISMap;
