
import React, { useState } from 'react';
import { testMapboxRoadQuery, RoadApiDiagnostics } from '@/lib/roadAnalysis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, XCircle, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RoadDiagnosticsProps {
  apiKey: string;
  initialCoordinates?: [number, number];
  onDiagnosticsComplete?: (diagnostics: RoadApiDiagnostics) => void;
}

const RoadDiagnostics: React.FC<RoadDiagnosticsProps> = ({ apiKey, initialCoordinates, onDiagnosticsComplete }) => {
  const [longitude, setLongitude] = useState<string>(
    initialCoordinates ? initialCoordinates[0].toString() : '46.6908'
  );
  const [latitude, setLatitude] = useState<string>(
    initialCoordinates ? initialCoordinates[1].toString() : '24.7204'
  );
  const [radius, setRadius] = useState<string>('25'); // Smaller default radius to match your test
  const [loading, setLoading] = useState<boolean>(false);
  const [diagnostics, setDiagnostics] = useState<RoadApiDiagnostics | null>(null);
  const [layer, setLayer] = useState<string>('road');
  const [limit, setLimit] = useState<string>('10');
  const [activeTab, setActiveTab] = useState<string>('form');

  const handleTest = async () => {
    setLoading(true);
    try {
      const coordinates: [number, number] = [parseFloat(longitude), parseFloat(latitude)];
      const result = await testMapboxRoadQuery(coordinates, apiKey, parseInt(radius, 10), parseInt(limit, 10), layer);
      setDiagnostics(result);
      setActiveTab('results'); // Switch to results tab when test completes
      
      if (onDiagnosticsComplete) {
        onDiagnosticsComplete(result);
      }
    } catch (error) {
      console.error('Error during road diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentMapCenter = () => {
    if (initialCoordinates) {
      setLongitude(initialCoordinates[0].toString());
      setLatitude(initialCoordinates[1].toString());
    }
  };

  // Known good coordinates for testing
  const presetLocations = [
    { name: "Riyadh Downtown", coords: [46.6908, 24.7204] },
    { name: "New York City", coords: [-73.9857, 40.7484] },
    { name: "London", coords: [-0.1276, 51.5074] },
    { name: "Current Test", coords: [46.67, 24.71] } // Adding your test coordinates
  ];

  const handleSelectPreset = (index: number) => {
    const location = presetLocations[index];
    setLongitude(location.coords[0].toString());
    setLatitude(location.coords[1].toString());
  };

  // Generate the API query URL for display
  const generateApiQueryUrl = () => {
    const coordinates: [number, number] = [parseFloat(longitude), parseFloat(latitude)];
    return `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${coordinates[0]},${coordinates[1]}.json?radius=${radius}&limit=${limit}&layers=${layer}&dedupe&geometry=linestring&access_token=API_KEY_HIDDEN`;
  };

  const handleCopyApiUrl = () => {
    const coordinates: [number, number] = [parseFloat(longitude), parseFloat(latitude)];
    const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${coordinates[0]},${coordinates[1]}.json?radius=${radius}&limit=${limit}&layers=${layer}&dedupe&geometry=linestring&access_token=${apiKey}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Road API Diagnostics</CardTitle>
        <CardDescription>Test Mapbox road data availability at specific locations</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="form">API Test Form</TabsTrigger>
            <TabsTrigger value="results">API Results</TabsTrigger>
          </TabsList>
          
          <TabsContent value="form" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="preset-locations" className="text-sm font-medium block mb-2">
                  Preset Locations
                </label>
                <div className="flex flex-wrap gap-2">
                  {presetLocations.map((location, index) => (
                    <Button 
                      key={index} 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSelectPreset(index)}
                    >
                      {location.name}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full mt-6"
                  onClick={handleUseCurrentMapCenter}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Use Current Map Center
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="grid grid-cols-2 gap-2 flex-1">
                <div>
                  <label htmlFor="longitude" className="text-sm font-medium">
                    Longitude
                  </label>
                  <Input 
                    id="longitude"
                    value={longitude} 
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="Longitude" 
                  />
                </div>
                <div>
                  <label htmlFor="latitude" className="text-sm font-medium">
                    Latitude
                  </label>
                  <Input 
                    id="latitude"
                    value={latitude} 
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="Latitude" 
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="radius" className="text-sm font-medium">
                  Search Radius (m)
                </label>
                <Input 
                  id="radius"
                  value={radius} 
                  onChange={(e) => setRadius(e.target.value)}
                  placeholder="Radius in meters" 
                  type="number"
                  min="10"
                  max="1000"
                  step="10"
                />
              </div>
              
              <div>
                <label htmlFor="limit" className="text-sm font-medium">
                  Result Limit
                </label>
                <Input 
                  id="limit"
                  value={limit} 
                  onChange={(e) => setLimit(e.target.value)}
                  placeholder="Result limit" 
                  type="number"
                  min="1"
                  max="50"
                />
              </div>
              
              <div>
                <label htmlFor="layer" className="text-sm font-medium">
                  Mapbox Layer
                </label>
                <Select 
                  value={layer} 
                  onValueChange={setLayer}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a layer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="road">road</SelectItem>
                    <SelectItem value="transportation">transportation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label htmlFor="api-query" className="text-sm font-medium">
                API Query URL
              </label>
              <div className="mt-1 p-2 bg-slate-100 text-xs rounded font-mono break-all relative">
                {generateApiQueryUrl()}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-1 right-1"
                  onClick={handleCopyApiUrl}
                >
                  Copy with Key
                </Button>
              </div>
            </div>
            
            <Button 
              onClick={handleTest} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing API...
                </>
              ) : (
                'Test Road Data Availability'
              )}
            </Button>
          </TabsContent>
          
          <TabsContent value="results" className="space-y-4">
            {diagnostics ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Results</h3>
                  {diagnostics.success ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" /> Success
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-4 w-4 mr-1" /> Failed
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="font-medium">Status</div>
                  <div>{diagnostics.responseStatus || 'N/A'} {diagnostics.responseStatusText || ''}</div>
                  
                  <div className="font-medium">Total Features</div>
                  <div>{diagnostics.featuresCount}</div>
                  
                  <div className="font-medium">Road Features</div>
                  <div>{diagnostics.roadFeaturesCount}</div>
                  
                  <div className="font-medium">Coordinates</div>
                  <div>[{diagnostics.location[0].toFixed(5)}, {diagnostics.location[1].toFixed(5)}]</div>
                  
                  <div className="font-medium">API Request URL</div>
                  <div className="text-xs break-all">{diagnostics.requestUrl}</div>
                  
                  {diagnostics.errorMessage && (
                    <>
                      <div className="font-medium">Error</div>
                      <div className="text-red-500">{diagnostics.errorMessage}</div>
                    </>
                  )}
                </div>
                
                {diagnostics.success && diagnostics.roadFeaturesCount === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                    The API call was successful, but no road data was found at this location with the current parameters. 
                    Try increasing the radius or checking a different location.
                  </div>
                )}
                
                {diagnostics.rawResponse && diagnostics.featuresCount > 0 && (
                  <>
                    <h4 className="text-sm font-medium mt-4 mb-2">Features Found:</h4>
                    <div className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-[300px]">
                      <pre>{JSON.stringify(diagnostics.rawResponse, null, 2)}</pre>
                    </div>
                    
                    <h4 className="text-sm font-medium mt-4 mb-2">Feature Details:</h4>
                    <div className="space-y-2">
                      {diagnostics.rawResponse.features && diagnostics.rawResponse.features.map((feature: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 p-2 rounded">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div className="font-medium text-xs">ID</div>
                            <div className="text-xs">{feature.id}</div>
                            
                            <div className="font-medium text-xs">Type</div>
                            <div className="text-xs">{feature.geometry?.type || 'N/A'}</div>
                            
                            <div className="font-medium text-xs">Name</div>
                            <div className="text-xs">{feature.properties?.name || feature.properties?.name_en || 'No name'}</div>
                            
                            <div className="font-medium text-xs">Class</div>
                            <div className="text-xs">{feature.properties?.class || 'N/A'}</div>
                            
                            <div className="font-medium text-xs">Distance</div>
                            <div className="text-xs">{feature.properties?.tilequery?.distance.toFixed(2)}m</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center p-8 text-gray-500">
                Run a test to see results here
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex flex-col items-start text-xs text-muted-foreground">
        <p>
          This tool tests the Mapbox Tilequery API to check if road data is available at the specified location.
          If no roads are found, the application will generate synthetic roads for visualization purposes.
        </p>
        <p className="mt-1">
          Tip: Start with a small radius (25-50m) and increase if needed. The "dedupe" and "geometry=linestring" 
          parameters are automatically added to the API request.
        </p>
      </CardFooter>
    </Card>
  );
};

export default RoadDiagnostics;
