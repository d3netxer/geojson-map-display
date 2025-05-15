
import React from 'react';
import { ArrowDown, Layers, Maximize2, BarChart3, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/components/ui/use-toast';

interface MapControlsProps {
  metric: string;
  onMetricChange: (metric: string) => void;
  onStyleChange: () => void;
  onFullscreenToggle: () => void;
  fullscreen: boolean;
  selectedFeature: any;
}

const MapControls: React.FC<MapControlsProps> = ({
  metric,
  onMetricChange,
  onStyleChange,
  onFullscreenToggle,
  fullscreen,
  selectedFeature
}) => {
  return (
    <div className="map-control glass-card bg-white/80">
      <Button 
        variant="secondary" 
        size="sm" 
        className="flex items-center justify-between gap-2 w-full" 
        onClick={onStyleChange}
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
              onClick={() => onMetricChange('mean_speed')}
            >
              Average Speed
            </Button>
            <Button 
              variant={metric === 'mean_conge' ? 'default' : 'ghost'} 
              className="w-full justify-start mb-1" 
              size="sm"
              onClick={() => onMetricChange('mean_conge')}
            >
              Congestion Level
            </Button>
            <Button 
              variant={metric === 'sum_vktkm' ? 'default' : 'ghost'} 
              className="w-full justify-start mb-1" 
              size="sm"
              onClick={() => onMetricChange('sum_vktkm')}
            >
              Vehicle Kilometers
            </Button>
            <Button 
              variant={metric === 'sum_urban_' ? 'default' : 'ghost'} 
              className="w-full justify-start" 
              size="sm"
              onClick={() => onMetricChange('sum_urban_')}
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
        onClick={onFullscreenToggle}
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
              <div className="h-px bg-border" />
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
  );
};

export default MapControls;
