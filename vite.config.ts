
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
    // More aggressive memory optimization settings
    chunkSizeWarningLimit: 2000,
    sourcemap: false, // Disable source maps in production to reduce memory usage
    minify: 'terser', // Use terser which is more memory-efficient
    terserOptions: {
      compress: {
        // Aggressive compression
        passes: 2,
        drop_console: true,
      }
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // More granular chunks to prevent memory spikes
          if (id.includes('node_modules')) {
            if (id.includes('@arcgis/core')) {
              // Split ArcGIS into smaller chunks
              if (id.includes('@arcgis/core/views')) {
                return 'arcgis-views';
              } else if (id.includes('@arcgis/core/layers')) {
                return 'arcgis-layers';
              } else if (id.includes('@arcgis/core/widgets')) {
                return 'arcgis-widgets';
              }
              return 'arcgis-core';
            }
            
            // Group common libraries
            if (id.includes('react')) {
              return 'vendor-react';
            }
            
            return 'vendor';
          }
        }
      }
    }
  }
}));
