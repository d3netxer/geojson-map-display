
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface GeoJSONFileSelectorProps {
  onFileLoaded: (geojson: any) => void;
  defaultGeoJSON: any;
}

const GeoJSONFileSelector: React.FC<GeoJSONFileSelectorProps> = ({ onFileLoaded, defaultGeoJSON }) => {
  const [loading, setLoading] = useState(false);

  const resetToDefault = () => {
    onFileLoaded(defaultGeoJSON);
    toast.success('Reset to default GeoJSON data');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsedGeoJSON = JSON.parse(content);
        
        // Validate if it's a GeoJSON file
        if (!parsedGeoJSON.type || !parsedGeoJSON.features) {
          toast.error('Invalid GeoJSON format');
          setLoading(false);
          return;
        }
        
        // Check if it has the expected properties
        if (parsedGeoJSON.features.length > 0) {
          const firstFeature = parsedGeoJSON.features[0];
          if (!firstFeature.properties || !firstFeature.geometry) {
            toast.warning('GeoJSON may be missing required properties');
          }
        }
        
        onFileLoaded(parsedGeoJSON);
        toast.success(`Loaded ${parsedGeoJSON.features.length} hexagons from file`);
      } catch (error) {
        console.error('Error parsing GeoJSON file:', error);
        toast.error('Failed to parse GeoJSON file');
      } finally {
        setLoading(false);
        // Reset the file input
        e.target.value = '';
      }
    };
    
    reader.onerror = () => {
      toast.error('Error reading file');
      setLoading(false);
    };
    
    reader.readAsText(file);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="secondary" 
          size="sm" 
          className="flex items-center justify-between gap-2 w-full"
          disabled={loading}
        >
          <Upload size={16} />
          <span>{loading ? 'Loading...' : 'Change GeoJSON'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Upload GeoJSON File</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Select a GeoJSON file containing hexagon features with similar properties to the default data.
            </p>
            <input
              type="file"
              accept=".json,.geojson"
              onChange={handleFileChange}
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          <div className="border-t pt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full" 
              onClick={resetToDefault}
            >
              Reset to Default Data
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default GeoJSONFileSelector;
