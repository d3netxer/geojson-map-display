
import React, { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { useArcGISMap } from '@/hooks/useArcGISMap';
import MapLegend from './MapLegend';
import MapControls from './MapControls';
import MapInfoOverlay from './MapInfoOverlay';
import { AlertCircle, Map } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// Import ESRI CSS
import '@arcgis/core/assets/esri/themes/light/main.css';

interface ArcGISMapProps {
  apiKey?: string;
  geoJSONData: any;
  onError?: (error: string) => void;
}

const ArcGISMap: React.FC<ArcGISMapProps> = ({ apiKey, geoJSONData, onError }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [metric, setMetric] = useState<string>('mean_conge');
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState<string>('streets');
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [initAttempts, setInitAttempts] = useState<number>(0);
  
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
    
    // Clear initializing state after reasonable timeout
    const initTimeout = setTimeout(() => {
      if (initializing) {
        setInitializing(false);
        console.log("Map initialization timeout reached");
      }
    }, 10000);
    
    try {
      console.log("Attempting to initialize map view");
      // Initialize the view with the container
      initializeView(mapContainer.current);
      setInitializing(false);
      setInitAttempts(prev => prev + 1);
    } catch (err) {
      console.error("Error initializing map view:", err);
      if (onError) onError(`Initialization error: ${err}`);
      setInitializing(false);
    }
    
    return () => clearTimeout(initTimeout);
  }, [mapContainer.current, initAttempts]);
  
  // Update mapStyle in the map when it changes
  useEffect(() => {
    updateMapStyle(mapStyle);
  }, [mapStyle]);
  
  // Handle fullscreen mode
  useEffect(() => {
    if (!mapContainer.current) return;
    
    if (fullscreen) {
      try {
        mapContainer.current.requestFullscreen().catch((err) => {
          console.error('Error attempting to enable fullscreen:', err);
          setFullscreen(false);
        });
      } catch (err) {
        console.error("Fullscreen API error:", err);
        setFullscreen(false);
      }
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

  // Retry initialization logic
  const handleRetryInitialization = () => {
    if (initAttempts < 3) {
      setInitializing(true);
      setInitAttempts(prev => prev + 1);
      console.log(`Retrying map initialization (attempt ${initAttempts + 1}/3)`);
      
      // Force remount of the map container
      setTimeout(() => {
        // This will trigger the useEffect for initialization
        if (mapContainer.current) {
          try {
            initializeView(mapContainer.current);
            setInitializing(false);
          } catch (err) {
            console.error("Retry initialization failed:", err);
            setInitializing(false);
          }
        }
      }, 500);
    } else {
      // Give up after 3 attempts
      if (onError) onError("Maximum initialization attempts reached");
    }
  };

  const showLoadingMessage = loading || initializing;
  
  if (error && initAttempts >= 3) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 bg-background">
        <Alert variant="destructive" className="mb-4 max-w-md w-full">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Map Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <div className="max-w-md w-full flex justify-center mt-4">
          <Button 
            variant="outline" 
            onClick={handleRetryInitialization}
            disabled={initAttempts >= 3}
          >
            Retry Loading Map
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {showLoadingMessage && (
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
