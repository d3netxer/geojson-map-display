
/**
 * Validates a Mapbox token to ensure it has the correct format
 */
export const validateMapboxToken = (token: string): boolean => {
  if (!token || token.trim() === '') {
    console.error("Mapbox token validation failed: Empty token");
    return false;
  }
  
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    console.error("Mapbox token validation failed: Invalid format");
    return false;
  }
  return true;
};
