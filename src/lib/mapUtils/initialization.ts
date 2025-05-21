
import mapboxgl from 'mapbox-gl';

/**
 * Setup the basic Mapbox map instance
 */
export const initializeMap = (
  container: HTMLDivElement,
  style: string,
  token: string
): mapboxgl.Map => {
  mapboxgl.accessToken = token;
  
  const map = new mapboxgl.Map({
    container,
    style: style,
    center: [46.73, 24.59], // Riyadh coordinates
    zoom: 11,
    minZoom: 9,
    maxZoom: 16,
    attributionControl: false,
    pitch: 45,
  });
  
  // Add navigation controls
  map.addControl(
    new mapboxgl.NavigationControl({
      visualizePitch: true,
    }),
    'bottom-right'
  );
  
  // Add attribution control
  map.addControl(new mapboxgl.AttributionControl({
    compact: true
  }), 'bottom-left');
  
  return map;
};

/**
 * Setup event handlers for the map
 */
export const setupMapEventHandlers = (
  map: mapboxgl.Map,
  onFeatureSelect: (feature: any) => void
): void => {
  // Add click interaction
  map.on('click', 'hexagons-fill', (e) => {
    if (!e.features || e.features.length === 0) return;
    
    const feature = e.features[0];
    onFeatureSelect({
      properties: feature.properties
    });
    
    // Fly to the clicked feature
    map.flyTo({
      center: e.lngLat,
      zoom: Math.max(map.getZoom(), 13),
      duration: 1000,
      essential: true
    });
  });
  
  // Change cursor on hover
  map.on('mouseenter', 'hexagons-fill', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  
  map.on('mouseleave', 'hexagons-fill', () => {
    map.getCanvas().style.cursor = '';
  });
};
