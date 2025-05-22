
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
      
      // Call Mapbox API to get roads near this hexagon
      // In a real application, you would use the Mapbox Directions API or the Isochrone API
      // Here we'll simulate the response with nearby roads
      const simulatedRoads = await simulateNearbyRoads(center, hexagon.properties.mean_conge);
      
      roadSegments.push(...simulatedRoads);
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
 * This is a simulation function that would be replaced with actual API calls
 * in a production environment using the Mapbox Directions API
 */
const simulateNearbyRoads = async (
  center: [number, number],
  congestionLevel: number
): Promise<RoadSegment[]> => {
  // In a real implementation, you would make API calls to Mapbox or Google Maps
  // For demonstration purposes, we'll generate some simulated roads
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Generate 1-3 roads per hexagon
  const roadCount = Math.floor(Math.random() * 3) + 1;
  const roads: RoadSegment[] = [];
  
  // List of common road names
  const roadNames = [
    "King Fahd Road", "Olaya Street", "King Abdullah Road", "Makkah Road", 
    "Takhassusi Street", "Prince Turki Bin Abdulaziz Al Awwal Road", 
    "King Khalid Road", "Al Imam Saud Ibn Abdul Aziz Branch Road"
  ];
  
  // Generate simulated roads with congestion levels influenced by the hexagon's congestion
  for (let i = 0; i < roadCount; i++) {
    const jitter = (Math.random() - 0.5) * 0.2; // Add some randomness
    const name = roadNames[Math.floor(Math.random() * roadNames.length)];
    const roadCongestion = Math.max(0, Math.min(1, congestionLevel * (0.8 + Math.random() * 0.4)));
    
    // Create a road segment with multiple coordinates to form a curved line
    const length = Math.random() * 1000 + 500; // 500-1500 meters
    const bearing = Math.random() * 360; // random direction
    
    // Generate a more realistic road with curves
    const coordinates = generateRealisticRoadShape(center, bearing, length);
    
    roads.push({
      id: `road-${center[0]}-${center[1]}-${i}`,
      name: name + (Math.random() > 0.7 ? " (North)" : Math.random() > 0.5 ? " (South)" : ""),
      congestionLevel: roadCongestion,
      coordinates,
      length,
      speed: Math.max(5, 60 * (1 - roadCongestion)) // Speed in km/h, inversely proportional to congestion
    });
  }
  
  return roads;
};

/**
 * Generates a realistic road shape with natural curves
 */
const generateRealisticRoadShape = (
  start: [number, number], 
  initialBearing: number, 
  totalLength: number
): [number, number][] => {
  // Number of segments to create (more segments = more detailed road)
  const numSegments = Math.floor(Math.random() * 5) + 7; // 7-12 segments
  
  // Initialize coordinates array with start point
  const coordinates: [number, number][] = [start];
  
  // Track current position and bearing
  let currentPoint = start;
  let currentBearing = initialBearing;
  let remainingLength = totalLength;
  
  // Create intermediate points with natural curves
  for (let i = 0; i < numSegments - 1; i++) {
    // Determine segment length (not uniform)
    const segmentLength = remainingLength / (numSegments - i) * (0.7 + Math.random() * 0.6);
    remainingLength -= segmentLength;
    
    // Add some natural variation to the bearing
    // Roads tend to maintain their general direction but with slight curves
    const bearingChange = (Math.random() - 0.5) * 30; // -15 to 15 degree variation
    currentBearing = (currentBearing + bearingChange) % 360;
    
    // Calculate next point
    currentPoint = mapPointAtBearing(currentPoint, currentBearing, segmentLength);
    coordinates.push(currentPoint);
  }
  
  return coordinates;
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
