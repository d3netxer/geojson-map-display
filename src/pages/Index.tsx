
import { useState, useEffect } from 'react';
import { Toaster } from "sonner";
import { toast } from "sonner";
import ArcGISMap from '../components/ArcGISMap';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Info, AlertCircle } from 'lucide-react';

// Import the GeoJSON manager
import activeGeoJSON, { getActiveGeoJSON, geoJSONDatasets } from '../data/geoJSONManager';

// Local storage key for API key
const API_KEY_STORAGE_KEY = 'arcgis_api_key';

// Default demo API key (limited functionality)
const DEMO_API_KEY = 'AAPK8fd45a4074594a07b05866eb98ccdc68JilzMsKIcnbJzMc1Ktyb1CiJ0jFUB4IxmU0bnZ9_xuSKHaZJh8L6eL3cPQE_bRWl';

const Index = () => {
  const [apiKey, setApiKey] = useState<string>(DEMO_API_KEY);
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [currentGeoJSON, setCurrentGeoJSON] = useState<any>(activeGeoJSON);
  const [datasetSource, setDatasetSource] = useState<string>(import.meta.env.VITE_GEOJSON_SOURCE || 'custom');
  const [mapError, setMapError] = useState<string | null>(null);

  // When component mounts, check which dataset is active and load API key from storage
  useEffect(() => {
    const currentDataset = import.meta.env.VITE_GEOJSON_SOURCE || 'custom';
    setDatasetSource(currentDataset);
    
    // Load API key from localStorage if available
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
    
    // Always set map ready, we'll handle errors in the map component
    setMapReady(true);
    
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
    setMapError(null);
    
    // Brief timeout to allow the map to re-initialize with the new API key
    setTimeout(() => {
      setMapReady(true);
      setShowApiKeyModal(false);
      toast.success('ArcGIS API key applied and saved for future sessions');
    }, 100);
  };

  const handleMapError = (error: string) => {
    setMapError(error);
    toast.error(`Map error: ${error}`);
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
      
      {/* Map Component or Error Message */}
      {mapReady && (
        <>
          {mapError ? (
            <div className="flex flex-col items-center justify-center h-screen p-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full shadow-lg">
                <div className="flex items-center mb-4">
                  <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
                  <h2 className="text-lg font-semibold text-red-700">Map Error</h2>
                </div>
                <p className="text-red-600 mb-4">{mapError}</p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowApiKeyModal(true)}
                >
                  Update API Key
                </Button>
              </div>
            </div>
          ) : (
            <ArcGISMap 
              apiKey={apiKey} 
              geoJSONData={currentGeoJSON} 
              onError={handleMapError} 
            />
          )}
        </>
      )}
      
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
