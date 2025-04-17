
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { ArrowDown, Layers, Maximize2, BarChart3, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { processGeoJSON, getColorScale, formatValue, getHeightMultiplier } from '@/lib/mapUtils';
import MapLegend from './MapLegend';

interface MapboxMapProps {
  apiKey?: string;
  geoJSONData: any;
}

const MapboxMap: React.FC<MapboxMapProps> = ({ apiKey, geoJSONData }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<string>('mean_speed');
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/mapbox/light-v11');
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [metricStats, setMetricStats] = useState<any>(null);
  const [colorScale, setColorScale] = useState<string[]>([]);
  
  const validateMapboxToken = (token: string) => {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      toast.error('Invalid Mapbox token format');
      return false;
    }
    return true;
  };

  const token = apiKey || 'pk.eyJ1IjoidGdlcnRpbiIsImEiOiJYTW5sTVhRIn0.X4B5APkxkWVaiSg3KqMCaQ';

  useEffect(() => {
    if (!mapContainer.current) return;
    
    if (!validateMapboxToken(token)) {
      toast.error('Please provide a valid Mapbox access token');
      setLoading(false);
      return;
    }
    
    mapboxgl.accessToken = token;
    
    console.log("Initializing map with token:", token);
    
    try {
      const { processedGeoJSON, metricStats: stats } = processGeoJSON(geoJSONData, metric);
      const colors = getColorScale(stats.min, stats.max, metric);
      
      console.log(`Initial visualization for ${metric} with colors:`, colors);
      
      setMetricStats(stats);
      setColorScale(colors);
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [46.67, 24.71],
        zoom: 11,
        minZoom: 10,
        maxZoom: 16,
        attributionControl: false,
        pitch: 45,
      });
      
      const mapInstance = map.current;
      
      mapInstance.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'bottom-right'
      );
      
      mapInstance.addControl(new mapboxgl.AttributionControl({
        compact: true
      }), 'bottom-left');
      
      mapInstance.on('load', () => {
        console.log('Map loaded successfully');
        
        mapInstance.addSource('riyadh-hexagons', {
          type: 'geojson',
          data: processedGeoJSON,
        });
        
        console.log('Adding hexagon layers with features count:', processedGeoJSON.features.length);
        
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
        
        mapInstance.getSource('riyadh-hexagons').setData({
          type: 'FeatureCollection',
          features: features
        });
        
        console.log('Converted features for rendering:', features.length);
        
        let colorExpression;
        let heightExpression;
        
        if (metric.includes('conge') && stats.quantiles) {
          colorExpression = [
            'step',
            ['get', metric],
            colors[0],
            stats.quantiles[1], colors[1],
            stats.quantiles[2], colors[2],
            stats.quantiles[3], colors[3],
            stats.quantiles[4], colors[4]
          ];
          
          heightExpression = [
            'step',
            ['get', metric],
            500,
            stats.quantiles[1], 800,
            stats.quantiles[2], 1200,
            stats.quantiles[3], 1600,
            stats.quantiles[4], 2000
          ];
          
          console.log('Using quantile classification for congestion with breaks:', stats.quantiles);
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
        
        // Add the 3D fill extrusion layer for the hexagons
        mapInstance.addLayer({
          id: 'hexagons-fill',
          type: 'fill-extrusion',
          source: 'riyadh-hexagons',
          paint: {
            'fill-extrusion-color': colorExpression,
            'fill-extrusion-height': heightExpression,
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.8,
          }
        });
        
        // Add a separate outline layer for the hexagon boundaries that sits at ground level
        // This ensures the outlines match the hexagon base footprint
        mapInstance.addLayer({
          id: 'hexagons-outline',
          type: 'line',
          source: 'riyadh-hexagons',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': 'rgba(255, 255, 255, 0.7)',
            'line-width': 1.5,
            'line-opacity': 0.8
          }
        });
        
        mapInstance.on('click', 'hexagons-fill', (e) => {
          if (!e.features || e.features.length === 0) return;
          
          const feature = e.features[0];
          setSelectedFeature(feature);
          
          const coordinates = e.lngLat;
          
          mapInstance.flyTo({
            center: coordinates,
            zoom: Math.max(mapInstance.getZoom(), 13.5),
            duration: 1000,
            essential: true
          });
        });
        
        mapInstance.on('mouseenter', 'hexagons-fill', () => {
          mapInstance.getCanvas().style.cursor = 'pointer';
        });
        
        mapInstance.on('mouseleave', 'hexagons-fill', () => {
          mapInstance.getCanvas().style.cursor = '';
        });
        
        setLoading(false);
        
        toast.success(`Map data loaded successfully with ${processedGeoJSON.features.length} hexagons!`);
      });
      
    } catch (error) {
      console.error('Map initialization error:', error);
      toast.error('Failed to initialize map. Check your Mapbox token and network connection.');
      setLoading(false);
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [token, mapStyle, geoJSONData, metric]);
  
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || !map.current.getLayer('hexagons-fill')) return;
    
    try {
      const { metricStats: stats } = processGeoJSON(geoJSONData, metric);
      const colors = getColorScale(stats.min, stats.max, metric);
      
      console.log(`Updating visualization for ${metric} with colors:`, colors);
      
      setMetricStats(stats);
      setColorScale(colors);
      
      let colorExpression;
      let heightExpression;
      
      if (metric.includes('conge') && stats.quantiles) {
        colorExpression = [
          'step',
          ['get', metric],
          colors[0],
          stats.quantiles[1], colors[1],
          stats.quantiles[2], colors[2],
          stats.quantiles[3], colors[3],
          stats.quantiles[4], colors[4]
        ];
        
        heightExpression = [
          'step',
          ['get', metric],
          500,
          stats.quantiles[1], 800,
          stats.quantiles[2], 1200,
          stats.quantiles[3], 1600,
          stats.quantiles[4], 2000
        ];
        
        console.log('Using quantile classification for congestion with breaks:', stats.quantiles);
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
      
      map.current.setPaintProperty('hexagons-fill', 'fill-extrusion-color', colorExpression);
      map.current.setPaintProperty('hexagons-fill', 'fill-extrusion-height', heightExpression);
      
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

export default MapboxMap;
