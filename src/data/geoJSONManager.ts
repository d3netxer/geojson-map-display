
import defaultGeoJSON from './defaultGeoJSON';
import customGeoJSON from './customGeoJSON';

// This is the environment variable check
// Set this to 'custom' in your development environment to use the custom GeoJSON
const GEOJSON_SOURCE = process.env.REACT_APP_GEOJSON_SOURCE || 'default';

// Object containing all available datasets
const datasets = {
  default: defaultGeoJSON,
  custom: customGeoJSON,
};

// Function to check if a GeoJSON is in EPSG:3857 (Web Mercator) projection
const isWebMercator = (geojson: any): boolean => {
  if (geojson?.crs?.properties?.name) {
    return geojson.crs.properties.name.includes('3857');
  }
  return false;
};

// Function to convert Web Mercator coordinates to WGS84 (lat/long)
// This is a simplified conversion that works well enough for small areas
const convertWebMercatorToWGS84 = (x: number, y: number): [number, number] => {
  const lon = (x * 180) / 20037508.34;
  let lat = (y * 180) / 20037508.34;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return [lon, lat];
};

// Function to transform GeoJSON from Web Mercator to WGS84 if needed
const transformGeoJSONIfNeeded = (geojson: any): any => {
  if (!isWebMercator(geojson)) {
    return geojson; // Already in WGS84 or unknown CRS, return as is
  }

  console.log('Converting Web Mercator GeoJSON to WGS84');
  
  // Create a deep copy to avoid modifying the original
  const transformedGeoJSON = JSON.parse(JSON.stringify(geojson));
  
  // Update the CRS to WGS84
  transformedGeoJSON.crs = {
    type: 'name',
    properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
  };
  
  // Transform all features' coordinates
  transformedGeoJSON.features = geojson.features.map((feature: any) => {
    const newFeature = { ...feature };
    
    // Handle MultiPolygon geometry
    if (feature.geometry.type === 'MultiPolygon') {
      newFeature.geometry = {
        ...feature.geometry,
        coordinates: feature.geometry.coordinates.map((polygons: number[][][][]) => {
          return polygons.map((polygon: number[][][]) => {
            return polygon.map((ring: number[][]) => {
              return ring.map((coord: number[]) => {
                return convertWebMercatorToWGS84(coord[0], coord[1]);
              });
            });
          });
        })
      };
    }
    // Handle Polygon geometry (if needed)
    else if (feature.geometry.type === 'Polygon') {
      newFeature.geometry = {
        ...feature.geometry,
        coordinates: feature.geometry.coordinates.map((polygon: number[][][]) => {
          return polygon.map((ring: number[][]) => {
            return ring.map((coord: number[]) => {
              return convertWebMercatorToWGS84(coord[0], coord[1]);
            });
          });
        })
      };
    }
    
    return newFeature;
  });
  
  return transformedGeoJSON;
};

// Function to get the active dataset based on environment configuration
export const getActiveGeoJSON = () => {
  // Get the raw dataset based on the environment variable
  const rawGeoJSON = datasets[GEOJSON_SOURCE as keyof typeof datasets] || defaultGeoJSON;
  
  // Transform the GeoJSON if it's in Web Mercator projection
  return transformGeoJSONIfNeeded(rawGeoJSON);
};

// Export all datasets for direct access if needed
export const geoJSONDatasets = {
  default: transformGeoJSONIfNeeded(defaultGeoJSON),
  custom: transformGeoJSONIfNeeded(customGeoJSON)
};

// Default export is the active dataset
export default getActiveGeoJSON();
