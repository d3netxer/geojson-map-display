
import mapboxgl from 'mapbox-gl';
import { toast } from "sonner";

// Type for road segment data
export interface RoadSegment {
  id: string;
  name: string;
  congestionLevel: number;
  coordinates: [number, number][];
  length: number; // in meters
  speed?: number;
}

/**
 * Queries roads that intersect with the provided hexagons and returns the most congested ones
 */
export const findCongestedRoads = async (
  map: mapboxgl.Map,
  hexagons: any[],
  accessToken: string,
  limit: number = 10
): Promise<RoadSegment[]> => {
  try {
    toast.info("Analyzing road network data...");
    
    // Store results
    const roadSegments: RoadSegment[] = [];
    
    // Process the most congested hexagons first
    const sortedHexagons = [...hexagons]
      .sort((a, b) => b.properties.mean_conge - a.properties.mean_conge)
      .slice(0, Math.min(20, hexagons.length)); // Limit to avoid too many API calls
    
    // Process each hexagon
    for (const hexagon of sortedHexagons) {
      if (!hexagon.geometry) continue;
      
      // Get hexagon center to query nearby roads
      let center: [number, number];
      
      if (hexagon.geometry.type === 'Polygon') {
        // Calculate centroid of polygon
        const coords = hexagon.geometry.coordinates[0];
        const x = coords.map((c: number[]) => c[0]).reduce((a: number, b: number) => a + b, 0) / coords.length;
        const y = coords.map((c: number[]) => c[1]).reduce((a: number, b: number) => a + b, 0) / coords.length;
        center = [x, y];
      } else if (hexagon.geometry.type === 'MultiPolygon') {
        // Use first polygon's first coordinate
        center = hexagon.geometry.coordinates[0][0][0];
      } else {
        continue;
      }
      
      try {
        // Query real roads from Mapbox API
        const roadsNearHexagon = await fetchNearbyRoads(center, accessToken, hexagon.properties.mean_conge);
        roadSegments.push(...roadsNearHexagon);
      } catch (error) {
        console.error(`Failed to fetch roads for hexagon at ${center}:`, error);
      }
    }
    
    // Get unique roads (by name) and sort by congestion level
    const uniqueRoads = Array.from(
      roadSegments.reduce((map, road) => {
        const existing = map.get(road.name);
        if (!existing || existing.congestionLevel < road.congestionLevel) {
          map.set(road.name, road);
        }
        return map;
      }, new Map<string, RoadSegment>())
    ).map(([_, road]) => road);
    
    // Sort by congestion level and take the top ones
    return uniqueRoads
      .sort((a, b) => b.congestionLevel - a.congestionLevel)
      .slice(0, limit);
  } catch (error) {
    console.error("Failed to analyze road network:", error);
    toast.error("Failed to analyze road network");
    return [];
  }
};

/**
 * Fetches real roads near a specified point using Mapbox's Tilequery API
 */
