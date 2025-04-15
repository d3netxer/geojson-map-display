
import { useState } from 'react';
import { Toaster } from "sonner";
import MapboxMap from '../components/MapboxMap';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Info } from 'lucide-react';

// Import the GeoJSON manager instead of directly importing defaultGeoJSON
import activeGeoJSON, { getActiveGeoJSON } from '../data/geoJSONManager';

const Index = () => {
  const [apiKey, setApiKey] = useState<string>('pk.eyJ1IjoidGdlcnRpbiIsImEiOiJYTW5sTVhRIn0.X4B5APkxkWVaiSg3KqMCaQ');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState<boolean>(true);
  const [currentGeoJSON, setCurrentGeoJSON] = useState<any>(activeGeoJSON);

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
