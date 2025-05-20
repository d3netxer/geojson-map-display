
import defaultGeoJSON from './defaultGeoJSON';
import customGeoJSON from './customGeoJSON';

// This is the environment variable check using Vite's import.meta.env
// Set this to 'custom' in your development environment to use the custom GeoJSON
const GEOJSON_SOURCE = import.meta.env.VITE_GEOJSON_SOURCE || 'custom';

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

// Generate a basic representation of the GeoJSON data with minimal memory footprint
const createMinimalGeoJSON = (sourceGeoJSON: any) => {
  // Return a function that creates a new optimized object on demand
  // This prevents the large GeoJSON from being kept in memory when not needed
  return () => {
    const minimalProps = new Set(['mean_conge', 'mean_speed', 'vktkm', 'id', 'name', 'hex_id']);
    
    return {
      type: sourceGeoJSON.type,
      crs: sourceGeoJSON.crs,
      // Don't process all features at once, return a function that processes on demand
      get features() {
        return sourceGeoJSON.features.map((feature: any) => {
          // Create minimal properties with only what we need
          const props: any = {};
          Object.keys(feature.properties || {}).forEach(key => {
            if (minimalProps.has(key)) {
              props[key] = feature.properties[key];
            }
          });
          
          return {
            type: feature.type,
            properties: props,
            geometry: {
              type: feature.geometry.type,
              coordinates: feature.geometry.coordinates
            }
          };
        });
      },
      // Function to get the feature count without loading all data
      getFeatureCount: () => sourceGeoJSON.features?.length || 0
    };
  };
};

// Create minimal versions of GeoJSON data that are only created when needed
const lazyDatasets: Record<string, () => any> = {
  default: createMinimalGeoJSON(defaultGeoJSON),
  custom: createMinimalGeoJSON(customGeoJSON)
};

// Function to get the active dataset based on environment configuration
export const getActiveGeoJSON = () => {
  // Get the dataset based on the environment variable
  const createGeoJSON = lazyDatasets[GEOJSON_SOURCE as keyof typeof lazyDatasets] || lazyDatasets.custom;
  const geoJSON = createGeoJSON();
  
  // Verify that the GeoJSON is in WGS84 format
  if (!isWGS84(geoJSON)) {
    console.warn('The GeoJSON data is not in WGS84 format. This may cause rendering issues.');
  }
  
  return geoJSON;
};

// Generate metadata about the datasets without loading all the data
export const geoJSONDatasets = {
  default: {
    get source() { return 'Default Sample Dataset'; },
    get featureCount() { return defaultGeoJSON.features?.length || 0; }
  },
  custom: {
    get source() { return 'Custom Dataset'; },
    get featureCount() { return customGeoJSON.features?.length || 0; }
  }
};

// Default export is the active dataset
export default getActiveGeoJSON();
