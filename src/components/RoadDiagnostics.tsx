
import React, { useState } from 'react';
import { testMapboxRoadQuery, RoadApiDiagnostics } from '@/lib/roadAnalysis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, XCircle, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RoadDiagnosticsProps {
  apiKey: string;
  initialCoordinates?: [number, number];
  onDiagnosticsComplete?: (diagnostics: RoadApiDiagnostics) => void;
}

const RoadDiagnostics: React.FC<RoadDiagnosticsProps> = ({ apiKey, initialCoordinates, onDiagnosticsComplete }) => {
  const [longitude, setLongitude] = useState<string>(
    initialCoordinates ? initialCoordinates[0].toString() : '46.67'
  );
  const [latitude, setLatitude] = useState<string>(
    initialCoordinates ? initialCoordinates[1].toString() : '24.71'
  );
  const [radius, setRadius] = useState<string>('500');
  const [loading, setLoading] = useState<boolean>(false);
  const [diagnostics, setDiagnostics] = useState<RoadApiDiagnostics | null>(null);

  const handleTest = async () => {
    setLoading(true);
    try {
      const coordinates: [number, number] = [parseFloat(longitude), parseFloat(latitude)];
      const result = await testMapboxRoadQuery(coordinates, apiKey, parseInt(radius, 10));
      setDiagnostics(result);
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
    // This would be implemented by the parent component
    if (initialCoordinates) {
      setLongitude(initialCoordinates[0].toString());
      setLatitude(initialCoordinates[1].toString());
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Road API Diagnostics</CardTitle>
        <CardDescription>Test Mapbox road data availability at specific locations</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
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
          <div className="flex flex-col justify-end">
            <Button 
              variant="outline" 
              size="sm"
              className="whitespace-nowrap mt-6"
              onClick={handleUseCurrentMapCenter}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Use Map Center
            </Button>
          </div>
        </div>
        
        <div>
          <label htmlFor="radius" className="text-sm font-medium">
            Search Radius (meters)
          </label>
          <Input 
            id="radius"
            value={radius} 
            onChange={(e) => setRadius(e.target.value)}
            placeholder="Radius in meters" 
            type="number"
            min="100"
            max="1000"
            step="100"
          />
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
        
        {diagnostics && (
          <div className="space-y-3 mt-4">
            <Separator />
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
              <div>
                <h4 className="text-sm font-medium mb-2">Features Found:</h4>
                <div className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-[200px]">
                  <pre>{JSON.stringify(diagnostics.rawResponse, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col items-start text-xs text-muted-foreground">
        <p>
          This tool tests the Mapbox Tilequery API to check if road data is available at the specified location.
          If no roads are found, the application will generate synthetic roads for visualization purposes.
        </p>
      </CardFooter>
    </Card>
  );
};

export default RoadDiagnostics;
