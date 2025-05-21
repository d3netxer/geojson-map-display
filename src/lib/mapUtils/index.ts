
export * from '@/lib/mapUtils/validation';
export * from '@/lib/mapUtils/visualization';
export * from '@/lib/mapUtils/initialization';
export * from '@/lib/mapUtils/geoJsonProcessing';

// Re-export existing functions from the original mapUtils.ts
export { processGeoJSON, getColorScale, formatValue, getHeightMultiplier } from '@/lib/mapUtils';
