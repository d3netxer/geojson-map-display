
import defaultGeoJSON from './defaultGeoJSON';
import customGeoJSON from './customGeoJSON';

// This is the environment variable check using Vite's import.meta.env
// Set this to 'custom' in your development environment to use the custom GeoJSON
const GEOJSON_SOURCE = import.meta.env.VITE_GEOJSON_SOURCE || 'custom';

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

// Function to check if a GeoJSON is in WGS84 (CRS:84/EPSG:4326) projection
const isWGS84 = (geojson: any): boolean => {
  if (!geojson?.crs) {
    // GeoJSON without CRS specification defaults to WGS84 according to the spec
    return true;
  }
  
  if (geojson.crs?.properties?.name) {
    return geojson.crs.properties.name.includes('CRS84') || 
           geojson.crs.properties.name.includes('4326');
  }
  
  return false;
};

// Function to get the active dataset based on environment configuration
export const getActiveGeoJSON = () => {
  // Get the dataset based on the environment variable
  const geoJSON = datasets[GEOJSON_SOURCE as keyof typeof datasets] || customGeoJSON;
  
  // Verify that the GeoJSON is in WGS84 format
  if (!isWGS84(geoJSON)) {
    console.warn('The GeoJSON data is not in WGS84 format. This may cause rendering issues.');
  }
  
  return geoJSON;
};

// Export all datasets for direct access if needed
export const geoJSONDatasets = {
  default: defaultGeoJSON,
  custom: customGeoJSON
};

// Default export is the active dataset
export default getActiveGeoJSON();
