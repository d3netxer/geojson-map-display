
import mapboxgl from 'mapbox-gl';

/**
 * Process and add GeoJSON data to the map
 */
export const addGeoJSONToMap = (
  map: mapboxgl.Map,
  processedGeoJSON: any
): void => {
  // Add GeoJSON source
  map.addSource('riyadh-hexagons', {
    type: 'geojson',
    data: processedGeoJSON,
  });
  
  console.log('Adding hexagon layers with features count:', processedGeoJSON.features.length);
  
  // Process features to handle MultiPolygon geometries
  const features = processedGeoJSON.features.map((feature: any) => {
    const newFeature = { ...feature };
    if (feature.geometry && feature.geometry.type === 'MultiPolygon') {
      newFeature.geometry = {
        type: 'Polygon',
        coordinates: feature.geometry.coordinates[0]
      };
    }
    return newFeature;
  });
  
  // Update the source with processed features
  map.getSource('riyadh-hexagons').setData({
    type: 'FeatureCollection',
    features: features
  });
};
