import React, { useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { ArrowDown, Layers, Maximize2, BarChart3, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { processGeoJSON, getColorScale, formatValue } from '@/lib/mapUtils';
import MapLegend from './MapLegend';
import MapControls from './MapControls';
import MapInfoOverlay from './MapInfoOverlay';

interface MapboxMapProps {
  apiKey?: string;
  geoJSONData: any;
  onError?: (error: string) => void;
}

const MapboxMap = ({ apiKey, geoJSONData, onError }: MapboxMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<string>('mean_conge');
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/mapbox/light-v11');
  const [fullscreen, setFullscreen] = useState<boolean>(false);
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

  const token = apiKey || '';

  React.useEffect(() => {
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
        
        // Determine how to visualize the data
        let colorExpression;
        let heightExpression;
        
        // For congestion, use a step function with quantiles
        if (metric.includes('conge') && stats.quantiles) {
          // Ensure quantiles are in ascending order and unique for step expression
          const sortedQuantiles = [...stats.quantiles].sort((a, b) => a - b);
          const uniqueSortedValues = Array.from(new Set(sortedQuantiles)).sort((a, b) => a - b);
          
          // Create pairs of values and colors for the step expression
          const stepPairs = [];
          for (let i = 0; i < Math.min(uniqueSortedValues.length, colors.length - 1); i++) {
            stepPairs.push(uniqueSortedValues[i], colors[i + 1]);
          }
          
          // Build the complete step expression with safe, ascending values
          colorExpression = [
            'step',
            ['get', metric],
            colors[0],
            ...stepPairs
          ];
          
          console.log('Using color step expression with quantiles:', uniqueSortedValues);
          
          // Make sure height values are in strictly ascending order
          heightExpression = [
            'interpolate', // Use interpolate instead of step for smoother transitions
            ['linear'],
            ['get', metric],
            stats.min, 500,
            stats.min + (stats.range * 0.25), 800,
            stats.min + (stats.range * 0.5), 1200,
            stats.min + (stats.range * 0.75), 1600,
            stats.max, 2000
          ];
        } 
        // For other metrics, use a linear interpolation
        else {
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
        
        // Add 3D hexagons layer
        mapInstance.addLayer({
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
        
        // Add click interaction
        mapInstance.on('click', 'hexagons-fill', (e) => {
          if (!e.features || e.features.length === 0) return;
          
          const feature = e.features[0];
          setSelectedFeature({
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
  }, [token, mapStyle, geoJSONData]);
  
  // Update visualization when metric changes
  React.useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || map.current.getSource('riyadh-hexagons') === undefined) return;
    
    try {
      const { metricStats: stats } = processGeoJSON(geoJSONData, metric);
      const colors = getColorScale(stats.min, stats.max, metric);
      
      setMetricStats(stats);
      setColorScale(colors);
      
      let colorExpression;
      let heightExpression;
      
      if (metric.includes('conge') && stats.quantiles) {
        // Ensure quantiles are in ascending order and unique for step expression
        const sortedQuantiles = [...stats.quantiles].sort((a, b) => a - b);
        const uniqueSortedValues = Array.from(new Set(sortedQuantiles)).sort((a, b) => a - b);
        
        // Create pairs of values and colors for the step expression
        const stepPairs = [];
        for (let i = 0; i < Math.min(uniqueSortedValues.length, colors.length - 1); i++) {
          stepPairs.push(uniqueSortedValues[i], colors[i + 1]);
        }
        
        // Build the complete step expression with safe, ascending values
        colorExpression = [
          'step',
          ['get', metric],
          colors[0],
          ...stepPairs
        ];
        
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
      }
      
      toast.success(`Visualizing: ${getMetricLabel(metric)}`);
    } catch (error: any) {
      console.error('Error updating metric:', error);
      toast.error(`Error updating visualization: ${error.message || 'Unknown error'}`);
    }
  }, [metric]);
  
  // Handle fullscreen mode
  React.useEffect(() => {
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
  
  const getMetricLabel = (metricKey: string): string => {
    const labels: Record<string, string> = {
      'mean_speed': 'Average Speed (km/h)',
      'mean_conge': 'Congestion Level',
      'sum_vktkm': 'Total Vehicle Kilometers',
      'sum_urban_': 'Urban Road Length'
    };
    
    return labels[metricKey] || metricKey;
  };
  
  // Toggle between different map styles
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
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground animate-pulse">Loading map visualization...</p>
            <p className="text-xs text-muted-foreground mt-2">
              This may take a moment on first load
            </p>
          </div>
        </div>
      )}
      
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map information overlay */}
      <MapInfoOverlay 
        featuresCount={geoJSONData.features.length}
        metric={metric}
      />
      
      {/* Map legend */}
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
      
      {/* Map controls */}
      <MapControls 
        metric={metric}
        onMetricChange={setMetric}
        onStyleChange={toggleMapStyle}
        onFullscreenToggle={() => setFullscreen(!fullscreen)}
        fullscreen={fullscreen}
        selectedFeature={selectedFeature}
      />

      {/* Add custom styles */}
      <style>
        {`
        .map-overlay {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 10;
          padding: 12px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          max-width: 350px;
          backdrop-filter: blur(8px);
        }
        
        .map-control {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 10;
          padding: 12px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 180px;
          backdrop-filter: blur(8px);
        }
        
        .glass-card {
          background-color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(8px);
        }
        
        .chip {
          display: inline-block;
          padding: 2px 8px;
          background-color: #e0f2fe;
          color: #0369a1;
          font-size: 12px;
          font-weight: 500;
          border-radius: 999px;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 14px;
        }
        
        .info-label {
          color: #6b7280;
        }
        
        .info-value {
          font-weight: 500;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        `}
      </style>
    </div>
  );
};

export default MapboxMap;
