
import React, { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { useArcGISMap } from '@/hooks/useArcGISMap';
import MapLegend from './MapLegend';
import MapControls from './MapControls';
import MapInfoOverlay from './MapInfoOverlay';

// Import ESRI CSS
import '@arcgis/core/assets/esri/themes/light/main.css';

interface ArcGISMapProps {
  apiKey?: string;
  geoJSONData: any;
  onError?: (error: string) => void;
}

const ArcGISMap: React.FC<ArcGISMapProps> = ({ apiKey, geoJSONData, onError }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [metric, setMetric] = useState<string>('mean_speed');
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState<string>('streets');
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  
  const token = apiKey || '';

  const { 
    loading, 
    metricStats, 
    colorScale, 
    initializeView,
    updateMapStyle,
    error
  } = useArcGISMap({
    apiKey: token,
    geoJSONData,
    metric,
    mapStyle,
    onFeatureSelect: setSelectedFeature
  });

  // Report errors back to the parent component
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);
  
  // Initialize view when the container is ready
  useEffect(() => {
    if (!mapContainer.current) return;
    
    // Initialize the view with the container
    initializeView(mapContainer.current);
  }, [mapContainer.current]);
  
  // Update mapStyle in the map when it changes
  useEffect(() => {
    updateMapStyle(mapStyle);
  }, [mapStyle]);
  
  // Handle fullscreen mode
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
    toast({
      title: "Map Style Changed",
      description: `Map style changed to ${styleNames[nextIndex]}`
    });
  };

  if (error) {
    return null; // Let the parent component handle errors
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground animate-pulse">Loading map visualization...</p>
          </div>
        </div>
      )}
      
      <div ref={mapContainer} className="map-container w-full h-full" />
      
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
    </div>
  );
};

export default ArcGISMap;
