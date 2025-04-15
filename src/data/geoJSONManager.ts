
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

// Function to get the active dataset based on environment configuration
export const getActiveGeoJSON = () => {
  // Return the dataset based on the environment variable
  return datasets[GEOJSON_SOURCE as keyof typeof datasets] || defaultGeoJSON;
};

// Export all datasets for direct access if needed
export const geoJSONDatasets = datasets;

// Default export is the active dataset
export default getActiveGeoJSON();
