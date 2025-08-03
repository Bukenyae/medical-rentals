'use client';

import { useEffect } from 'react';

export default function StickyHeaderHandler() {
  useEffect(() => {
    const handleScroll = () => {
      const stickyHeader = document.getElementById('sticky-header');
      const scrollPosition = window.scrollY;
      
      if (stickyHeader) {
        if (scrollPosition > 100) {
          stickyHeader.style.transform = 'translateY(0)';
        } else {
          stickyHeader.style.transform = 'translateY(-100%)';
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return null; // This component doesn't render anything
}
