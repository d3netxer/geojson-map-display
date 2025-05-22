
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RoadSegment, RoadApiDiagnostics } from '@/lib/roadAnalysis';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RoadDiagnostics from './RoadDiagnostics';
import { BadgeInfo, BarChart, Road } from 'lucide-react';

interface CongestedRoadsProps {
  roads: RoadSegment[];
  onFocusRoad: (road: RoadSegment) => void;
  apiKey: string;
  mapCenter?: [number, number];
}

const CongestedRoads: React.FC<CongestedRoadsProps> = ({ roads, onFocusRoad, apiKey, mapCenter }) => {
  const [activeTab, setActiveTab] = useState<string>("roads");
  const [diagnosticResults, setDiagnosticResults] = useState<RoadApiDiagnostics | null>(null);
  
  // Count real vs synthetic roads
  const syntheticRoads = roads.filter(road => road.id.startsWith('synthetic'));
  const realRoads = roads.filter(road => !road.id.startsWith('synthetic'));
  
  const handleDiagnosticsComplete = (results: RoadApiDiagnostics) => {
    setDiagnosticResults(results);
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-md max-h-[80vh] overflow-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="roads" className="flex items-center gap-2">
            <Road size={16} />
            <span>Road Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="flex items-center gap-2">
            <BadgeInfo size={16} />
            <span>API Diagnostics</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="roads" className="pt-2">
          <h3 className="text-lg font-semibold mb-2">Most Congested Roads Analysis</h3>
          
          {roads.length > 0 && (
            <div className="flex gap-2 mb-4">
              <div className={`px-3 py-1 text-xs rounded-full ${realRoads.length > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {realRoads.length} real roads
              </div>
              <div className={`px-3 py-1 text-xs rounded-full ${syntheticRoads.length > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                {syntheticRoads.length} synthetic roads
              </div>
            </div>
          )}
          
          {roads.length === 0 ? (
            <div className="py-4 text-center text-muted-foreground">
              <p>Click "Analyze Roads" to generate a list of congested roads based on the hexagon data.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Road Name</TableHead>
                  <TableHead>Congestion</TableHead>
                  <TableHead>Est. Speed</TableHead>
                  <TableHead>Length</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roads.map((road, index) => (
                  <TableRow key={road.id} className={road.id.startsWith('synthetic') ? 'bg-yellow-50' : ''}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      {road.name}
                      {road.id.startsWith('synthetic') && (
                        <span className="ml-2 text-xs text-yellow-600">(synthetic)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 flex-1 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full" 
                            style={{ 
                              width: `${Math.round(road.congestionLevel * 100)}%`,
                              backgroundColor: getCongestionColor(road.congestionLevel)
                            }}
                          />
                        </div>
                        <span className="text-xs whitespace-nowrap">
                          {Math.round(road.congestionLevel * 100)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{road.speed ? `${Math.round(road.speed)} km/h` : 'N/A'}</TableCell>
                    <TableCell>{formatDistance(road.length)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onFocusRoad(road)}
                      >
                        Focus
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
        
        <TabsContent value="diagnostics" className="pt-2">
          <RoadDiagnostics 
            apiKey={apiKey}
            initialCoordinates={mapCenter}
            onDiagnosticsComplete={handleDiagnosticsComplete}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper function to format distance
const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  } else {
    return `${(meters / 1000).toFixed(1)} km`;
  }
};

// Helper function to get color based on congestion level
const getCongestionColor = (level: number): string => {
  if (level < 0.3) return '#22c55e'; // Green
  if (level < 0.6) return '#f59e0b'; // Yellow/Amber
  return '#ef4444'; // Red
};

export default CongestedRoads;
