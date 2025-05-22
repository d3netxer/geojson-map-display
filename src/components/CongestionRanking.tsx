
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatValue } from '@/lib/mapUtils';
import { Button } from '@/components/ui/button';

interface CongestionRankingProps {
  geoJSONData: any;
  onFocusArea: (feature: any) => void;
}

const CongestionRanking: React.FC<CongestionRankingProps> = ({ geoJSONData, onFocusArea }) => {
  // Extract features from GeoJSON
  const features = geoJSONData.features || [];
  
  // Sort features by congestion level (descending)
  const sortedFeatures = [...features]
    .sort((a, b) => b.properties.mean_conge - a.properties.mean_conge)
    .slice(0, 10); // Take top 10
  
  return (
    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-md max-h-[80vh] overflow-auto">
      <h3 className="text-lg font-semibold mb-2">Top 10 Most Congested Areas</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Grid ID</TableHead>
            <TableHead>Congestion Level</TableHead>
            <TableHead>Avg Speed (km/h)</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedFeatures.map((feature, index) => (
            <TableRow key={feature.properties.GRID_ID}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>{feature.properties.GRID_ID}</TableCell>
              <TableCell>{formatValue(feature.properties.mean_conge, 'mean_conge')}</TableCell>
              <TableCell>{formatValue(feature.properties.mean_speed, 'mean_speed')}</TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onFocusArea(feature)}
                >
                  Focus
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CongestionRanking;
