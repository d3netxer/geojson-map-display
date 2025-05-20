
// ESRI imports
import Map from '@arcgis/core/Map';
import SceneView from '@arcgis/core/views/SceneView';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';

export interface UseArcGISMapProps {
  apiKey: string;
  geoJSONData: any;
  metric: string;
  mapStyle: string;
  onFeatureSelect: (feature: any) => void;
}

export interface MapViewState {
  view: SceneView | null;
  map: Map | null;
  hexLayer: GeoJSONLayer | null;
  highlightLayer: GraphicsLayer | null;
  initialized: boolean;
}

export interface MapStats {
  min: number;
  max: number;
  mean?: number;
  range: number;
  quantiles?: number[];
}

export interface UseArcGISMapReturn {
  loading: boolean;
  metricStats: MapStats | null;
  colorScale: string[];
  initializeView: (mapContainer: HTMLDivElement) => void;
  updateMapStyle: (style: string) => void;
  error?: string | null;
}
