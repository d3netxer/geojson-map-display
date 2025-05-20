
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/hex-grid-explorer/',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Extreme memory optimization settings
    chunkSizeWarningLimit: 2000,
    sourcemap: false, // Disable source maps in production
    minify: 'terser', // Use terser which is more memory-efficient
    terserOptions: {
      compress: {
        passes: 3, // Increase passes for better compression
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false
      }
    },
    assetsInlineLimit: 0, // Don't inline assets to avoid memory spikes
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Ultra granular chunks to prevent memory spikes
          if (id.includes('node_modules')) {
            // ArcGIS modules - split into very small chunks
            if (id.includes('@arcgis/core')) {
              if (id.includes('/views')) return 'arcgis-views';
              if (id.includes('/layers')) return 'arcgis-layers';
              if (id.includes('/widgets')) return 'arcgis-widgets';
              if (id.includes('/geometry')) return 'arcgis-geometry';
              if (id.includes('/core')) return 'arcgis-core-base';
              return 'arcgis-other';
            }
            
            // React and related libraries
            if (id.includes('react-dom')) return 'vendor-react-dom';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('react')) return 'vendor-react';
            
            // UI components
            if (id.includes('@radix-ui')) return 'vendor-radix';
            if (id.includes('lucide')) return 'vendor-icons';
            
            // Other common libraries
            if (id.includes('@tanstack')) return 'vendor-tanstack';
            if (id.includes('tailwind')) return 'vendor-styling';
            
            return 'vendor-other';
          }
          
          // Split app code to prevent large bundles
          if (id.includes('/components/')) return 'app-components';
          if (id.includes('/hooks/')) return 'app-hooks';
          if (id.includes('/lib/')) return 'app-lib';
          if (id.includes('/data/')) return 'app-data';
        },
        // Ensure small chunk sizes
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name;
          return `assets/[name]-[hash].js`;
        },
      }
    }
  }
}));
