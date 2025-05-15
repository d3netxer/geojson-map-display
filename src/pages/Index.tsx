
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

// Local storage key for API key
const API_KEY_STORAGE_KEY = 'arcgis_api_key';

const Index = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [currentGeoJSON, setCurrentGeoJSON] = useState<any>(activeGeoJSON);
  const [datasetSource, setDatasetSource] = useState<string>(import.meta.env.VITE_GEOJSON_SOURCE || 'custom');

  // When component mounts, check which dataset is active and load API key from storage
  useEffect(() => {
    const currentDataset = import.meta.env.VITE_GEOJSON_SOURCE || 'custom';
    setDatasetSource(currentDataset);
    
    // Load API key from localStorage if available
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setMapReady(true);
    } else {
      // Only show the API key dialog if we don't have one stored
      setShowApiKeyModal(true);
    }
    
    toast.info(`Using ${currentDataset} GeoJSON dataset in WGS84 format.`);
  }, []);

  const handleApiKeySubmit = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter a valid ArcGIS API key');
      return;
    }
    
    // Store API key in localStorage
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    
    setMapReady(false);
    // Brief timeout to allow the map to re-initialize with the new API key
    setTimeout(() => {
      setMapReady(true);
      setShowApiKeyModal(false);
      toast.success('ArcGIS API key applied and saved for future sessions');
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
              {localStorage.getItem(API_KEY_STORAGE_KEY) ? " Your API key will be saved for future sessions." : ""}
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
                Your API key will be saved locally on your device for convenience.
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
