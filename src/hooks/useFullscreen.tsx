
import { useEffect, useState } from 'react';

export const useFullscreen = (containerRef: React.RefObject<HTMLDivElement>) => {
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    if (fullscreen) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
        setFullscreen(false);
      });
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  }, [fullscreen, containerRef]);
  
  const toggleFullscreen = () => setFullscreen(!fullscreen);
  
  return { fullscreen, toggleFullscreen };
};
