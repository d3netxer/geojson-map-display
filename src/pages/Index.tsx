
import { useState, useEffect } from 'react';
import { Toaster } from "sonner";
import { toast } from "sonner";
import ArcGISMap from '../components/ArcGISMap';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Info } from 'lucide-react';

// Import the GeoJSON manager
import activeGeoJSON, { getActiveGeoJSON, geoJSONDatasets } from '../data/geoJSONManager';

const Index = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(true);
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [currentGeoJSON, setCurrentGeoJSON] = useState<any>(activeGeoJSON);
  const [datasetSource, setDatasetSource] = useState<string>(import.meta.env.VITE_GEOJSON_SOURCE || 'custom');

  // When component mounts, check which dataset is active
  useEffect(() => {
    const currentDataset = import.meta.env.VITE_GEOJSON_SOURCE || 'custom';
    setDatasetSource(currentDataset);
    
    toast.info(`Using ${currentDataset} GeoJSON dataset in WGS84 format.`);
  }, []);

  const handleApiKeySubmit = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter a valid ArcGIS API key');
      return;
    }
    
    setMapReady(false);
    // Brief timeout to allow the map to re-initialize with the new API key
    setTimeout(() => {
      setMapReady(true);
      setShowApiKeyModal(false);
      toast.success('ArcGIS API key applied successfully');
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
      
      {/* Map Component */}
      {(mapReady || apiKey) && <ArcGISMap apiKey={apiKey} geoJSONData={currentGeoJSON} />}
      
      {/* API Key Dialog */}
      <Dialog open={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ArcGIS Map Configuration</DialogTitle>
            <DialogDescription>
              This application uses ArcGIS to visualize geospatial data. You need to provide an ArcGIS API key to continue.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="apiKey" className="text-sm font-medium">
                ArcGIS API Key
              </label>
              <Input
                id="apiKey"
                placeholder="Enter your ArcGIS API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                You need an ArcGIS API key to use this application. You can get one from the ArcGIS Developer portal.
              </p>
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                GeoJSON Dataset
              </label>
              <div className="bg-muted p-2 rounded-md text-sm">
                <p>Current: <span className="font-semibold">{datasetSource}</span> ({currentGeoJSON.features.length} features)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Using custom GeoJSON dataset with {currentGeoJSON.features.length} features.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button type="button" onClick={handleApiKeySubmit}>
                Apply API Key
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
