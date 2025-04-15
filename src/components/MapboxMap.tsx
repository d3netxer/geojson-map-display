
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { ArrowDown, Layers, Maximize2, BarChart3, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { processGeoJSON, getColorScale, formatValue } from '@/lib/mapUtils';
import MapLegend from './MapLegend';
import GeoJSONFileSelector from './GeoJSONFileSelector';

interface MapboxMapProps {
  apiKey?: string;
  geoJSONData: any;
  onGeoJSONChange: (newGeoJSON: any) => void;
}

const MapboxMap: React.FC<MapboxMapProps> = ({ apiKey, geoJSONData, onGeoJSONChange }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<string>('mean_speed');
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/mapbox/light-v11');
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [metricStats, setMetricStats] = useState<any>(null);
  const [colorScale, setColorScale] = useState<string[]>([]);
  
  // Validate Mapbox token
  const validateMapboxToken = (token: string) => {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      toast.error('Invalid Mapbox token format');
      return false;
    }
    return true;
  };

  // Use the provided api key, with fallback
  const token = apiKey || 'pk.eyJ1IjoidGdlcnRpbiIsImEiOiJYTW5sTVhRIn0.X4B5APkxkWVaiSg3KqMCaQ';

  useEffect(() => {
    if (!mapContainer.current) return;
    
    // Validate token before initializing
    if (!validateMapboxToken(token)) {
      toast.error('Please provide a valid Mapbox access token');
      setLoading(false);
      return;
    }
    
    // Set mapbox token
    mapboxgl.accessToken = token;
    
    console.log("Initializing map with token:", token);
    
    try {
      // Process GeoJSON data
      const { processedGeoJSON, metricStats: stats } = processGeoJSON(geoJSONData, metric);
      const colors = getColorScale(stats.min, stats.max);
      
      // Store stats and colors for the legend
      setMetricStats(stats);
      setColorScale(colors);
      
      // Initialize map with Riyadh coordinates (center of Saudi Arabia)
      // Updated to use WGS84 coordinates for Riyadh
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [46.67, 24.71], // Riyadh WGS84 coordinates
        zoom: 11,
        minZoom: 10,
        maxZoom: 16,
        attributionControl: false,
        pitch: 45, // Add a slight tilt for a 3D effect
      });
      
      const mapInstance = map.current;
      
      // Add navigation controls
      mapInstance.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'bottom-right'
      );
      
      // Add attribution control in a more minimalist position
      mapInstance.addControl(new mapboxgl.AttributionControl({
        compact: true
      }), 'bottom-left');
      
      // Loading events
      mapInstance.on('load', () => {
        console.log('Map loaded successfully');
        
        // Add the GeoJSON source
        mapInstance.addSource('riyadh-hexagons', {
          type: 'geojson',
          data: processedGeoJSON,
        });
        
        console.log('Adding hexagon layers with features count:', processedGeoJSON.features.length);
        
        // Convert MultiPolygon to Polygon for better rendering
        const features = processedGeoJSON.features.map((feature: any) => {
          const newFeature = { ...feature };
          if (feature.geometry.type === 'MultiPolygon') {
            newFeature.geometry = {
              type: 'Polygon',
              coordinates: feature.geometry.coordinates[0]
            };
          }
          return newFeature;
        });
        
        // Update the source with converted features
        mapInstance.getSource('riyadh-hexagons').setData({
          type: 'FeatureCollection',
          features: features
        });
        
        console.log('Converted features for rendering:', features.length);
        
        // Add 3D hexagon layer
        mapInstance.addLayer({
          id: 'hexagons-fill',
          type: 'fill-extrusion',
          source: 'riyadh-hexagons',
          paint: {
            'fill-extrusion-color': [
              'interpolate',
              ['linear'],
              ['get', metric],
              stats.min, colors[0],
              stats.min + (stats.range * 0.25), colors[1],
              stats.min + (stats.range * 0.5), colors[2],
              stats.min + (stats.range * 0.75), colors[3],
              stats.max, colors[4],
            ],
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['get', metric],
              stats.min, 500,  // Increased minimum height for better visibility
              stats.max, 2000  // Increased maximum height for better visualization
            ],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.8,
          }
        });
        
        // Add outline layer
        mapInstance.addLayer({
          id: 'hexagons-outline',
          type: 'line',
          source: 'riyadh-hexagons',
          paint: {
            'line-color': 'rgba(255, 255, 255, 0.5)',
            'line-width': 1,
          }
        });
        
        // Click event to get hexagon info
        mapInstance.on('click', 'hexagons-fill', (e) => {
          if (!e.features || e.features.length === 0) return;
          
          const feature = e.features[0];
          setSelectedFeature(feature);
          
          // Create popup at click point
          const coordinates = e.lngLat;
          
          // Fly to the clicked hexagon
          mapInstance.flyTo({
            center: coordinates,
            zoom: Math.max(mapInstance.getZoom(), 13.5),
            duration: 1000,
            essential: true
          });
          
          toast.success(`Selected Grid ${feature.properties.GRID_ID}`);
        });
        
        // Change cursor on hover
        mapInstance.on('mouseenter', 'hexagons-fill', () => {
          mapInstance.getCanvas().style.cursor = 'pointer';
        });
        
        mapInstance.on('mouseleave', 'hexagons-fill', () => {
          mapInstance.getCanvas().style.cursor = '';
        });
        
        // Hide loading indicator
        setLoading(false);
        
        // Show success toast when map is loaded
        toast.success(`Map data loaded successfully with ${processedGeoJSON.features.length} hexagons!`);
      });
      
    } catch (error) {
      console.error('Map initialization error:', error);
      toast.error('Failed to initialize map. Check your Mapbox token and network connection.');
      setLoading(false);
    }

    // Clean up on unmount
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [token, mapStyle, geoJSONData, metric]);
  
  // Update the metric when it changes
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || !map.current.getLayer('hexagons-fill')) return;
    
    try {
      // Process GeoJSON data for the new metric
      const { metricStats: stats } = processGeoJSON(geoJSONData, metric);
      const colors = getColorScale(stats.min, stats.max, metric);
      
      // Update stats and colors for the legend
      setMetricStats(stats);
      setColorScale(colors);
      
      // Update layer styles
      map.current.setPaintProperty('hexagons-fill', 'fill-extrusion-color', [
        'interpolate',
        ['linear'],
        ['get', metric],
        stats.min, colors[0],
        stats.min + (stats.range * 0.25), colors[1],
        stats.min + (stats.range * 0.5), colors[2],
        stats.min + (stats.range * 0.75), colors[3],
        stats.max, colors[4],
      ]);
      
      map.current.setPaintProperty('hexagons-fill', 'fill-extrusion-height', [
        'interpolate',
        ['linear'],
        ['get', metric],
        stats.min, 500,
        stats.max, 2000
      ]);
      
      toast.success(`Visualizing: ${getMetricLabel(metric)}`);
    } catch (error) {
      console.error('Error updating metric:', error);
    }
  }, [metric]);
  
  // Handle fullscreen toggle
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
  
  // Handle metric change
  const handleMetricChange = (newMetric: string) => {
    setMetric(newMetric);
  };
  
  // Get human-readable metric label
  const getMetricLabel = (metricKey: string): string => {
    const labels: Record<string, string> = {
      'mean_speed': 'Average Speed (km/h)',
      'mean_conge': 'Congestion Level',
      'sum_vktkm': 'Total Vehicle Kilometers',
      'sum_urban_': 'Urban Road Length',
      'mean_segme': 'Average Segment Length'
    };
    
    return labels[metricKey] || metricKey;
  };
  
  // Toggle map style
  const toggleMapStyle = () => {
    const styles = [
      'mapbox://styles/mapbox/light-v11',
      'mapbox://styles/mapbox/dark-v11',
      'mapbox://styles/mapbox/streets-v12',
      'mapbox://styles/mapbox/satellite-streets-v12'
    ];
    
    const currentIndex = styles.indexOf(mapStyle);
    const nextIndex = (currentIndex + 1) % styles.length;
    setMapStyle(styles[nextIndex]);
    
    const styleNames = ['Light', 'Dark', 'Streets', 'Satellite'];
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
      
      {/* Title Overlay */}
      <div className="map-overlay">
        <div className="chip mb-2">Traffic Analysis</div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Riyadh Hexagonal Grid Analysis</h1>
        <p className="text-muted-foreground text-sm mb-4">
          Visualization of traffic metrics across {geoJSONData.features.length} hexagonal grid cells
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
      
      {/* Legend Component */}
      {metricStats && colorScale.length > 0 && (
        <MapLegend 
          title={`${getMetricLabel(metric)}`}
          min={metricStats.min}
          max={metricStats.max}
          colorScale={colorScale}
          metric={metric}
        />
      )}
      
      {/* Map Controls */}
      <div className="map-control">
        <Button 
          variant="secondary" 
          size="sm" 
          className="flex items-center justify-between gap-2 w-full" 
          onClick={toggleMapStyle}
        >
          <Layers size={16} />
          <span>Change Style</span>
        </Button>
        
        <GeoJSONFileSelector
          onFileLoaded={onGeoJSONChange}
          defaultGeoJSON={geoJSONData}
        />
        
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
                className="w-full justify-start mb-1" 
                size="sm"
                onClick={() => handleMetricChange('sum_urban_')}
              >
                Urban Road Length
              </Button>
              <Button 
                variant={metric === 'mean_segme' ? 'default' : 'ghost'} 
                className="w-full justify-start" 
                size="sm"
                onClick={() => handleMetricChange('mean_segme')}
              >
                Segment Length
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
                  
                  <div className="font-medium">Avg Segment Length:</div>
                  <div className="text-right">{selectedFeature.properties.mean_segme.toFixed(1)} m</div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};

export default MapboxMap;
