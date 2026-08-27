import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Custom hook to handle hash-based navigation
 * Automatically scrolls to the element with the ID matching the URL hash
 */
export const useScrollToHash = () => {
  const location = useLocation();

  useEffect(() => {
    // Wait for DOM to be ready
    const scrollToHash = () => {
      if (location.hash) {
        const elementId = location.hash.substring(1); // Remove the '#'
        const element = document.getElementById(elementId);
        
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      } else {
        // Scroll to top if no hash
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(scrollToHash, 100);

    return () => clearTimeout(timeoutId);
  }, [location.hash, location.pathname]);

  return null;
};

/**
 * Utility function to create hash links
 */
export const createHashLink = (path: string, hash: string) => {
  return `${path}#${hash}`;
};

export default useScrollToHash;
