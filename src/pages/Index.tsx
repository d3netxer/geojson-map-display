
import { useState, useEffect } from 'react';
import { Toaster } from "sonner";
import { toast } from "sonner";
import MapboxMap from '../components/MapboxMap';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Info, RadarIcon } from 'lucide-react';
import CongestedRoads from '@/components/CongestedRoads';
import { RoadSegment } from '@/lib/roadAnalysis';

// Import the GeoJSON manager
import activeGeoJSON, { getActiveGeoJSON, geoJSONDatasets } from '../data/geoJSONManager';

const Index = () => {
  const [apiKey, setApiKey] = useState<string>('pk.eyJ1IjoidGdlcnRpbiIsImEiOiJYTW5sTVhRIn0.X4B5APkxkWVaiSg3KqMCaQ');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState<boolean>(true);
  const [currentGeoJSON, setCurrentGeoJSON] = useState<any>(activeGeoJSON);
  const [datasetSource, setDatasetSource] = useState<string>(import.meta.env.VITE_GEOJSON_SOURCE || 'default');
  const [showCongestedRoads, setShowCongestedRoads] = useState<boolean>(false);
  const [mapRef, setMapRef] = useState<any>(null);
  const [congestedRoads, setCongestedRoads] = useState<RoadSegment[]>([]);
  const [isAnalyzingRoads, setIsAnalyzingRoads] = useState<boolean>(false);
  const [currentMapCenter, setCurrentMapCenter] = useState<[number, number]>([46.67, 24.71]);
  // New state to track if roads have been analyzed already
  const [roadsAnalyzed, setRoadsAnalyzed] = useState<boolean>(false);

  // When component mounts, check which dataset is active
  useEffect(() => {
    const currentDataset = import.meta.env.VITE_GEOJSON_SOURCE || 'default';
    setDatasetSource(currentDataset);
  }, []);

  // Update map center when map moves
  useEffect(() => {
    if (mapRef && mapRef.on) {
      mapRef.on('moveend', () => {
        if (mapRef.getCenter) {
          const center = mapRef.getCenter();
          setCurrentMapCenter([center.lng, center.lat]);
        }
      });
    }
  }, [mapRef]);

  const handleApiKeySubmit = () => {
    if (mapRef) {
      // Update the map's access token directly instead of remounting
      if (mapRef.updateMapboxToken) {
        mapRef.updateMapboxToken(apiKey);
        toast.success('API key updated successfully');
      } else {
        // Fall back to remounting if updateMapboxToken isn't available
        setMapReady(false);
        setTimeout(() => {
          setMapReady(true);
        }, 100);
      }
      setShowApiKeyModal(false);
    }
  };

  // Switch between available datasets
  const toggleDataset = () => {
    const newDataset = datasetSource === 'default' ? 'custom' : 'default';
    
    // Update dataset without remounting the map
    if (mapRef && mapRef.updateGeoJSONData) {
      const newGeoJSON = geoJSONDatasets[newDataset as keyof typeof geoJSONDatasets];
      mapRef.updateGeoJSONData(newGeoJSON);
      setCurrentGeoJSON(newGeoJSON);
      setDatasetSource(newDataset);
      toast.success(`Switched to ${newDataset} dataset (${newGeoJSON.features.length} features)`);
    } else {
      // Fall back to remounting if updateGeoJSONData isn't available
      setMapReady(false);
      
      setTimeout(() => {
        setDatasetSource(newDataset);
        setCurrentGeoJSON(geoJSONDatasets[newDataset as keyof typeof geoJSONDatasets]);
        setMapReady(true);
        toast.success(`Switched to ${newDataset} dataset (${geoJSONDatasets[newDataset as keyof typeof geoJSONDatasets].features.length} features)`);
      }, 100);
    }
    
    // Reset roads analysis state when switching datasets
    setRoadsAnalyzed(false);
    setCongestedRoads([]);
  };

  // Focus on a specific road on the map
  const handleFocusRoad = (road: RoadSegment) => {
    if (!mapRef) return;
    
    // Get the midpoint of the road to center on
    const midIndex = Math.floor(road.coordinates.length / 2);
    const coordinates = road.coordinates[midIndex];
    
    mapRef.flyTo({
      center: coordinates,
      zoom: 15,
      pitch: 60,
      duration: 2000
    });
    
    // Highlight the road (if the map component has a setSelectedRoad method)
    if (mapRef.setSelectedRoad) {
      mapRef.setSelectedRoad(road);
      // Don't close the dialog so user can select other roads
      // setShowCongestedRoads(false); - Removed to keep dialog open
    }
  };

  // Analyze roads in the current map view
  const handleAnalyzeRoads = async () => {
    // If roads have already been analyzed, just show the dialog
    if (roadsAnalyzed) {
      setShowCongestedRoads(true);
      return;
    }
    
    if (!mapRef || isAnalyzingRoads) return;
    
    setIsAnalyzingRoads(true);
    
    try {
      // Call the findCongestedRoads method in the map component
      if (mapRef.findCongestedRoads) {
        toast.info("Analyzing roads and retrieving full geometries...");
        const roads = await mapRef.findCongestedRoads(apiKey);
        setCongestedRoads(roads);
        setShowCongestedRoads(true);
        // Mark roads as analyzed
        setRoadsAnalyzed(true);
        
        if (roads.length === 0) {
          toast.warning("No road data found in the current view");
        } else {
          const syntheticCount = roads.filter(r => r.id.startsWith('synthetic')).length;
          const realCount = roads.length - syntheticCount;
          const enhancedGeometryCount = roads.filter(r => r.coordinates.length > 5).length;
          
          if (realCount > 0) {
            const withDetailedGeometry = roads.filter(r => r.coordinates.length > 10).length;
            toast.success(`Found ${roads.length} congested roads (${withDetailedGeometry} with detailed geometry)`);
          } else {
            toast.warning(`No real road data found. Generated ${syntheticCount} synthetic roads.`);
          }
        }
      } else {
        toast.error("Road analysis feature not available");
      }
    } catch (error) {
      console.error("Failed to analyze roads:", error);
      toast.error("Failed to analyze roads");
    } finally {
      setIsAnalyzingRoads(false);
    }
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
      
      {/* Road Analysis Button - Show different text based on whether analysis has been run */}
      <Button 
        variant="secondary"
        size="sm"
        className="absolute top-4 right-20 z-50 bg-white/80 backdrop-blur-sm hover:bg-white/90 flex items-center gap-2"
        onClick={handleAnalyzeRoads}
        disabled={isAnalyzingRoads}
      >
        <RadarIcon size={16} />
        {isAnalyzingRoads ? 'Analyzing...' : roadsAnalyzed ? 'Show Road Analysis' : 'Find & Map Roads'}
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
      {mapReady && (
        <MapboxMap 
          apiKey={apiKey} 
          geoJSONData={currentGeoJSON} 
          onMapInit={(mapInstance) => setMapRef(mapInstance)} 
        />
      )}
      
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
      
      {/* Congested Roads Dialog */}
      <Dialog open={showCongestedRoads} onOpenChange={setShowCongestedRoads}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Road Network Analysis</DialogTitle>
            <DialogDescription>
              Analysis of road congestion based on hexagon data. Use the API Diagnostics tab to test road data availability.
            </DialogDescription>
          </DialogHeader>
          <CongestedRoads 
            roads={congestedRoads} 
            onFocusRoad={handleFocusRoad}
            apiKey={apiKey}
            mapCenter={currentMapCenter}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