const fetchNearbyRoads = async (
  center: [number, number],
  accessToken: string,
  congestionFactor: number
): Promise<RoadSegment[]> => {
  // Using Mapbox Tilequery API to get roads near the center point
  // This queries Mapbox's vector tiles for road data
  const radius = 500; // Search radius in meters
  const limit = 5; // Limit number of roads returned
  const layers = 'transportation'; // Road layers in Mapbox's vector tiles
  
  const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${center[0]},${center[1]}.json?radius=${radius}&limit=${limit}&layers=${layers}&access_token=${accessToken}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.features || !data.features.length) {
      console.log(`No roads found near ${center}`);
      return [];
    }
    
    // Process the returned features into road segments
    const roads: RoadSegment[] = [];
    
    for (const feature of data.features) {
      // Only process line features (roads)
      if (feature.geometry.type !== 'LineString' && feature.geometry.type !== 'MultiLineString') {
        continue;
      }
      
      // Extract road properties
      const roadName = feature.properties.name || 'Unnamed Road';
      const roadClass = feature.properties.class || 'street';
      
      // Get coordinates
      let coordinates: [number, number][];
      if (feature.geometry.type === 'LineString') {
        coordinates = feature.geometry.coordinates;
      } else {
        // Take first line from MultiLineString
        coordinates = feature.geometry.coordinates[0];
      }
      
      // Calculate road length
      let length = 0;
      for (let i = 1; i < coordinates.length; i++) {
        length += calculateDistance(coordinates[i-1], coordinates[i]);
      }
      
      // Determine congestion level based on hexagon's congestion factor
      // and some road properties (more congested for major roads)
      let baseCongestion = congestionFactor;
      
      // Adjust based on road class (major roads are more congested)
      if (['primary', 'trunk', 'motorway'].includes(roadClass)) {
        baseCongestion = Math.min(1, baseCongestion * 1.3);
      } else if (['secondary', 'tertiary'].includes(roadClass)) {
        baseCongestion = Math.min(1, baseCongestion * 1.1);
      }
      
      // Add some randomness for variety
      const congestionLevel = Math.max(0, Math.min(1, 
        baseCongestion * (0.8 + Math.random() * 0.4)
      ));
      
      // Calculate estimated speed based on congestion
      const baseSpeed = getBaseSpeedForRoadClass(roadClass);
      const speed = baseSpeed * (1 - congestionLevel * 0.8);
      
      // Generate a unique ID for this road segment
      const id = `road-${roadClass}-${roadName.replace(/\s+/g, '-')}-${Math.round(center[0]*10000)}`;
      
      roads.push({
        id,
        name: roadName,
        congestionLevel,
        coordinates,
        length,
        speed
      });
    }
    
    return roads;
  } catch (error) {
    console.error("Failed to fetch nearby roads:", error);
    throw error;
  }
};

/**
 * Calculate the distance between two points in meters
 */
const calculateDistance = (point1: [number, number], point2: [number, number]): number => {
  // Haversine formula to calculate distance between two points on Earth
  const R = 6371000; // Earth radius in meters
  const φ1 = point1[1] * Math.PI / 180;
  const φ2 = point2[1] * Math.PI / 180;
  const Δφ = (point2[1] - point1[1]) * Math.PI / 180;
  const Δλ = (point2[0] - point1[0]) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
           Math.cos(φ1) * Math.cos(φ2) *
           Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
};

/**
 * Get the base speed for different road classes in km/h
 */
const getBaseSpeedForRoadClass = (roadClass: string): number => {
  switch (roadClass) {
    case 'motorway':
      return 120;
    case 'trunk':
      return 100;
    case 'primary':
      return 80;
    case 'secondary':
      return 60;
    case 'tertiary':
      return 50;
    case 'residential':
      return 30;
    default:
      return 40;
  }
};

// Helper function to calculate a new point given a starting point, bearing and distance
const mapPointAtBearing = (
  start: [number, number], 
  bearing: number, 
  distance: number
): [number, number] => {
  // Convert distance from meters to approximate degrees
  // This is a simplification and not accurate for all locations on Earth
  const radiusEarth = 6371000; // Earth's radius in meters
  const distanceDeg = distance / radiusEarth * (180 / Math.PI);
  
  // Convert bearing to radians
  const bearingRad = bearing * Math.PI / 180;
  
  // Calculate new point
  const lon1 = start[0] * Math.PI / 180;
  const lat1 = start[1] * Math.PI / 180;
  
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceDeg) +
    Math.cos(lat1) * Math.sin(distanceDeg) * Math.cos(bearingRad)
  );
  
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distanceDeg) * Math.cos(lat1),
    Math.cos(distanceDeg) - Math.sin(lat1) * Math.sin(lat2)
  );
  
  return [lon2 * 180 / Math.PI, lat2 * 180 / Math.PI];
};
