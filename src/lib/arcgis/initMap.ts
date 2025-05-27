
import { toast } from '@/components/ui/use-toast';
import { MapViewState } from './types';
import esriConfig from '@arcgis/core/config';
import Map from '@arcgis/core/Map';
import SceneView from '@arcgis/core/views/SceneView';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Zoom from '@arcgis/core/widgets/Zoom';
import NavigationToggle from '@arcgis/core/widgets/NavigationToggle';

// Target coordinates for Riyadh
export const RIYADH_COORDINATES = {
  longitude: 46.7319571,
  latitude: 24.5979086
};

export const validateAPIKey = (token: string): boolean => {
  if (!token || token.trim() === '') {
    toast({
      title: "API Key Error",
      description: "No API key provided",
      variant: "destructive"
    });
    return false;
  }
  return true;
};

export const configureEsriAPI = (apiKey: string): void => {
  if (apiKey) {
    esriConfig.apiKey = apiKey;
  }
};

export const createMap = (basemap: string): Map => {
  return new Map({
    basemap: basemap || "streets"
  });
};

export const createMapView = (): SceneView => {
  const { longitude, latitude } = RIYADH_COORDINATES;
  
  return new SceneView({
    container: null, // This will be set later when we have the DOM element
    map: null, // This will be set later
    center: [longitude, latitude],
    zoom: 12,
    camera: {
      position: {
        x: longitude,
        y: latitude,
        z: 15000
      },
      tilt: 55,
      heading: 0
    },
    viewpoint: {
      targetGeometry: {
        type: "point",
        x: longitude,
        y: latitude,
        spatialReference: { wkid: 4326 }
      },
      scale: 50000
    },
    environment: {
      lighting: {
        directShadowsEnabled: true,
        date: new Date()
      },
      starsEnabled: false,
      atmosphereEnabled: true
    } as any,
    popup: {
      dockEnabled: true,
      dockOptions: {
        position: "top-right",
        breakpoint: false
      }
    },
    ui: {
      components: [],
      padding: {
        bottom: 25,
        right: 25
      }
    }
  });
};

export const createGraphicsLayer = (title: string): GraphicsLayer => {
  return new GraphicsLayer({ title });
};

export const setupMapView = (
  container: HTMLDivElement, 
  mapState: MapViewState, 
  onFeatureSelect: (feature: any) => void
): void => {
  if (!mapState.view) return;

  // Set the container for the view
  mapState.view.container = container;
  mapState.view.map = mapState.map;
  
  // Add widgets and controls when view is ready
  mapState.view.when(() => {
    console.log('ArcGIS SceneView loaded successfully');
    
    if (!mapState.view) return;
    
    // Add zoom widget
    const zoom = new Zoom({
      view: mapState.view,
      layout: "vertical"
    });
    
    // Add compass widget
    const compass = new NavigationToggle({
      view: mapState.view
    });
    
    // Position widgets
    mapState.view.ui.add(zoom, "bottom-right");
    mapState.view.ui.add(compass, "bottom-right");
    
    // Center the map on Riyadh
    const { longitude, latitude } = RIYADH_COORDINATES;
    mapState.view.goTo({
      center: [longitude, latitude],
      zoom: 12,
      tilt: 55
    }, {
      duration: 0
    }).catch(error => {
      console.error("View navigation failed:", error);
    });
    
    // Add CSS for better widget visibility
    addWidgetStyles();
    
    // Setup click handler for feature selection
    setupFeatureClickHandler(mapState, onFeatureSelect);
    
    // Show success toasts
    showSuccessToasts(longitude, latitude);
  });
};

const addWidgetStyles = (): void => {
  const widgetContainer = document.createElement('style');
  widgetContainer.textContent = `
    .esri-widget {
      background-color: rgba(255, 255, 255, 0.9) !important;
      border: 1px solid rgba(0, 0, 0, 0.1) !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
    }
    .esri-zoom .esri-widget--button {
      background-color: white !important;
      color: #333 !important;
      font-weight: bold !important;
    }
    .esri-navigation-toggle {
      background-color: white !important;
    }
    .esri-navigation-toggle__button {
      color: #333 !important;
    }
  `;
  document.head.appendChild(widgetContainer);
};

const setupFeatureClickHandler = (
  mapState: MapViewState, 
  onFeatureSelect: (feature: any) => void
): void => {
  if (!mapState.view) return;
  
  mapState.view.on("click", (event) => {
    mapState.view?.hitTest(event).then((response) => {
      const results = response.results;
      if (results.length > 0) {
        const result = results.find((r: any) => {
          return r.layer && r.layer.title === "Riyadh Hexagons";
        });
        
        if (result && result.layer) {
          const feature = (result as any).graphic;
          if (feature && feature.attributes) {
            onFeatureSelect({
              properties: feature.attributes
            });
            
            mapState.view?.goTo({
              target: event.mapPoint,
              tilt: 30,
              zoom: 14
            }, {
              duration: 1000,
              easing: "ease-out"
            });
          }
        }
      }
    });
  });
};

const showSuccessToasts = (longitude: number, latitude: number): void => {
  toast({
    title: "Map Centered",
    description: `Map centered at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
  });
  
  toast({
    title: "Data Loaded",
    description: "Map data loaded successfully!"
  });
};
