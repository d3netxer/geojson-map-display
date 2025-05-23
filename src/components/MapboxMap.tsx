import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { ArrowDown, Layers, Maximize2, BarChart3, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { processGeoJSON, getColorScale, formatValue, getHeightMultiplier } from '@/lib/mapUtils';
import { findCongestedRoads, RoadSegment } from '@/lib/roadAnalysis';
import MapLegend from './MapLegend';

interface MapboxMapProps {
  apiKey?: string;
  geoJSONData: any;
  onMapInit?: (mapInstance: any) => void;
}

const MapboxMap: React.FC<MapboxMapProps> = ({ apiKey, geoJSONData, onMapInit }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<string>('mean_conge');
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [selectedRoad, setSelectedRoad] = useState<RoadSegment | null>(null);
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/mapbox/streets-v12');
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [metricStats, setMetricStats] = useState<any>(null);
  const [colorScale, setColorScale] = useState<string[]>([]);
  const [roadLayers, setRoadLayers] = useState<string[]>([]);
  const [currentGeoJSON, setCurrentGeoJSON] = useState<any>(geoJSONData);
  const [currentToken, setCurrentToken] = useState<string>(apiKey || 'pk.eyJ1IjoidGdlcnRpbiIsImEiOiJYTW5sTVhRIn0.X4B5APkxkWVaiSg3KqMCaQ');
  const [allCongestedRoads, setAllCongestedRoads] = useState<RoadSegment[]>([]);
  
  const validateMapboxToken = (token: string) => {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      toast.error('Invalid Mapbox token format');
      return false;
    }
    return true;
  };

  // Update GeoJSON data without remounting the map
  const updateGeoJSONData = (newGeoJSON: any) => {
    if (!map.current || !map.current.isStyleLoaded()) {
      console.error('Map not ready for GeoJSON update');
      return false;
    }
    
    try {
      setCurrentGeoJSON(newGeoJSON);
      const { processedGeoJSON, metricStats: stats } = processGeoJSON(newGeoJSON, metric);
      const colors = getColorScale(stats.min, stats.max, metric);
      
      console.log(`Updating GeoJSON data with ${newGeoJSON.features.length} features`);
      
      setMetricStats(stats);
      setColorScale(colors);
      
      // Update the source data
      if (map.current.getSource('riyadh-hexagons')) {
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
        
        (map.current.getSource('riyadh-hexagons') as mapboxgl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: features
        });
        
        // Update the style expressions based on the new data
        updateMapStyleExpressions(stats);
        
        return true;
      } else {
        console.error('Source not found');
        return false;
      }
    } catch (error) {
      console.error('Error updating GeoJSON data:', error);
      return false;
    }
  };
  
  // Update the Mapbox token without remounting
  const updateMapboxToken = (newToken: string) => {
    if (!validateMapboxToken(newToken)) {
      return false;
    }
    
    setCurrentToken(newToken);
    // Unfortunately, Mapbox GL JS doesn't allow changing the access token after initialization
    // We would need to recreate the map to use a new token
    toast.info('The map will use the new token for API requests');
    return true;
  };
  
  // Update the map style expressions based on metric stats
  const updateMapStyleExpressions = (stats: any) => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    
    const colors = getColorScale(stats.min, stats.max, metric);
    let colorExpression;
    let heightExpression;
    
    if (metric.includes('conge') && stats.quantiles) {
      colorExpression = [
        'step',
        ['get', metric],
        colors[0],
        stats.quantiles[1], colors[1],
        stats.quantiles[2], colors[2],
        stats.quantiles[3], colors[3],
        stats.quantiles[4], colors[4]
      ];
      
      heightExpression = [
        'step',
        ['get', metric],
        500,
        stats.quantiles[1], 800,
        stats.quantiles[2], 1200,
        stats.quantiles[3], 1600,
        stats.quantiles[4], 2000
      ];
    } else {
      colorExpression = [
        'interpolate',
        ['linear'],
        ['get', metric],
        stats.min, colors[0],
        stats.min + (stats.range * 0.25), colors[1],
        stats.min + (stats.range * 0.5), colors[2],
        stats.min + (stats.range * 0.75), colors[3],
        stats.max, colors[4],
      ];
      
      heightExpression = [
        'interpolate',
        ['linear'],
        ['get', metric],
        stats.min, 500,
        stats.max, 2000
      ];
    }
    
    map.current.setPaintProperty('hexagons-fill', 'fill-extrusion-color', colorExpression);
    map.current.setPaintProperty('hexagons-fill', 'fill-extrusion-height', heightExpression);
  };

  useEffect(() => {
    if (!mapContainer.current) return;
    
    if (!validateMapboxToken(currentToken)) {
      toast.error('Please provide a valid Mapbox access token');
      setLoading(false);
      return;
    }
    
    mapboxgl.accessToken = currentToken;
    
    console.log("Initializing map with token:", currentToken);
    
    try {
      const { processedGeoJSON, metricStats: stats } = processGeoJSON(currentGeoJSON, metric);
      const colors = getColorScale(stats.min, stats.max, metric);
      
      console.log(`Initial visualization for ${metric} with colors:`, colors);
      
      setMetricStats(stats);
      setColorScale(colors);
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [46.67, 24.71],
        zoom: 11,
        minZoom: 10,
        maxZoom: 16,
        attributionControl: false,
        pitch: 45,
      });
      
      const mapInstance = map.current;
      
      mapInstance.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'bottom-right'
      );
      
      mapInstance.addControl(new mapboxgl.AttributionControl({
        compact: true
      }), 'bottom-left');
      
      mapInstance.on('load', () => {
        console.log('Map loaded successfully');
        
        mapInstance.addSource('riyadh-hexagons', {
          type: 'geojson',
          data: processedGeoJSON,
        });
        
        // Add a source for roads that will be populated later
        mapInstance.addSource('congested-roads', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });
        
        console.log('Adding hexagon layers with features count:', processedGeoJSON.features.length);
        
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
        
        mapInstance.getSource('riyadh-hexagons').setData({
          type: 'FeatureCollection',
          features: features
        });
        
        console.log('Converted features for rendering:', features.length);
        
        let colorExpression;
        let heightExpression;
        
        if (metric.includes('conge') && stats.quantiles) {
          colorExpression = [
            'step',
            ['get', metric],
            colors[0],
            stats.quantiles[1], colors[1],
            stats.quantiles[2], colors[2],
            stats.quantiles[3], colors[3],
            stats.quantiles[4], colors[4]
          ];
          
          heightExpression = [
            'step',
            ['get', metric],
            500,
            stats.quantiles[1], 800,
            stats.quantiles[2], 1200,
            stats.quantiles[3], 1600,
            stats.quantiles[4], 2000
          ];
          
          console.log('Using quantile classification for congestion with breaks:', stats.quantiles);
        } else {
          colorExpression = [
            'interpolate',
            ['linear'],
            ['get', metric],
            stats.min, colors[0],
            stats.min + (stats.range * 0.25), colors[1],
            stats.min + (stats.range * 0.5), colors[2],
            stats.min + (stats.range * 0.75), colors[3],
            stats.max, colors[4],
          ];
          
          heightExpression = [
            'interpolate',
            ['linear'],
            ['get', metric],
            stats.min, 500,
            stats.max, 2000
          ];
        }
        
        mapInstance.addLayer({
          id: 'hexagons-fill',
          type: 'fill-extrusion',
          source: 'riyadh-hexagons',
          paint: {
            'fill-extrusion-color': colorExpression,
            'fill-extrusion-height': heightExpression,
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.5, // Changed from 0.8 to 0.5 for more transparency
          }
        });
        
        // Add road layers (initially empty)
        mapInstance.addLayer({
          id: 'roads-line',
          type: 'line',
          source: 'congested-roads',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-width': 6,
            'line-color': ['get', 'color'],
            'line-opacity': 0.8
          }
        });
        
        mapInstance.addLayer({
          id: 'roads-outline',
          type: 'line',
          source: 'congested-roads',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-width': 8,
            'line-color': '#000',
            'line-opacity': 0.3
          }
        });
        
        // Add an interaction layer
        mapInstance.addLayer({
          id: 'roads-highlight',
          type: 'line',
          source: 'congested-roads',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-width': 10,
            'line-color': '#ffffff',
            'line-opacity': 0
          }
        });
        
        // Track the road layers
        setRoadLayers(['roads-line', 'roads-outline', 'roads-highlight']);
        
        mapInstance.on('click', 'hexagons-fill', (e) => {
          if (!e.features || e.features.length === 0) return;
          
          const feature = e.features[0];
          setSelectedFeature(feature);
          setSelectedRoad(null);
          
          const coordinates = e.lngLat;
          
          mapInstance.flyTo({
            center: coordinates,
            zoom: Math.max(mapInstance.getZoom(), 13.5),
            duration: 1000,
            essential: true
          });
        });
        
        mapInstance.on('click', 'roads-highlight', (e) => {
          if (!e.features || e.features.length === 0) return;
          
          const roadId = e.features[0].properties.id;
          const roadData = JSON.parse(e.features[0].properties.roadData);
          setSelectedRoad(roadData);
          setSelectedFeature(null);
          
          // Fly to the road
          const coordinates = roadData.coordinates[Math.floor(roadData.coordinates.length / 2)];
          
          mapInstance.flyTo({
            center: coordinates,
            zoom: Math.max(mapInstance.getZoom(), 14),
            duration: 1000,
            essential: true
          });
        });
        
        mapInstance.on('mouseenter', 'hexagons-fill', () => {
          mapInstance.getCanvas().style.cursor = 'pointer';
        });
        
        mapInstance.on('mouseleave', 'hexagons-fill', () => {
          mapInstance.getCanvas().style.cursor = '';
        });
        
        mapInstance.on('mouseenter', 'roads-highlight', () => {
          mapInstance.getCanvas().style.cursor = 'pointer';
        });
        
        mapInstance.on('mouseleave', 'roads-highlight', () => {
          mapInstance.getCanvas().style.cursor = '';
        });
        
        setLoading(false);
        
        // Make map methods available to parent component
        if (onMapInit) {
          // Create an enhanced map instance with additional methods
          const enhancedMapInstance = {
            ...mapInstance,
            setSelectedFeature: (feature: any) => {
              setSelectedFeature(feature);
              setSelectedRoad(null);
            },
            setSelectedRoad: (road: RoadSegment) => {
              setSelectedRoad(road);
              setSelectedFeature(null);
              renderSelectedRoad(road);
            },
            findCongestedRoads: async (mapboxToken: string) => {
              return await findAndRenderCongestedRoads(mapboxToken);
            },
            updateGeoJSONData: (newData: any) => {
              return updateGeoJSONData(newData);
            },
            updateMapboxToken: (newToken: string) => {
              return updateMapboxToken(newToken);
            },
            flyTo: mapInstance.flyTo.bind(mapInstance)
          };
          
          onMapInit(enhancedMapInstance);
        }
        
        toast.success(`Map data loaded successfully with ${processedGeoJSON.features.length} hexagons!`);
      });
      
    } catch (error) {
      console.error('Map initialization error:', error);
      toast.error('Failed to initialize map. Check your Mapbox token and network connection.');
      setLoading(false);
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [currentToken, mapStyle]);
  
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || !map.current.getLayer('hexagons-fill')) return;
    
    try {
      const { metricStats: stats } = processGeoJSON(currentGeoJSON, metric);
      const colors = getColorScale(stats.min, stats.max, metric);
      
      console.log(`Updating visualization for ${metric} with colors:`, colors);
      
      setMetricStats(stats);
      setColorScale(colors);
      
      updateMapStyleExpressions(stats);
      
      toast.success(`Visualizing: ${getMetricLabel(metric)}`);
    } catch (error) {
      console.error('Error updating metric:', error);
    }
  }, [metric]);
  
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
  
  const handleMetricChange = (newMetric: string) => {
    setMetric(newMetric);
  };
  
  const getMetricLabel = (metricKey: string): string => {
    const labels: Record<string, string> = {
      'mean_speed': 'Average Speed (km/h)',
      'mean_conge': 'Congestion Level',
      'sum_vktkm': 'Total Vehicle Kilometers',
      'sum_urban_': 'Urban Road Length'
    };
    
    return labels[metricKey] || metricKey;
  };
  
  const toggleMapStyle = () => {
    const styles = [
      'mapbox://styles/mapbox/streets-v12',
      'mapbox://styles/mapbox/light-v11',
      'mapbox://styles/mapbox/dark-v11',
      'mapbox://styles/mapbox/satellite-streets-v12'
    ];
    
    const currentIndex = styles.indexOf(mapStyle);
    const nextIndex = (currentIndex + 1) % styles.length;
    setMapStyle(styles[nextIndex]);
    
    const styleNames = ['Standard', 'Light', 'Dark', 'Satellite'];
    toast.success(`Map style changed to ${styleNames[nextIndex]}`);
  };
  
  // Function to convert road segments to GeoJSON features
  // Enhanced to ensure roads have proper colors and properties
  const roadSegmentsToGeoJSON = (roads: RoadSegment[]) => {
    return {
      type: 'FeatureCollection',
      features: roads.map(road => {
        // Get color based on congestion level
        let color = getCongestionColor(road.congestionLevel);
        
        // If there's a selected road, make non-selected roads appear muted
        if (selectedRoad && selectedRoad.id !== road.id) {
          color = getCongestionColor(road.congestionLevel, true); // Pass true for muted version
        }
        
        // Check if coordinates are valid
        if (!road.coordinates || road.coordinates.length < 2) {
          console.warn(`Road ${road.id} has invalid coordinates:`, road.coordinates);
        }
        
        return {
          type: 'Feature',
          properties: {
            id: road.id,
            name: road.name,
            congestionLevel: road.congestionLevel,
            speed: road.speed,
            length: road.length,
            color,
            hexagonId: road.hexagonId,
            roadData: JSON.stringify(road), // Store the full road object for later
            isSelected: selectedRoad && selectedRoad.id === road.id
          },
          geometry: {
            type: 'LineString',
            coordinates: road.coordinates
          }
        };
      })
    };
  };
  
  // Function to get color based on congestion level
  // Added muted parameter to create muted colors for non-selected roads
  const getCongestionColor = (level: number, muted: boolean = false): string => {
    let baseColor;
    
    if (level < 0.3) baseColor = '#22c55e'; // Green
    else if (level < 0.6) baseColor = '#f59e0b'; // Yellow/Amber
    else baseColor = '#ef4444'; // Red
    
    // If muted, create a more transparent version of the color
    if (muted) {
      return baseColor + '99'; // Add 60% opacity
    }
    
    return baseColor;
  };
  
  // Function to render congested roads on the map
  const renderCongestedRoads = (roads: RoadSegment[]) => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    
    try {
      // Store all roads for later use when focusing on a specific road
      setAllCongestedRoads(roads);
      
      const geojson = roadSegmentsToGeoJSON(roads);
      
      console.log(`Rendering ${roads.length} roads with detailed geometry`);
      
      if (map.current.getSource('congested-roads')) {
        (map.current.getSource('congested-roads') as mapboxgl.GeoJSONSource).setData(geojson);
      }
      
      // Make road layers visible
      roadLayers.forEach(layerId => {
        map.current!.setLayoutProperty(layerId, 'visibility', 'visible');
      });
      
      // Update the road styling to highlight selected roads (if any)
      map.current.setPaintProperty('roads-line', 'line-width', [
        'case',
        ['boolean', ['get', 'isSelected'], false],
        8, // Selected road width
        6  // Regular road width
      ]);
      
      map.current.setPaintProperty('roads-outline', 'line-width', [
        'case',
        ['boolean', ['get', 'isSelected'], false],
        12, // Selected road outline width
        8   // Regular road outline width
      ]);
      
      // Set the line opacity for roads-highlight to enable hovering
      map.current.setPaintProperty('roads-highlight', 'line-opacity', 0.01);
      
      // Enhanced debugging for road geometries
      const coordinateCounts = roads.map(r => r.coordinates.length);
      const avgCoords = coordinateCounts.reduce((acc, val) => acc + val, 0) / roads.length;
      const totalPoints = coordinateCounts.reduce((acc, val) => acc + val, 0);
      
      console.log(`Average coordinates per road: ${avgCoords.toFixed(1)}`);
      console.log(`Road coordinate counts: Min=${Math.min(...coordinateCounts)}, Max=${Math.max(...coordinateCounts)}`);
      console.log(`Total road points rendered: ${totalPoints}`);
      
      // Log each road for debugging
      roads.forEach((road, index) => {
        console.log(`Road ${index+1}: "${road.name}" - ${road.coordinates.length} points, ${road.length.toFixed(0)}m`);
      });
      
      // Display roads with detailed geometry in toast
      const enhancedRoads = roads.filter(r => r.coordinates.length > 5);
      if (enhancedRoads.length > 0) {
        toast.success(`Rendering ${enhancedRoads.length} roads with detailed geometries`);
      }
      
    } catch (error) {
      console.error('Error rendering congested roads:', error);
    }
  };
  
  // Function to render a single selected road
  const renderSelectedRoad = (road: RoadSegment) => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    
    try {
      // Use all roads but highlight the selected one
      if (allCongestedRoads.length > 0) {
        // Convert to GeoJSON and render all roads, but with selected state
        const geojson = roadSegmentsToGeoJSON(allCongestedRoads);
        
        if (map.current.getSource('congested-roads')) {
          (map.current.getSource('congested-roads') as mapboxgl.GeoJSONSource).setData(geojson);
        }
        
        // Make road layers visible
        roadLayers.forEach(layerId => {
          map.current!.setLayoutProperty(layerId, 'visibility', 'visible');
        });
        
        // Update the road styling to highlight selected roads
        map.current.setPaintProperty('roads-line', 'line-width', [
          'case',
          ['boolean', ['get', 'isSelected'], false],
          8, // Selected road width
          6  // Regular road width
        ]);
        
        map.current.setPaintProperty('roads-outline', 'line-width', [
          'case',
          ['boolean', ['get', 'isSelected'], false],
          12, // Selected road outline width
          8   // Regular road outline width
        ]);
        
        console.log(`Focused on road: "${road.name}" while keeping all ${allCongestedRoads.length} roads visible`);
      } else {
        // Fallback to old behavior if there are no stored roads
        const geojson = roadSegmentsToGeoJSON([road]);
        
        if (map.current.getSource('congested-roads')) {
          (map.current.getSource('congested-roads') as mapboxgl.GeoJSONSource).setData(geojson);
        }
        
        // Make road layers visible
        roadLayers.forEach(layerId => {
          map.current!.setLayoutProperty(layerId, 'visibility', 'visible');
        });
        
        console.log(`Focused on road: "${road.name}" (fallback mode)`);
      }
      
    } catch (error) {
      console.error('Error rendering selected road:', error);
    }
  };
  
  // Function to find and render congested roads
  const findAndRenderCongestedRoads = async (mapboxToken: string) => {
    if (!map.current || !geoJSONData.features) {
      return [];
    }
    
    try {
      toast.info("Querying road network data...");
      
      // Find congested roads based on hexagon data
      const roads = await findCongestedRoads(
        map.current,
        geoJSONData.features,
        mapboxToken,
        10 // Limit to top 10 roads
      );
      
      if (roads.length > 0) {
        // Render the roads on the map
        renderCongestedRoads(roads);
        
        // Count roads with detailed geometry
        const detailedRoads = roads.filter(r => r.coordinates.length > 5);
        
        if (detailedRoads.length > 0) {
          toast.success(`Successfully rendered ${detailedRoads.length} roads with detailed geometry!`);
        } else {
          toast.info("Roads were found but detailed geometry could not be obtained. Showing simplified geometries.");
        }
      } else {
        toast.warning("No road data found for the selected area.");
      }
      
      return roads;
    } catch (error) {
      console.error('Failed to find congested roads:', error);
      toast.error('Failed to analyze road network');
      return [];
    }
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
      
      <div className="map-overlay">
        <div className="chip mb-2">Traffic Analysis</div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Riyadh Hexagonal Grid Analysis</h1>
        <p className="text-muted-foreground text-sm mb-4">
          Visualization of traffic metrics across {currentGeoJSON.features.length} hexagonal grid cells
        </p>
        <Separator className="my-3" />
        <div className="info-row">
          <span className="info-label">Current Metric</span>
          <span className="info-value">{getMetricLabel(metric)}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Grid Cells</span>
          <span className="info-value">{currentGeoJSON.features.length}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Area Coverage</span>
          <span className="info-value">Central Riyadh</span>
        </div>
      </div>
      
      {metricStats && colorScale.length > 0 && (
        <MapLegend 
          title={`${getMetricLabel(metric)}`}
          min={metricStats.min}
          max={metricStats.max}
          colorScale={colorScale}
          metric={metric}
          quantiles={metricStats.quantiles}
        />
      )}
      
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
                className="w-full justify-start" 
                size="sm"
                onClick={() => handleMetricChange('sum_urban_')}
              >
                Urban Road Length
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
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
        
        {selectedRoad && (
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="secondary" 
                size="sm" 
                className="flex items-center justify-between gap-2 w-full"
              >
                <Info size={16} />
                <span>{selectedRoad.name}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-2">
                <h3 className="font-semibold">{selectedRoad.name}</h3>
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Congestion Level:</div>
                  <div className="text-right">{Math.round(selectedRoad.congestionLevel * 100)}%</div>
                  
                  {selectedRoad.speed && (
                    <>
                      <div className="font-medium">Estimated Speed:</div>
                      <div className="text-right">{Math.round(selectedRoad.speed)} km/h</div>
                    </>
                  )}
                  
                  <div className="font-medium">Length:</div>
                  <div className="text-right">
                    {selectedRoad.length < 1000
                      ? `${Math.round(selectedRoad.length)} m`
                      : `${(selectedRoad.length / 1000).toFixed(1)} km`}
                  </div>
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
