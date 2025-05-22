
/**
 * Helper function for direct diagnostic queries - can be used to test specific locations
 */
export const testMapboxRoadQuery = async (
  center: [number, number],
  accessToken: string,
  radius: number = 500
): Promise<RoadApiDiagnostics> => {
  // Modified to use the 'road' layer and include dedupe & geometry parameters
  const layers = 'road';
  const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${center[0]},${center[1]}.json?radius=${radius}&limit=10&layers=${layers}&dedupe&geometry=linestring&access_token=${accessToken}`;
  
  // Create diagnostics object
  const diagnostics: RoadApiDiagnostics = {
    success: false,
    location: center,
    featuresCount: 0,
    roadFeaturesCount: 0,
    requestUrl: url.replace(accessToken, 'API_KEY_HIDDEN')
  };
  
  try {
    console.log(`Testing road API at [${center[0].toFixed(5)}, ${center[1].toFixed(5)}] with radius ${radius}m using '${layers}' layer`);
    const response = await fetch(url);
    
    // Add response status to diagnostics
    diagnostics.responseStatus = response.status;
    diagnostics.responseStatusText = response.statusText;
    
    if (!response.ok) {
      diagnostics.errorMessage = `Mapbox API error: ${response.status} ${response.statusText}`;
      return diagnostics;
    }
    
    const data = await response.json();
    // Store summary of response data in diagnostics
    diagnostics.featuresCount = data.features ? data.features.length : 0;
    diagnostics.rawResponse = {
      type: data.type,
      features: data.features ? 
        data.features.map((f: any) => ({
          id: f.id,
          type: f.geometry.type,
          properties: {
            class: f.properties.class,
            name: f.properties.name
          }
        })) : []
    };
    
    // Count valid road features
    let roadFeatureCount = 0;
    
    if (data.features) {
      for (const feature of data.features) {
        // Only count line features (roads)
        if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
          roadFeatureCount++;
        }
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
