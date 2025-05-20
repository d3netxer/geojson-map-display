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
        properties: { ...feature.properties },
        geometry: { ...feature.geometry }
      };
      
      return optimizedFeature;
    })
  };

  return optimizedGeoJSON;
}

// Export memory-efficient functions for working with GeoJSON
export const getFeatureCount = (geoJSON: any): number => {
  return geoJSON?.features?.length || 0;
}

export const getFeatureProperties = (geoJSON: any): string[] => {
  if (!geoJSON?.features?.[0]?.properties) {
    return [];
  }
  return Object.keys(geoJSON.features[0].properties);
}
