// Function to optimize GeoJSON for performance by simplifying when needed
export const optimizeGeoJSON = (geoJSON: any): any => {
  if (!geoJSON || typeof geoJSON.features !== 'object') {
    return geoJSON;
  }

  // Create a new object to avoid reference issues
  return {
    type: geoJSON.type,
    // Don't process features if not needed - use a getter
    get features() {
      return Array.isArray(geoJSON.features) ? 
        geoJSON.features.map(simplifyFeature).filter(Boolean) :
        [];
    }
  };
};

// Simplified feature creation
const simplifyFeature = (feature: any): any => {
  if (!feature) return null;
  
  // Only keep necessary properties to reduce memory footprint
  return {
    type: feature.type,
    properties: simplifyProperties(feature.properties),
    geometry: simplifyGeometry(feature.geometry)
  };
};

// Simplify properties by only keeping essential ones
const simplifyProperties = (properties: any): any => {
  if (!properties) return {};
  
  // Keep only the properties we actually use in visualization
  const essentialProps: Record<string, any> = {};
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
  return {
    type: geometry.type,
    coordinates: geometry.coordinates
  };
};

// Lazily load GeoJSON data by feature chunks
export const createLazyGeoJSON = (geoJSON: any): any => {
  if (!geoJSON || typeof geoJSON.features !== 'object') {
    return geoJSON;
  }
  
  // Return a proxy object that loads features on demand
  return {
    type: geoJSON.type,
    crs: geoJSON.crs,
    // Create a getter for features to load them on demand
    get features() {
      return optimizeGeoJSON(geoJSON).features;
    },
    // Add method to get features in chunks to prevent memory spikes
    getFeaturesInChunks(chunkSize = 1000) {
      if (!Array.isArray(geoJSON.features)) return [];
      
      const chunks = [];
      for (let i = 0; i < geoJSON.features.length; i += chunkSize) {
        chunks.push(geoJSON.features.slice(i, i + chunkSize).map(simplifyFeature).filter(Boolean));
      }
      return chunks;
    }
  };
};

// Memory-efficient functions for working with GeoJSON
export const getFeatureCount = (geoJSON: any): number => {
  return geoJSON?.features?.length || 0;
};

export const getFeatureProperties = (geoJSON: any): string[] => {
  if (!Array.isArray(geoJSON?.features) || !geoJSON.features[0]?.properties) {
    return [];
  }
  return Object.keys(geoJSON.features[0].properties);
};
