
import React from 'react';
import { formatValue } from '@/lib/mapUtils';

interface MapLegendProps {
  title: string;
  min: number;
  max: number;
  colorScale: string[];
  metric: string;
  quantiles?: number[];
}

const MapLegend: React.FC<MapLegendProps> = ({ title, min, max, colorScale, metric, quantiles }) => {
  // Calculate legend values based on quantiles or even distribution
  let legendValues: number[];
  
  if (metric.includes('conge') && quantiles) {
    legendValues = quantiles;
  } else {
    // Calculate intermediate values for the legend with even distribution
    const range = max - min;
    const step = range / 4;
    
    legendValues = [
      min,
      min + step,
      min + (step * 2),
      min + (step * 3),
      max
    ];
  }
  
  return (
    <div className="absolute left-4 bottom-8 z-10 glass-card p-4 rounded-xl max-w-xs animate-fade-in">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="grid grid-cols-1 gap-1">
        {colorScale.map((color, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-sm" 
              style={{ backgroundColor: color }}
            />
            <span className="text-xs">
              {formatValue(legendValues[index], metric)}
              {index < colorScale.length - 1 && ' - '}
              {index < colorScale.length - 1 && formatValue(legendValues[index + 1], metric)}
            </span>
          </div>
        ))}
      </div>
      {metric.includes('conge') && (
        <div className="text-xs text-muted-foreground mt-2">
          Using quantile classification
        </div>
      )}
    </div>
  );
};

export default MapLegend;
