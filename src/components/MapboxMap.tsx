
import React, { useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { toast } from 'sonner';
import { useMapbox } from '@/hooks/useMapbox';
import { useFullscreen } from '@/hooks/useFullscreen';
import { getNextMapStyle, getMapStyleName } from '@/utils/mapStyles';
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
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<string>('mean_conge');
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/mapbox/light-v11');
  
  const token = apiKey || '';
  const { fullscreen, toggleFullscreen } = useFullscreen(mapContainer);
  
  const handleError = (error: string) => {
    setLoading(false);
    if (onError) onError(error);
  };
  
  const { 
    metricStats, 
    colorScale, 
    loading: mapLoading,
    getMetricLabel 
  } = useMapbox({
    mapContainer,
    token,
    mapStyle,
    geoJSONData,
    metric,
    onError: handleError,
    onFeatureSelect: setSelectedFeature
  });
  
  // Toggle between different map styles
  const toggleMapStyle = () => {
    const nextStyle = getNextMapStyle(mapStyle);
    setMapStyle(nextStyle);
    toast.success(`Map style changed to ${getMapStyleName(nextStyle)}`);
  };
  
  // Update loading state when map loading changes
  React.useEffect(() => {
    setLoading(mapLoading);
  }, [mapLoading]);

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
        onFullscreenToggle={toggleFullscreen}
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
