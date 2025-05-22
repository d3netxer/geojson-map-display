
/**
 * Types for road analysis
 */
export interface RoadSegment {
  id: string;
  name: string;
  coordinates: [number, number][];
  congestionLevel: number;
  speed?: number;
  length: number;
}

export interface RoadApiDiagnostics {
  success: boolean;
  location: [number, number];
  featuresCount: number;
  roadFeaturesCount: number;
  responseStatus?: number;
  responseStatusText?: string;
  errorMessage?: string;
  requestUrl: string;
  rawResponse?: any;
}

/**
 * Helper function for direct diagnostic queries - can be used to test specific locations
 */
export const testMapboxRoadQuery = async (
  center: [number, number],
  accessToken: string,
  radius: number = 500
): Promise<RoadApiDiagnostics> => {
  // Modified to use the 'road' layer and include dedupe & geometry parameters
  const layers = 'road';
  const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${center[0]},${center[1]}.json?radius=${radius}&limit=10&layers=${layers}&dedupe&geometry=linestring&access_token=${accessToken}`;
  
  // Create diagnostics object
  const diagnostics: RoadApiDiagnostics = {
    success: false,
    location: center,
    featuresCount: 0,
    roadFeaturesCount: 0,
    requestUrl: url.replace(accessToken, 'API_KEY_HIDDEN')
  };
  
  try {
    console.log(`Testing road API at [${center[0].toFixed(5)}, ${center[1].toFixed(5)}] with radius ${radius}m using '${layers}' layer`);
    const response = await fetch(url);
    
    // Add response status to diagnostics
    diagnostics.responseStatus = response.status;
    diagnostics.responseStatusText = response.statusText;
    
    if (!response.ok) {
      diagnostics.errorMessage = `Mapbox API error: ${response.status} ${response.statusText}`;
      return diagnostics;
    }
    
    const data = await response.json();
    // Store summary of response data in diagnostics
    diagnostics.featuresCount = data.features ? data.features.length : 0;
    diagnostics.rawResponse = {
      type: data.type,
      features: data.features ? 
        data.features.map((f: any) => ({
          id: f.id,
          type: f.geometry.type,
          properties: {
            class: f.properties.class,
            name: f.properties.name
          }
        })) : []
    };
    
    // Count valid road features
    let roadFeatureCount = 0;
    
    if (data.features) {
      for (const feature of data.features) {
        // Only count line features (roads)
        if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
          roadFeatureCount++;
        }
      }
    }
    
    diagnostics.success = true;
    diagnostics.roadFeaturesCount = roadFeatureCount;
    
    return diagnostics;
  } catch (error) {
    console.error("Failed to test road API:", error);
    diagnostics.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return diagnostics;
  }
};

/**
 * Finds congested roads based on hexagon data
 * This will query the Mapbox API for road data and combine it with congestion data
 */
export const findCongestedRoads = async (
  map: any,
  hexagons: any[],
  accessToken: string,
  limit: number = 10
): Promise<RoadSegment[]> => {
  // This is a placeholder implementation
  // In a real implementation, we would:
  // 1. Find hexagons with high congestion
  // 2. Query the Mapbox API for roads in those areas
  // 3. Combine the congestion data with the road data
  // 4. Return the most congested roads

  // For now, we'll just return some synthetic roads for visualization
  const syntheticRoads: RoadSegment[] = [];
  
  // Filter hexagons to find the most congested ones
  const congestedHexagons = [...hexagons]
    .filter(hex => hex.properties && hex.properties.mean_conge > 0.5)
    .sort((a, b) => b.properties.mean_conge - a.properties.mean_conge)
    .slice(0, limit);
  
  // Create a synthetic road for each congested hexagon
  for (let i = 0; i < congestedHexagons.length; i++) {
    const hex = congestedHexagons[i];
    
    // Extract the center point of the hexagon
    let center: [number, number] = [0, 0];
    
    if (hex.geometry.type === 'Polygon') {
      // Calculate center of polygon
      const coords = hex.geometry.coordinates[0];
      const sumX = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0);
      const sumY = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0);
      center = [sumX / coords.length, sumY / coords.length];
    } else if (hex.geometry.type === 'MultiPolygon') {
      // Use the first polygon
      const coords = hex.geometry.coordinates[0][0];
      const sumX = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0);
      const sumY = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0);
      center = [sumX / coords.length, sumY / coords.length];
    }
    
    // Create a synthetic road
    const roadLength = Math.random() * 1000 + 500; // 500-1500 meters
    const angle = Math.random() * Math.PI * 2; // Random angle in radians
    
    // Create start and end points for the road
    const start: [number, number] = [
      center[0] - Math.cos(angle) * roadLength / 200000,
      center[1] - Math.sin(angle) * roadLength / 200000
    ];
    
    const end: [number, number] = [
      center[0] + Math.cos(angle) * roadLength / 200000,
      center[1] + Math.sin(angle) * roadLength / 200000
    ];
    
    // Create additional points along the road for a more realistic appearance
    const numPoints = Math.floor(roadLength / 100) + 2; // One point per 100m
    const coordinates: [number, number][] = [];
    
    for (let j = 0; j < numPoints; j++) {
      const fraction = j / (numPoints - 1);
      // Add slight randomness to make it look more natural
      const jitter = (Math.random() - 0.5) * 0.0001;
      coordinates.push([
        start[0] + (end[0] - start[0]) * fraction + jitter,
        start[1] + (end[1] - start[1]) * fraction + jitter
      ]);
    }
    
    // Create the road segment
    const syntheticRoad: RoadSegment = {
      id: `synthetic-road-${i + 1}`,
      name: `Synthetic Road ${i + 1}`,
      coordinates,
      congestionLevel: hex.properties.mean_conge || 0.7,
      speed: hex.properties.mean_speed || 30,
      length: roadLength
    };
    
    syntheticRoads.push(syntheticRoad);
  }
  
  return syntheticRoads;
};
