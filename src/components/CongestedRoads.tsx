
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RoadSegment } from '@/lib/roadAnalysis';

interface CongestedRoadsProps {
  roads: RoadSegment[];
  onFocusRoad: (road: RoadSegment) => void;
}

const CongestedRoads: React.FC<CongestedRoadsProps> = ({ roads, onFocusRoad }) => {
  return (
    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-md max-h-[80vh] overflow-auto">
      <h3 className="text-lg font-semibold mb-2">Most Congested Roads Analysis</h3>
      
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
              <TableRow key={road.id}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>{road.name}</TableCell>
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
