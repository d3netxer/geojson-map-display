// Function to optimize GeoJSON for performance by simplifying when needed
export const optimizeGeoJSON = (geoJSON: any): any => {
  if (!geoJSON || !geoJSON.features || geoJSON.features.length === 0) {
    return geoJSON;
  }

  // Create a new object to avoid reference issues
  const optimizedGeoJSON = {
    type: geoJSON.type,
    features: geoJSON.features.map((feature: any) => {
      // Only keep necessary properties to reduce memory footprint
      const optimizedFeature = {
        type: feature.type,
        properties: simplifyProperties(feature.properties),
        geometry: simplifyGeometry(feature.geometry)
      };
      
      return optimizedFeature;
    }).filter(Boolean)
  };

  return optimizedGeoJSON;
};

// Simplify properties by only keeping essential ones
const simplifyProperties = (properties: any): any => {
  if (!properties) return {};
  
  // Keep only the properties we actually use in visualization
  const essentialProps: Record<string, any> = {};
  
  // List of properties we actually use in the app
  const usedProps = ['mean_conge', 'mean_speed', 'vktkm', 'id', 'name', 'hex_id'];
  
  for (const key of usedProps) {
    if (properties[key] !== undefined) {
      essentialProps[key] = properties[key];
    }
  }
  
  return essentialProps;
};

// Simplify geometry to reduce memory footprint
const simplifyGeometry = (geometry: any): any => {
  if (!geometry) return null;

  // Create a new object with only the necessary properties
  return {
    type: geometry.type,
    coordinates: geometry.coordinates
    // We don't modify coordinates here for precision, but in a real app
    // you might implement Douglas-Peucker algorithm for polygon simplification
  };
};

// Lazily load GeoJSON data by feature chunks
export const createLazyGeoJSON = (geoJSON: any): any => {
  if (!geoJSON || !geoJSON.features || geoJSON.features.length === 0) {
    return geoJSON;
  }
  
  // Return a proxy object that loads features on demand
  return {
    type: geoJSON.type,
    // Create a getter for features to load them on demand
    get features() {
      return optimizeGeoJSON(geoJSON).features;
    },
    // Add method to get features in chunks to prevent memory spikes
    getFeaturesInChunks(chunkSize = 1000) {
      const features = geoJSON.features;
      const chunks = [];
      
      for (let i = 0; i < features.length; i += chunkSize) {
        chunks.push(features.slice(i, i + chunkSize).map((feature: any) => ({
          type: feature.type,
          properties: simplifyProperties(feature.properties),
          geometry: simplifyGeometry(feature.geometry)
        })));
      }
      
      return chunks;
    }
  };
};

// Export memory-efficient functions for working with GeoJSON
export const getFeatureCount = (geoJSON: any): number => {
  return geoJSON?.features?.length || 0;
};

export const getFeatureProperties = (geoJSON: any): string[] => {
  if (!geoJSON?.features?.[0]?.properties) {
    return [];
  }
  return Object.keys(geoJSON.features[0].properties);
};
