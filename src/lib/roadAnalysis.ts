/**
 * Types for road analysis
 */
export interface RoadSegment {
  id: string;
  name: string;
  coordinates: [number, number][]; // Array of [longitude, latitude] pairs
  congestionLevel: number;
  speed?: number;
  length: number;
  // Property to track which hexagon this road belongs to
  hexagonId?: string;
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
  radius: number = 25,
  limit: number = 10,
  layerType: string = 'road'
): Promise<RoadApiDiagnostics> => {
  // Modified to use the specified layer and include dedupe & geometry parameters
  const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${center[0]},${center[1]}.json?radius=${radius}&limit=${limit}&layers=${layerType}&dedupe&access_token=${accessToken}`;
  
  // Create diagnostics object
  const diagnostics: RoadApiDiagnostics = {
    success: false,
    location: center,
    featuresCount: 0,
    roadFeaturesCount: 0,
    requestUrl: url.replace(accessToken, 'API_KEY_HIDDEN')
  };
  
  try {
    console.log(`Testing road API at [${center[0].toFixed(5)}, ${center[1].toFixed(5)}] with radius ${radius}m using '${layerType}' layer, limit ${limit}`);
    const response = await fetch(url);
    
    // Add response status to diagnostics
    diagnostics.responseStatus = response.status;
    diagnostics.responseStatusText = response.statusText;
    
    if (!response.ok) {
      diagnostics.errorMessage = `Mapbox API error: ${response.status} ${response.statusText}`;
      return diagnostics;
    }
    
    const data = await response.json();
    // Store full response data in diagnostics for debugging
    diagnostics.rawResponse = data;
    
    // Update feature counts
    diagnostics.featuresCount = data.features ? data.features.length : 0;
    
    // Count valid road features
    let roadFeatureCount = 0;
    
    if (data.features) {
      for (const feature of data.features) {
        // Count all features that represent roads (even points can represent roads in tilequery)
        roadFeatureCount++;
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
 * Creates a path from a road point and bearing data
 * Used when the API returns points instead of linestrings
 * Enhanced to create more points for smoother lines
 */
const createPathFromPoint = (point: [number, number], bearing: number | undefined, length: number = 100): [number, number][] => {
  if (!bearing) {
    // If no bearing provided, create a short path in east and west directions
    const lon = point[0];
    const lat = point[1];
    // Create a short path (around 50m in both directions)
    const lonOffset = 0.0005; // roughly 50m at equator
    return [
      [lon - lonOffset, lat],
      [lon, lat],
      [lon + lonOffset, lat]
    ];
  }
  
  // Calculate start and end points based on bearing
  // Convert bearing to radians (bearing is in degrees, 0 = north, 90 = east)
  const bearingRad = (bearing * Math.PI) / 180;
  
  // Earth radius in meters
  const R = 6371000;
  
  // Length in km for point extension
  const pathLength = length / 1000;
  
  const lat1 = point[1] * Math.PI / 180;
  const lon1 = point[0] * Math.PI / 180;
  
  // Calculate backward point (opposite bearing)
  const oppositeBearing = (bearing + 180) % 360;
  const oppositeBearingRad = (oppositeBearing * Math.PI) / 180;
  
  // Create multiple points along the path for a smoother curve (5 points total)
  const points: [number, number][] = [];
  
  // Add backward points (2 points)
  for (let i = 2; i > 0; i--) {
    const fraction = i / 2;
    const pathFraction = pathLength * fraction;
    
    const lat2Back = Math.asin(
      Math.sin(lat1) * Math.cos(pathFraction/R) +
      Math.cos(lat1) * Math.sin(pathFraction/R) * Math.cos(oppositeBearingRad)
    );
    
    const lon2Back = lon1 + Math.atan2(
      Math.sin(oppositeBearingRad) * Math.sin(pathFraction/R) * Math.cos(lat1),
      Math.cos(pathFraction/R) - Math.sin(lat1) * Math.sin(lat2Back)
    );
    
    points.push([
      (lon2Back * 180 / Math.PI), 
      (lat2Back * 180 / Math.PI)
    ]);
  }
  
  // Add the center point
  points.push(point);
  
  // Add forward points (2 points)
  for (let i = 1; i <= 2; i++) {
    const fraction = i / 2;
    const pathFraction = pathLength * fraction;
    
    const lat2Forward = Math.asin(
      Math.sin(lat1) * Math.cos(pathFraction/R) +
      Math.cos(lat1) * Math.sin(pathFraction/R) * Math.cos(bearingRad)
    );
    
    const lon2Forward = lon1 + Math.atan2(
      Math.sin(bearingRad) * Math.sin(pathFraction/R) * Math.cos(lat1),
      Math.cos(pathFraction/R) - Math.sin(lat1) * Math.sin(lat2Forward)
    );
    
    points.push([
      (lon2Forward * 180 / Math.PI),
      (lat2Forward * 180 / Math.PI)
    ]);
  }
  
  return points;
};

/**
 * Fetches road geometry using Mapbox Directions API
 * This is now our primary method for getting detailed road geometries
 */
const fetchRoadGeometry = async (
  startCoordinate: [number, number],
  accessToken: string,
  bearing?: number
): Promise<[number, number][] | null> => {
  try {
    // Calculate an endpoint roughly 1km away in the direction of the bearing if provided
    // or in a random direction if no bearing is provided
    const bearingRad = bearing ? (bearing * Math.PI / 180) : (Math.random() * Math.PI * 2);
    const distance = 0.01; // Roughly 1km in decimal degrees at equator
    
    const endCoordinate: [number, number] = [
      startCoordinate[0] + Math.cos(bearingRad) * distance,
      startCoordinate[1] + Math.sin(bearingRad) * distance
    ];
    
    // Query the Mapbox Directions API for a route with maximum accuracy
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoordinate[0]},${startCoordinate[1]};${endCoordinate[0]},${endCoordinate[1]}?geometries=geojson&overview=full&steps=true&annotations=distance,duration,speed&access_token=${accessToken}`;
    
    console.log(`Fetching road geometry using Directions API from ${url.replace(accessToken, 'API_KEY_HIDDEN')}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Mapbox Directions API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    // Check if the response contains a route
    if (data && data.routes && data.routes.length > 0 && data.routes[0].geometry) {
      console.log(`Successfully retrieved route geometry with ${data.routes[0].geometry.coordinates.length} coordinates`);
      return data.routes[0].geometry.coordinates as [number, number][];
    }
    
    return null;
  } catch (error) {
    console.error("Failed to fetch geometry using Directions API:", error);
    return null;
  }
};

/**
 * Fetches roads data for a specific location using Mapbox Tilequery API
 * and processes the response to create RoadSegment objects,
 * enhanced with Directions API for geometry
 */
const fetchRoadsAtLocation = async (
  center: [number, number],
  accessToken: string,
  radius: number = 500,
  congestionLevel: number,
  speed?: number,
  hexagonId?: string
): Promise<RoadSegment[]> => {
  try {
    // Query the Mapbox tilequery API for roads at this location
    const layers = 'road';
    const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${center[0]},${center[1]}.json?radius=${radius}&limit=25&layers=${layers}&dedupe&access_token=${accessToken}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Mapbox API error: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    const roads: RoadSegment[] = [];
    
    if (data.features && data.features.length > 0) {
      console.log(`Found ${data.features.length} road features at [${center[0].toFixed(5)}, ${center[1].toFixed(5)}]`);
      
      // Process each road feature
      for (const feature of data.features) {
        try {
          // Extract road name
          let name = 'Unnamed Road';
          if (feature.properties.name_en) {
            name = feature.properties.name_en;
          } else if (feature.properties.name) {
            name = feature.properties.name;
          } else {
            // Use road class if no name is available
            name = `${feature.properties.class || 'Road'} ${Math.floor(Math.random() * 100)}`;
          }
          
          // Get the point and bearing information
          let point: [number, number];
          let bearing: number | undefined;
          
          if (feature.geometry.type === 'Point') {
            point = [feature.geometry.coordinates[0], feature.geometry.coordinates[1]];
            bearing = feature.properties.bearing;
          } else if (feature.geometry.type === 'LineString') {
            // For LineStrings, use the first point
            point = feature.geometry.coordinates[0] as [number, number];
            
            // Calculate bearing from the first two points if available
            if (feature.geometry.coordinates.length > 1) {
              const [x1, y1] = feature.geometry.coordinates[0];
              const [x2, y2] = feature.geometry.coordinates[1];
              bearing = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
            }
          } else if (feature.geometry.type === 'MultiLineString') {
            // For MultiLineStrings, use the first point of the first line
            point = feature.geometry.coordinates[0][0] as [number, number];
            
            // Calculate bearing from the first two points if available
            if (feature.geometry.coordinates[0].length > 1) {
              const [x1, y1] = feature.geometry.coordinates[0][0];
              const [x2, y2] = feature.geometry.coordinates[0][1];
              bearing = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
            }
          } else {
            // Skip other geometry types
            console.log(`Skipping unsupported geometry type: ${feature.geometry.type}`);
            continue;
          }
          
          console.log(`Attempting to fetch full geometry for road: ${name} at [${point[0].toFixed(5)}, ${point[1].toFixed(5)}]`);
          
          // Use Directions API to get full geometry
          const fullGeometry = await fetchRoadGeometry(point, accessToken, bearing);
          
          let coordinates: [number, number][];
          
          if (fullGeometry && fullGeometry.length > 2) {
            coordinates = fullGeometry;
            console.log(`Using Directions API geometry with ${coordinates.length} points for ${name}`);
          } else {
            // Fall back to synthetic path based on point and bearing
            coordinates = createPathFromPoint(point, bearing, 150);
            console.log(`Using synthetic path with ${coordinates.length} points for ${name}`);
          }
          
          // Calculate road length
          const length = calculateRoadLength(coordinates);
          
          // Create a road segment
          const roadSegment: RoadSegment = {
            id: `road-${feature.id || Math.random().toString(36).substring(2, 10)}`,
            name: name,
            coordinates: coordinates,
            congestionLevel: congestionLevel,
            speed: speed,
            length: length,
            hexagonId: hexagonId
          };
          
          roads.push(roadSegment);
        } catch (error) {
          console.error("Error processing road feature:", error);
          continue;
        }
      }
    } else {
      console.log(`No road features found at [${center[0].toFixed(5)}, ${center[1].toFixed(5)}]`);
    }
    
    // Sort roads by length to get the longest ones
    return roads.sort((a, b) => b.length - a.length);
  } catch (error) {
    console.error("Failed to fetch roads at location:", error);
    return [];
  }
};

/**
 * Finds congested roads based on hexagon data
 * Returns the longest road from each of the top congested hexagons
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
    .slice(0, 10); // Get top 10 most congested hexagons
  
  console.log(`Found ${congestedHexagons.length} congested hexagons`);
  
  if (congestedHexagons.length === 0) {
    return [];
  }
  
  // Array to store the longest road per hexagon
  const longestRoadPerHexagon: RoadSegment[] = [];
  
  // For each congested hexagon, fetch the roads and keep only the longest one
  for (const hex of congestedHexagons) {
    // Extract the center point of the hexagon
    let center: [number, number] = [0, 0];
    const hexagonId = hex.properties.GRID_ID || `hex-${Math.random().toString(36).substring(2, 10)}`;
    
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
    
    console.log(`Fetching roads for hexagon ${hexagonId} at [${center[0].toFixed(5)}, ${center[1].toFixed(5)}] with congestion level ${hex.properties.mean_conge.toFixed(2)}`);
    
    // Fetch roads at this location with a 500m radius
    const roads = await fetchRoadsAtLocation(
      center, 
      accessToken, 
      500, // 500m radius
      hex.properties.mean_conge || 0.7, 
      hex.properties.mean_speed,
      hexagonId // Pass the hexagon ID
    );
    
    console.log(`Found ${roads.length} roads at hexagon ${hexagonId}`);
    
    // Get the longest road from this hexagon, if any roads were found
    if (roads.length > 0) {
      // Roads are already sorted by length (longest first)
      const longestRoad = roads[0];
      longestRoadPerHexagon.push(longestRoad);
      console.log(`Added longest road "${longestRoad.name}" (${longestRoad.length.toFixed(0)}m) from hexagon ${hexagonId}`);
    } else {
      console.log(`No roads found for hexagon ${hexagonId}, will generate synthetic road`);
      
      // Generate a synthetic road for this hexagon
      const syntheticRoad = generateSyntheticRoadForHexagon(hex, hexagonId);
      longestRoadPerHexagon.push(syntheticRoad);
      console.log(`Added synthetic road "${syntheticRoad.name}" (${syntheticRoad.length.toFixed(0)}m) for hexagon ${hexagonId}`);
    }
  }
  
  // If no real roads were found in any hexagon, return synthetic roads as fallback
  if (longestRoadPerHexagon.length === 0) {
    console.warn("No roads found in any hexagon, generating synthetic roads as fallback");
    return generateSyntheticRoads(congestedHexagons);
  }
  
  console.log(`Returning ${longestRoadPerHexagon.length} roads (one longest road per hexagon)`);
  
  // Return one longest road per hexagon
  return longestRoadPerHexagon;
};

/**
 * Generate a synthetic road for a single hexagon
 * Enhanced to create more natural-looking road geometries
 */
const generateSyntheticRoadForHexagon = (hex: any, hexagonId: string): RoadSegment => {
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
  
  // Create a synthetic road with more points for a more natural appearance
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
  // Increase number of points for smoother curves
  const numPoints = Math.max(Math.floor(roadLength / 75) + 2, 8); // At least 8 points for smoothness
  const coordinates: [number, number][] = [];
  
  for (let j = 0; j < numPoints; j++) {
    const fraction = j / (numPoints - 1);
    
    // Add slight curvature by using sine wave offset
    const curveFactor = Math.sin(fraction * Math.PI) * 0.0002;
    const perpX = Math.sin(angle) * curveFactor;
    const perpY = -Math.cos(angle) * curveFactor;
    
    // Add some random variation to each point for natural appearance
    const jitter = (Math.random() - 0.5) * 0.00015;
    const jitterX = Math.sin(angle + Math.PI/2) * jitter;
    const jitterY = Math.cos(angle + Math.PI/2) * jitter;
    
    coordinates.push([
      start[0] + (end[0] - start[0]) * fraction + perpX + jitterX,
      start[1] + (end[1] - start[1]) * fraction + perpY + jitterY
    ]);
  }
  
  // Create the road segment
  const syntheticRoad: RoadSegment = {
    id: `synthetic-road-${hexagonId}`,
    name: `Synthetic Road ${hexagonId}`,
    coordinates,
    congestionLevel: hex.properties.mean_conge || 0.7,
    speed: hex.properties.mean_speed || 30,
    length: roadLength,
    hexagonId: hexagonId
  };
  
  return syntheticRoad;
};

/**
 * Generate synthetic roads as a fallback when real data isn't available
 */
const generateSyntheticRoads = (congestedHexagons: any[]): RoadSegment[] => {
  const syntheticRoads: RoadSegment[] = [];
  
  // Create a synthetic road for each congested hexagon
  for (let i = 0; i < congestedHexagons.length; i++) {
    const hex = congestedHexagons[i];
    const hexagonId = hex.properties.GRID_ID || `hex-${i + 1}`;
    
    const syntheticRoad = generateSyntheticRoadForHexagon(hex, hexagonId);
    syntheticRoads.push(syntheticRoad);
  }
  
  return syntheticRoads;
};
