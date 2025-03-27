
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { ArrowDown, Layers, Maximize2, BarChart3, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { processGeoJSON, getColorScale, formatValue } from '@/lib/mapUtils';

interface MapboxMapProps {
  apiKey?: string;
}

// Import the GeoJSON data
const riyadhGeoJSON = {
  "type": "FeatureCollection",
  "name": "super_selected_Riyadh_23_july30_hex_WGS84",
  "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  "features": [
    { "type": "Feature", "properties": { "GRID_ID": "CN-55", "mean_speed": 50.941305680100001, "mean_segme": 16.310737263099998, "mean_seg_1": 38.034763875400003, "sum_segmen": 758263.55009599996, "sum_segm_1": 26.123420802199998, "mean_conge": 0.13895498155, "sum_vktkm": 57540.466972599999, "sum_single": 36.595141687100003, "sum_urban_": 4699.9665613400002, "sum_free_f": 30.463760708399999, "sum_free_1": 4555.54254932, "sum_free_2": 10567.414420900001, "sum_urban1": 10902.432340400001, "sum_Length": 26127.186996199998, "Polyline_C": 459, "Shape_Leng": 3722.4193630899999, "Shape_Area": 999999.96060600004 }, "geometry": { "type": "MultiPolygon", "coordinates": [ [ [ [ 46.74890825151396, 24.700020551991315 ], [ 46.743335074745183, 24.700020551991315 ], [ 46.740548485462504, 24.704405400051154 ], [ 46.743335074745183, 24.708790094555081 ], [ 46.74890825151396, 24.708790094555081 ], [ 46.751694839898342, 24.704405400051154 ], [ 46.74890825151396, 24.700020551991315 ] ] ] ] } },
    { "type": "Feature", "properties": { "GRID_ID": "CM-57", "mean_speed": 53.686225513399997, "mean_segme": 19.309876613, "mean_seg_1": 30.929234165099999, "sum_segmen": 310115.23313100002, "sum_segm_1": 23.889906328199999, "mean_conge": 0.3643552083, "sum_vktkm": 12605.6290312, "sum_single": 37.370990328600001, "sum_urban_": 1196.8990335399999, "sum_free_f": 29.047635788200001, "sum_free_1": 998.48584470599997, "sum_free_2": 2316.1705988200001, "sum_urban1": 2776.4262918099998, "sum_Length": 23890.708706900001, "Polyline_C": 456, "Shape_Leng": 3722.41953629, "Shape_Area": 1000000.05366 }, "geometry": { "type": "MultiPolygon", "coordinates": [ [ [ [ 46.740548485462504, 24.678093993556416 ], [ 46.734975308693734, 24.678093993556416 ], [ 46.732188720309345, 24.682479613988637 ], [ 46.734975308693734, 24.686865080150113 ], [ 46.740548485462504, 24.686865080150113 ], [ 46.743335074745183, 24.682479613988637 ], [ 46.740548485462504, 24.678093993556416 ] ] ] ] } },
    { "type": "Feature", "properties": { "GRID_ID": "CN-58", "mean_speed": 49.523466415800002, "mean_segme": 25.1928983484, "mean_seg_1": 23.082232604400001, "sum_segmen": 97427.007717600005, "sum_segm_1": 39.148688717399999, "mean_conge": 0.51093589183, "sum_vktkm": 4056.8687533299999, "sum_single": 66.174794542499995, "sum_urban_": 419.19113775800002, "sum_free_f": 46.739591020299997, "sum_free_1": 354.46623947799998, "sum_free_2": 822.24929527500001, "sum_urban1": 972.39053884199996, "sum_Length": 39162.66743020001, "Polyline_C": 693, "Shape_Leng": 3722.41936308, "Shape_Area": 999999.96060200001 }, "geometry": { "type": "MultiPolygon", "coordinates": [ [ [ [ 46.74890825151396, 24.673708219690027 ], [ 46.743335074745183, 24.673708219690027 ], [ 46.740548485462504, 24.678093993556416 ], [ 46.743335074745183, 24.682479613988637 ], [ 46.74890825151396, 24.682479613988637 ], [ 46.751694839898342, 24.678093993556416 ], [ 46.74890825151396, 24.673708219690027 ] ] ] ] } },
    { "type": "Feature", "properties": { "GRID_ID": "CQ-58", "mean_speed": 50.556397317600002, "mean_segme": 20.332923341499999, "mean_seg_1": 36.819361619299997, "sum_segmen": 100382.791188, "sum_segm_1": 12.735281000200001, "mean_conge": 0.18939560471, "sum_vktkm": 5791.8070419200003, "sum_single": 14.2609455464, "sum_urban_": 536.77396969799997, "sum_free_f": 12.1845037357, "sum_free_1": 488.55511681600001, "sum_free_2": 1133.29297903, "sum_urban1": 1245.14543037, "sum_Length": 12738.8938177, "Polyline_C": 198, "Shape_Leng": 3722.4194630900001, "Shape_Area": 1000000.01433 }, "geometry": { "type": "MultiPolygon", "coordinates": [ [ [ [ 46.773987548770052, 24.669322290777153 ], [ 46.768414371102949, 24.669322290777153 ], [ 46.765627782718568, 24.673708219690027 ], [ 46.768414371102949, 24.678093993556416 ], [ 46.773987548770052, 24.678093993556416 ], [ 46.776774137154447, 24.673708219690027 ], [ 46.773987548770052, 24.669322290777153 ] ] ] ] } },
    { "type": "Feature", "properties": { "GRID_ID": "CM-58", "mean_speed": 51.216341503000002, "mean_segme": 21.720363767399999, "mean_seg_1": 25.239144318800001, "sum_segmen": 209148.34439799999, "sum_segm_1": 32.438352529900001, "mean_conge": 0.45274817179, "sum_vktkm": 8663.7830053300004, "sum_single": 50.428930694500004, "sum_urban_": 856.93561790900003, "sum_free_f": 35.581831062100001, "sum_free_1": 700.11511110599997, "sum_free_2": 1624.0450926000001, "sum_urban1": 1987.8189498700001, "sum_Length": 32438.546618100001, "Polyline_C": 565, "Shape_Leng": 3722.41936308, "Shape_Area": 999999.96060200001 }, "geometry": { "type": "MultiPolygon", "coordinates": [ [ [ [ 46.740548485462504, 24.669322290777153 ], [ 46.734975308693734, 24.669322290777153 ], [ 46.732188720309345, 24.673708219690027 ], [ 46.734975308693734, 24.678093993556416 ], [ 46.740548485462504, 24.678093993556416 ], [ 46.743335074745183, 24.673708219690027 ], [ 46.740548485462504, 24.669322290777153 ] ] ] ] } },
    { "type": "Feature", "properties": { "GRID_ID": "CK-57", "mean_speed": 46.366993346100003, "mean_segme": 21.5533678175, "mean_seg_1": 27.211735409100001, "sum_segmen": 370633.65775000001, "sum_segm_1": 30.856577381800001, "mean_conge": 0.33973409605, "sum_vktkm": 16102.219606500001, "sum_single": 50.852739233100003, "sum_urban_": 1423.38261362, "sum_free_f": 40.982053358100003, "sum_free_1": 1435.7317510800001, "sum_free_2": 3330.4424767400001, "sum_urban1": 3301.79639301, "sum_Length": 30851.380518900001, "Polyline_C": 577, "Shape_Leng": 3722.4194362899998, "Shape_Area": 999999.99993699999 }, "geometry": { "type": "MultiPolygon", "coordinates": [ [ [ [ 46.723828954257897, 24.678093993556416 ], [ 46.718255777489119, 24.678093993556416 ], [ 46.715469189104738, 24.682479613988637 ], [ 46.718255777489119, 24.686865080150113 ], [ 46.723828954257897, 24.686865080150113 ], [ 46.726615542642278, 24.682479613988637 ], [ 46.723828954257897, 24.678093993556416 ] ] ] ] } },
    { "type": "Feature", "properties": { "GRID_ID": "CQ-57", "mean_speed": 49.763874337899999, "mean_segme": 22.551259332800001, "mean_seg_1": 25.166609312199999, "sum_segmen": 189738.26154800001, "sum_segm_1": 36.221939315299998, "mean_conge": 0.46262894930999998, "sum_vktkm": 9847.8350697299993, "sum_single": 53.307595384000003, "sum_urban_": 1018.08027306, "sum_free_f": 38.792650004599999, "sum_free_1": 861.92979028599996, "sum_free_2": 1999.40384642, "sum_urban1": 2361.6234603500002, "sum_Length": 36217.693001300002, "Polyline_C": 611, "Shape_Leng": 3722.4196362900002, "Shape_Area": 1000000.1074 }, "geometry": { "type": "MultiPolygon", "coordinates": [ [ [ [ 46.773987548770052, 24.678093993556416 ], [ 46.768414371102949, 24.678093993556416 ], [ 46.765627782718568, 24.682479613988637 ], [ 46.768414371102949, 24.686865080150113 ], [ 46.773987548770052, 24.686865080150113 ], [ 46.776774137154447, 24.682479613988637 ], [ 46.773987548770052, 24.678093993556416 ] ] ] ] } }
  ]
};

