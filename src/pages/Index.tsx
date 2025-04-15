
import { useState, useEffect } from 'react';
import { Toaster } from "sonner";
import { toast } from "sonner";
import MapboxMap from '../components/MapboxMap';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Info } from 'lucide-react';

// Import the GeoJSON manager
import activeGeoJSON, { getActiveGeoJSON, geoJSONDatasets } from '../data/geoJSONManager';

const Index = () => {
  const [apiKey, setApiKey] = useState<string>('pk.eyJ1IjoidGdlcnRpbiIsImEiOiJYTW5sTVhRIn0.X4B5APkxkWVaiSg3KqMCaQ');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState<boolean>(true);
  const [currentGeoJSON, setCurrentGeoJSON] = useState<any>(activeGeoJSON);
  const [datasetSource, setDatasetSource] = useState<string>(process.env.REACT_APP_GEOJSON_SOURCE || 'default');

  // When component mounts, check which dataset is active
  useEffect(() => {
    const currentDataset = process.env.REACT_APP_GEOJSON_SOURCE || 'default';
    setDatasetSource(currentDataset);
    
    toast.info(`Using ${currentDataset} GeoJSON dataset in WGS84 format. To switch, set REACT_APP_GEOJSON_SOURCE environment variable.`);
  }, []);

  const handleApiKeySubmit = () => {
    setMapReady(false);
    // Brief timeout to allow the map to re-initialize with the new API key
    setTimeout(() => {
      setMapReady(true);
      setShowApiKeyModal(false);
    }, 100);
  };

  const handleGeoJSONChange = (newGeoJSON: any) => {
    setMapReady(false);
    // Brief timeout to allow the map to re-initialize with the new GeoJSON
    setTimeout(() => {
      setCurrentGeoJSON(newGeoJSON);
      setMapReady(true);
    }, 100);
  };

  // Switch between available datasets
  const toggleDataset = () => {
    const newDataset = datasetSource === 'default' ? 'custom' : 'default';
    setMapReady(false);
    
    setTimeout(() => {
      setDatasetSource(newDataset);
      setCurrentGeoJSON(geoJSONDatasets[newDataset as keyof typeof geoJSONDatasets]);
      setMapReady(true);
      toast.success(`Switched to ${newDataset} dataset (${geoJSONDatasets[newDataset as keyof typeof geoJSONDatasets].features.length} features)`);
    }, 100);
  };

  return (
    <div className="relative min-h-screen bg-background antialiased">
      <Toaster position="top-right" richColors />
      
      {/* Info Button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-4 right-4 z-50 bg-white/80 backdrop-blur-sm hover:bg-white/90 rounded-full"
        onClick={() => setShowApiKeyModal(true)}
      >
        <Info size={20} />
      </Button>
      
      {/* Dataset Toggle Button */}
      <Button 
        variant="secondary"
        size="sm"
        className="absolute top-4 left-4 z-50 bg-white/80 backdrop-blur-sm hover:bg-white/90"
        onClick={toggleDataset}
      >
        {datasetSource === 'default' ? 'Switch to Custom Dataset' : 'Switch to Default Dataset'}
      </Button>
      
      {/* Map Component */}
      {mapReady && <MapboxMap apiKey={apiKey} geoJSONData={currentGeoJSON} onGeoJSONChange={handleGeoJSONChange} />}
      
      {/* API Key Dialog */}
      <Dialog open={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Map Configuration</DialogTitle>
            <DialogDescription>
              This application uses Mapbox to visualize geospatial data. You can use your own Mapbox API key for better performance.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="apiKey" className="text-sm font-medium">
                Mapbox API Key
              </label>
              <Input
                id="apiKey"
                placeholder="Enter your Mapbox API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                If you want to use a different Mapbox API key, enter it here and click Apply Changes.
              </p>
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                GeoJSON Dataset
              </label>
              <div className="bg-muted p-2 rounded-md text-sm">
                <p>Current: <span className="font-semibold">{datasetSource}</span> ({currentGeoJSON.features.length} features)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  To switch datasets in development, set the <code>REACT_APP_GEOJSON_SOURCE</code> environment variable to 'default' or 'custom'.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button type="button" onClick={handleApiKeySubmit}>
                Apply Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
