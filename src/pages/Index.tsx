import { useState, useEffect } from 'react';
import { Toaster } from "sonner";
import { toast } from "sonner";
import MapboxMap from '../components/MapboxMap';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Info, AlertCircle, Map } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// Import the GeoJSON manager
import activeGeoJSON, { getActiveGeoJSON, geoJSONDatasets } from '../data/geoJSONManager';

// Local storage key for API key
const API_KEY_STORAGE_KEY = 'mapbox_access_token';

// Demo API keys - using multiple in case one is expired or rate-limited
const DEMO_API_KEYS = [
  'pk.eyJ1IjoidGdlcnRpbiIsImEiOiJYTW5sTVhRIn0.X4B5APkxkWVaiSg3KqMCaQ',
  'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA'
];

// Choose a random demo key to avoid rate limiting issues
const getRandomDemoKey = () => DEMO_API_KEYS[0]; // Always use the first key (your provided key)

const Index = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [currentGeoJSON, setCurrentGeoJSON] = useState<any>(activeGeoJSON);
  const [datasetSource, setDatasetSource] = useState<string>(import.meta.env.VITE_GEOJSON_SOURCE || 'custom');
  const [mapError, setMapError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  // When component mounts, check which dataset is active and load API key from storage
  useEffect(() => {
    const currentDataset = import.meta.env.VITE_GEOJSON_SOURCE || 'custom';
    setDatasetSource(currentDataset);
    
    // Load API key from localStorage if available, otherwise use a demo key
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      setApiKey(storedApiKey);
      console.log("Using stored Mapbox access token");
    } else {
      const demoKey = getRandomDemoKey();
      setApiKey(demoKey);
      console.log("Using demo Mapbox access token");
      
      // Show informational toast about demo key limitations
      toast.info(
        "Using demo Mapbox access token with limited functionality. For full features, enter your own key.", 
        { duration: 6000 }
      );
    }
    
    // Always set map ready, we'll handle errors in the map component
    setMapReady(true);
    
    toast.info(`Using ${currentDataset} GeoJSON dataset in WGS84 format.`);
  }, []);

  // Retry with a different API key if we encounter errors
  useEffect(() => {
    if (mapError && retryCount < DEMO_API_KEYS.length) {
      const timer = setTimeout(() => {
        console.log(`Retrying with a different Mapbox access token (attempt ${retryCount + 1})`);
        const newKey = DEMO_API_KEYS[(retryCount + 1) % DEMO_API_KEYS.length];
        setApiKey(newKey);
        setMapError(null);
        setMapReady(false);
        
        // Brief timeout to allow the map to re-initialize with the new API key
        setTimeout(() => {
          setMapReady(true);
          setRetryCount(prev => prev + 1);
        }, 500);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [mapError, retryCount]);

  const handleApiKeySubmit = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter a valid Mapbox access token');
      return;
    }
    
    // Store API key in localStorage
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    
    setMapReady(false);
    setMapError(null);
    setRetryCount(0);
    
    // Brief timeout to allow the map to re-initialize with the new API key
    setTimeout(() => {
      setMapReady(true);
      setShowApiKeyModal(false);
      toast.success('Mapbox access token applied and saved for future sessions');
    }, 100);
  };

  const handleMapError = (error: string) => {
    console.error(`Map error: ${error}`);
    setMapError(error);
    toast.error(`Map error: ${error}`);
  };

  // Render fallback content when map fails to load
  const renderFallbackContent = () => {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 bg-gray-50">
        <div className="max-w-md w-full space-y-6 text-center">
          <Map className="h-24 w-24 text-primary/60 mx-auto" />
          
          <h1 className="text-2xl font-bold text-gray-900">GeoJSON Map Display</h1>
          
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Map Failed to Load</AlertTitle>
            <AlertDescription>
              {mapError || "The interactive map couldn't be displayed."}
            </AlertDescription>
          </Alert>
          
          <div className="text-left bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <h3 className="font-medium text-lg mb-2">Troubleshooting steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Check your internet connection</li>
              <li>Try using a different browser</li>
              <li>Enter your own Mapbox access token (click the info button)</li>
              <li>Clear your browser cache and reload the page</li>
            </ol>
            
            <div className="mt-6">
              <Button 
                className="w-full" 
                onClick={() => setShowApiKeyModal(true)}
              >
                Update Access Token
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            This application requires Mapbox to visualize geospatial data.
          </p>
        </div>
      </div>
    );
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
          {mapError && retryCount >= DEMO_API_KEYS.length ? (
            renderFallbackContent()
          ) : (
            <MapboxMap 
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
            <DialogTitle>Mapbox Configuration</DialogTitle>
            <DialogDescription>
              This application uses Mapbox to visualize geospatial data. For full functionality, you need to provide your own Mapbox access token.
              {localStorage.getItem(API_KEY_STORAGE_KEY) ? " Your access token will be saved for future sessions." : ""}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="apiKey" className="text-sm font-medium">
                Mapbox Access Token
              </label>
              <Input
                id="apiKey"
                placeholder="Enter your Mapbox access token"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                You can get a Mapbox access token from the <a href="https://account.mapbox.com/" target="_blank" rel="noopener noreferrer" className="underline text-primary">Mapbox account page</a>.
                Your access token will be saved locally on your device for convenience.
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
                Apply Access Token
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
