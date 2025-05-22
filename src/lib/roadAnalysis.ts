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
 * Calculates the length of a LineString in meters using the Haversine formula
 */
const calculateRoadLength = (coordinates: [number, number][]): number => {
  if (coordinates.length < 2) return 0;
  
  const R = 6371000; // Earth radius in meters
  let total = 0;
  
  for (let i = 1; i < coordinates.length; i++) {
    const [lon1, lat1] = coordinates[i - 1];
    const [lon2, lat2] = coordinates[i];
    
    // Convert to radians
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    // Haversine formula
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in meters
    
    total += distance;
  }
  
  return total;
};

/**
 * Fetches road data for a specific location using Mapbox Tilequery API
 */
const fetchRoadsAtLocation = async (
  center: [number, number],
  accessToken: string,
  radius: number = 300,
  congestionLevel: number,
  speed?: number
): Promise<RoadSegment[]> => {
  try {
    // Query the Mapbox tilequery API for roads at this location
    const layers = 'road';
    const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${center[0]},${center[1]}.json?radius=${radius}&limit=5&layers=${layers}&dedupe&geometry=linestring&access_token=${accessToken}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Mapbox API error: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    const roads: RoadSegment[] = [];
    
    if (data.features && data.features.length > 0) {
      // Process each road feature
      for (const feature of data.features) {
        // Skip non-LineString geometries
        if (feature.geometry.type !== 'LineString') continue;
        
        // Get coordinates
        const coordinates = feature.geometry.coordinates as [number, number][];
        
        // Calculate road length
        const length = calculateRoadLength(coordinates);
        
        // Create a road segment
        const roadSegment: RoadSegment = {
          id: feature.id || `road-${Math.random().toString(36).substring(2, 10)}`,
          name: feature.properties.name || 'Unnamed Road',
          coordinates: coordinates,
          congestionLevel: congestionLevel,
          speed: speed,
          length: length
        };
        
        roads.push(roadSegment);
      }
    }
    
    return roads;
  } catch (error) {
    console.error("Failed to fetch roads at location:", error);
    return [];
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
  // Filter hexagons to find the most congested ones
  const congestedHexagons = [...hexagons]
    .filter(hex => hex.properties && hex.properties.mean_conge > 0.5)
    .sort((a, b) => b.properties.mean_conge - a.properties.mean_conge)
    .slice(0, limit);
  
  console.log(`Found ${congestedHexagons.length} congested hexagons`);
  
  // Collect all roads from congested hexagons
  const allRoads: RoadSegment[] = [];
  
  // Keep track of already processed roads to avoid duplicates
  const processedRoadIds = new Set<string>();
  
  // For each congested hexagon, fetch the roads in its area
  for (const hex of congestedHexagons) {
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
    
    console.log(`Fetching roads for hexagon at [${center[0].toFixed(5)}, ${center[1].toFixed(5)}] with congestion level ${hex.properties.mean_conge.toFixed(2)}`);
    
    // Fetch roads at this location
    const roads = await fetchRoadsAtLocation(
      center, 
      accessToken, 
      300, // 300m radius
      hex.properties.mean_conge || 0.7, 
      hex.properties.mean_speed
    );
    
    console.log(`Found ${roads.length} roads at hexagon location`);
    
    // Add non-duplicate roads to the result
    for (const road of roads) {
      if (!processedRoadIds.has(road.id)) {
        processedRoadIds.add(road.id);
        allRoads.push(road);
      }
    }
  }
  
  // If no real roads were found, fall back to synthetic roads as a backup
  if (allRoads.length === 0) {
    console.warn("No real road data found, generating synthetic roads as fallback");
    return generateSyntheticRoads(congestedHexagons);
  }
  
  console.log(`Returning ${allRoads.length} unique roads`);
  
  // Return all found roads
  return allRoads;
};

/**
 * Generate synthetic roads as a fallback when real data isn't available
 */
const generateSyntheticRoads = (congestedHexagons: any[]): RoadSegment[] => {
  const syntheticRoads: RoadSegment[] = [];
  
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
