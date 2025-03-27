
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { ArrowDown, Layers, Maximize2, BarChart3, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { processGeoJSON, getColorScale } from '@/lib/mapUtils';

interface MapboxMapProps {
  apiKey?: string;
}

const riyadhGeoJSON = {
  "type": "FeatureCollection",
  "name": "super_selected_Riyadh_23_july30_hex_WGS84",
  "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  "features": [
    // GeoJSON features... (truncated for brevity)
  ]
};

const MapboxMap: React.FC<MapboxMapProps> = ({ apiKey }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<string>('mean_speed');
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/mapbox/light-v11');
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  
  // Default API key if none provided
  const token = apiKey || 'pk.eyJ1IjoibG92YWJsZS1haSIsImEiOiJjbHluMnZxdm0wZmdiMnFueGczZmdlYXBhIn0.a-hQZCN9R2WO2td8IZxJ9A';

  useEffect(() => {
    if (!mapContainer.current) return;
    
    // Set mapbox token
    mapboxgl.accessToken = token;
    
    // Process GeoJSON data
    const { processedGeoJSON, metricStats } = processGeoJSON(riyadhGeoJSON, metric);
    const colorScale = getColorScale(metricStats.min, metricStats.max);
    
    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [46.75, 24.68], // Center on Riyadh
      zoom: 12,
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
      // Add the GeoJSON source
      mapInstance.addSource('riyadh-hexagons', {
        type: 'geojson',
        data: processedGeoJSON,
      });
      
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
            metricStats.min, colorScale[0],
            metricStats.min + (metricStats.range * 0.25), colorScale[1],
            metricStats.min + (metricStats.range * 0.5), colorScale[2],
            metricStats.min + (metricStats.range * 0.75), colorScale[3],
            metricStats.max, colorScale[4],
          ],
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['get', metric],
            metricStats.min, 0,
            metricStats.max, 500
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
    });
    
    // Handle errors
    mapInstance.on('error', (e) => {
      console.error('Mapbox error:', e);
      toast.error('Error loading map. Please try again later.');
      setLoading(false);
    });
    
    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [token, mapStyle, metric]);
  
  // Update the metric when it changes
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    
    // Process GeoJSON data for the new metric
    const { metricStats } = processGeoJSON(riyadhGeoJSON, metric);
    const colorScale = getColorScale(metricStats.min, metricStats.max);
    
    // Update layer styles
    if (map.current.getLayer('hexagons-fill')) {
      map.current.setPaintProperty('hexagons-fill', 'fill-extrusion-color', [
        'interpolate',
        ['linear'],
        ['get', metric],
        metricStats.min, colorScale[0],
        metricStats.min + (metricStats.range * 0.25), colorScale[1],
        metricStats.min + (metricStats.range * 0.5), colorScale[2],
        metricStats.min + (metricStats.range * 0.75), colorScale[3],
        metricStats.max, colorScale[4],
      ]);
      
      map.current.setPaintProperty('hexagons-fill', 'fill-extrusion-height', [
        'interpolate',
        ['linear'],
        ['get', metric],
        metricStats.min, 0,
        metricStats.max, 500
      ]);
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
    toast.success(`Visualizing: ${getMetricLabel(newMetric)}`);
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
          Visualization of traffic metrics across Riyadh's hexagonal grid cells
        </p>
        <Separator className="my-3" />
        <div className="info-row">
          <span className="info-label">Current Metric</span>
          <span className="info-value">{getMetricLabel(metric)}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Grid Cells</span>
          <span className="info-value">{riyadhGeoJSON.features.length}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Area Coverage</span>
          <span className="info-value">Central Riyadh</span>
        </div>
      </div>
      
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
