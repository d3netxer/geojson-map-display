
import React from 'react';
import { Separator } from '@/components/ui/separator';

interface MapInfoOverlayProps {
  featuresCount: number;
  metric: string;
}

const MapInfoOverlay: React.FC<MapInfoOverlayProps> = ({ 
  featuresCount,
  metric
}) => {
  const getMetricLabel = (metricKey: string): string => {
    const labels: Record<string, string> = {
      'mean_speed': 'Average Speed (km/h)',
      'mean_conge': 'Congestion Level',
      'sum_vktkm': 'Total Vehicle Kilometers',
      'sum_urban_': 'Urban Road Length'
    };
    
    return labels[metricKey] || metricKey;
  };

  return (
    <div className="map-overlay glass-card bg-white/80">
      <div className="chip mb-2">Traffic Analysis</div>
      <h1 className="text-2xl font-bold tracking-tight mb-1">Riyadh Hexagonal Analysis</h1>
      <p className="text-muted-foreground text-sm mb-4">
        Traffic metrics across {featuresCount} hexagonal cells
      </p>
      <Separator className="my-3" />
      <div className="info-row">
        <span className="info-label">Current Metric</span>
        <span className="info-value">{getMetricLabel(metric)}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Grid Cells</span>
        <span className="info-value">{featuresCount}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Area Coverage</span>
        <span className="info-value">Central Riyadh</span>
      </div>
    </div>
  );
};

export default MapInfoOverlay;