const MapboxMap: React.FC<MapboxMapProps> = ({ apiKey }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<string>('mean_speed');
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/mapbox/light-v11');
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  
  // Use a fallback key if none provided
  const token = apiKey || 'pk.eyJ1IjoibG92YWJsZS1haSIsImEiOiJjbHluMnZxdm0wZmdiMnFueGczZmdlYXBhIn0.a-hQZCN9R2WO2td8IZxJ9A';

  useEffect(() => {
    if (!mapContainer.current) return;
    
    // Set mapbox token
    mapboxgl.accessToken = token;
    
    // Process GeoJSON data
    const { processedGeoJSON, metricStats } = processGeoJSON(riyadhGeoJSON, metric);
    const colorScale = getColorScale(metricStats.min, metricStats.max);
    
    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [46.75, 24.68], // Center on Riyadh
      zoom: 12,
      minZoom: 10,
      maxZoom: 16,
      attributionControl: false,
      pitch: 45, // Add a slight tilt for a 3D effect
    });
    
    const mapInstance = map.current;
    
    // Add navigation controls
    mapInstance.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'bottom-right'
    );
    
    // Add attribution control in a more minimalist position
    mapInstance.addControl(new mapboxgl.AttributionControl({
      compact: true
    }), 'bottom-left');
    
    // Loading events
    mapInstance.on('load', () => {
      console.log('Map loaded');
      
      // Add the GeoJSON source
      mapInstance.addSource('riyadh-hexagons', {
        type: 'geojson',
        data: processedGeoJSON,
      });
      
      console.log('Adding hexagon layers');
      
      // Convert MultiPolygon to Polygon for better rendering
      const features = processedGeoJSON.features.map((feature: any) => {
        const newFeature = { ...feature };
        if (feature.geometry.type === 'MultiPolygon') {
          newFeature.geometry = {
            type: 'Polygon',
            coordinates: feature.geometry.coordinates[0]
          };
        }
        return newFeature;
      });
      
      // Update the source with converted features
      mapInstance.getSource('riyadh-hexagons').setData({
        type: 'FeatureCollection',
        features: features
      });
      
      // Add 3D hexagon layer
      mapInstance.addLayer({
        id: 'hexagons-fill',
        type: 'fill-extrusion',
        source: 'riyadh-hexagons',
        paint: {
          'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['get', metric],
            metricStats.min, colorScale[0],
            metricStats.min + (metricStats.range * 0.25), colorScale[1],
            metricStats.min + (metricStats.range * 0.5), colorScale[2],
            metricStats.min + (metricStats.range * 0.75), colorScale[3],
            metricStats.max, colorScale[4],
          ],
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['get', metric],
            metricStats.min, 100,  // Minimum height to ensure visibility
            metricStats.max, 1000  // Increased maximum height for better visualization
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.8,
        }
      });
      
      // Add outline layer
      mapInstance.addLayer({
        id: 'hexagons-outline',
        type: 'line',
        source: 'riyadh-hexagons',
        paint: {
          'line-color': 'rgba(255, 255, 255, 0.5)',
          'line-width': 1,
        }
      });
      
      // Click event to get hexagon info
      mapInstance.on('click', 'hexagons-fill', (e) => {
        if (!e.features || e.features.length === 0) return;
        
        const feature = e.features[0];
        setSelectedFeature(feature);
        
        // Create popup at click point
        const coordinates = e.lngLat;
        
        // Fly to the clicked hexagon
        mapInstance.flyTo({
          center: coordinates,
          zoom: Math.max(mapInstance.getZoom(), 13.5),
          duration: 1000,
          essential: true
        });
        
        toast.success(`Selected Grid ${feature.properties.GRID_ID}`);
      });
      
      // Change cursor on hover
      mapInstance.on('mouseenter', 'hexagons-fill', () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });
      
      mapInstance.on('mouseleave', 'hexagons-fill', () => {
        mapInstance.getCanvas().style.cursor = '';
      });
      
      // Hide loading indicator
      setLoading(false);
      
      // Show success toast when map is loaded
      toast.success("Map data loaded successfully!");
    });
    
    // Handle errors
    mapInstance.on('error', (e) => {
      console.error('Mapbox error:', e);
      toast.error('Error loading map. Please check your Mapbox API key or try again later.');
      setLoading(false);
    });
    
    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [token, mapStyle, metric]);
  
  // Update the metric when it changes
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || !map.current.getLayer('hexagons-fill')) return;
    
    // Process GeoJSON data for the new metric
    const { metricStats } = processGeoJSON(riyadhGeoJSON, metric);
    const colorScale = getColorScale(metricStats.min, metricStats.max);
    
    try {
      // Update layer styles
      map.current.setPaintProperty('hexagons-fill', 'fill-extrusion-color', [
        'interpolate',
        ['linear'],
        ['get', metric],
        metricStats.min, colorScale[0],
        metricStats.min + (metricStats.range * 0.25), colorScale[1],
        metricStats.min + (metricStats.range * 0.5), colorScale[2],
        metricStats.min + (metricStats.range * 0.75), colorScale[3],
        metricStats.max, colorScale[4],
      ]);
      
      map.current.setPaintProperty('hexagons-fill', 'fill-extrusion-height', [
        'interpolate',
        ['linear'],
        ['get', metric],
        metricStats.min, 100,
        metricStats.max, 1000
      ]);
      
      toast.success(`Visualizing: ${getMetricLabel(metric)}`);
    } catch (error) {
      console.error('Error updating metric:', error);
    }
  }, [metric]);
  
  // Handle fullscreen toggle
  useEffect(() => {
    if (!mapContainer.current) return;
    
    if (fullscreen) {
      mapContainer.current.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
        setFullscreen(false);
      });
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  }, [fullscreen]);
  
  // Handle metric change
  const handleMetricChange = (newMetric: string) => {
    setMetric(newMetric);
  };
  
  // Get human-readable metric label
  const getMetricLabel = (metricKey: string): string => {
    const labels: Record<string, string> = {
      'mean_speed': 'Average Speed (km/h)',
      'mean_conge': 'Congestion Level',
      'sum_vktkm': 'Total Vehicle Kilometers',
      'sum_urban_': 'Urban Road Length',
      'mean_segme': 'Average Segment Length'
    };
    
    return labels[metricKey] || metricKey;
  };
  
  // Toggle map style
  const toggleMapStyle = () => {
    const styles = [
      'mapbox://styles/mapbox/light-v11',
      'mapbox://styles/mapbox/dark-v11',
      'mapbox://styles/mapbox/streets-v12',
      'mapbox://styles/mapbox/satellite-streets-v12'
    ];
    
    const currentIndex = styles.indexOf(mapStyle);
    const nextIndex = (currentIndex + 1) % styles.length;
    setMapStyle(styles[nextIndex]);
    
    const styleNames = ['Light', 'Dark', 'Streets', 'Satellite'];
    toast.success(`Map style changed to ${styleNames[nextIndex]}`);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p className="mt-4 text-muted-foreground animate-pulse">Loading map visualization...</p>
        </div>
      )}
      
      <div ref={mapContainer} className="map-container" />
      
      {/* Title Overlay */}
      <div className="map-overlay">
        <div className="chip mb-2">Traffic Analysis</div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Riyadh Hexagonal Grid Analysis</h1>
        <p className="text-muted-foreground text-sm mb-4">
          Visualization of traffic metrics across Riyadh's hexagonal grid cells
        </p>
        <Separator className="my-3" />
        <div className="info-row">
          <span className="info-label">Current Metric</span>
          <span className="info-value">{getMetricLabel(metric)}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Grid Cells</span>
          <span className="info-value">{riyadhGeoJSON.features.length}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Area Coverage</span>
          <span className="info-value">Central Riyadh</span>
        </div>
      </div>
      
      {/* Map Controls */}
      <div className="map-control">
        <Button 
          variant="secondary" 
          size="sm" 
          className="flex items-center justify-between gap-2 w-full" 
          onClick={toggleMapStyle}
        >
          <Layers size={16} />
          <span>Change Style</span>
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="secondary" 
              size="sm" 
              className="flex items-center justify-between gap-2 w-full"
            >
              <BarChart3 size={16} />
              <span>Select Metric</span>
              <ArrowDown size={14} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="end">
            <div className="p-2">
              <Button 
                variant={metric === 'mean_speed' ? 'default' : 'ghost'} 
                className="w-full justify-start mb-1" 
                size="sm"
                onClick={() => handleMetricChange('mean_speed')}
              >
                Average Speed
              </Button>
              <Button 
                variant={metric === 'mean_conge' ? 'default' : 'ghost'} 
                className="w-full justify-start mb-1" 
                size="sm"
                onClick={() => handleMetricChange('mean_conge')}
              >
                Congestion Level
              </Button>
              <Button 
                variant={metric === 'sum_vktkm' ? 'default' : 'ghost'} 
                className="w-full justify-start mb-1" 
                size="sm"
                onClick={() => handleMetricChange('sum_vktkm')}
              >
                Vehicle Kilometers
              </Button>
              <Button 
                variant={metric === 'sum_urban_' ? 'default' : 'ghost'} 
                className="w-full justify-start mb-1" 
                size="sm"
                onClick={() => handleMetricChange('sum_urban_')}
              >
                Urban Road Length
              </Button>
              <Button 
                variant={metric === 'mean_segme' ? 'default' : 'ghost'} 
                className="w-full justify-start" 
                size="sm"
                onClick={() => handleMetricChange('mean_segme')}
              >
                Segment Length
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        
        <Button 
          variant="secondary" 
          size="sm" 
          className="flex items-center justify-between gap-2 w-full"
          onClick={() => setFullscreen(!fullscreen)}
        >
          <Maximize2 size={16} />
          <span>{fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </Button>
        
        {selectedFeature && (
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="secondary" 
                size="sm" 
                className="flex items-center justify-between gap-2 w-full"
              >
                <Info size={16} />
                <span>Grid {selectedFeature.properties.GRID_ID}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-2">
                <h3 className="font-semibold">Hexagon Grid {selectedFeature.properties.GRID_ID}</h3>
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Average Speed:</div>
                  <div className="text-right">{selectedFeature.properties.mean_speed.toFixed(1)} km/h</div>
                  
                  <div className="font-medium">Congestion Level:</div>
                  <div className="text-right">{selectedFeature.properties.mean_conge.toFixed(2)}</div>
                  
                  <div className="font-medium">Vehicle Kilometers:</div>
                  <div className="text-right">{selectedFeature.properties.sum_vktkm.toFixed(0)} km</div>
                  
                  <div className="font-medium">Urban Road Length:</div>
                  <div className="text-right">{selectedFeature.properties.sum_urban_.toFixed(0)} m</div>
                  
                  <div className="font-medium">Avg Segment Length:</div>
                  <div className="text-right">{selectedFeature.properties.mean_segme.toFixed(1)} m</div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};

export default MapboxMap;
