
export const mapStyles = [
  {
    id: 'light',
    url: 'mapbox://styles/mapbox/light-v11',
    name: 'Light'
  },
  {
    id: 'dark',
    url: 'mapbox://styles/mapbox/dark-v11',
    name: 'Dark'
  },
  {
    id: 'streets',
    url: 'mapbox://styles/mapbox/streets-v12',
    name: 'Streets'
  },
  {
    id: 'satellite',
    url: 'mapbox://styles/mapbox/satellite-streets-v12',
    name: 'Satellite'
  }
];

export const getNextMapStyle = (currentStyle: string): string => {
  const currentIndex = mapStyles.findIndex(style => style.url === currentStyle);
  const nextIndex = (currentIndex + 1) % mapStyles.length;
  return mapStyles[nextIndex].url;
};

export const getMapStyleName = (styleUrl: string): string => {
  const style = mapStyles.find(style => style.url === styleUrl);
  return style ? style.name : 'Custom';
};
