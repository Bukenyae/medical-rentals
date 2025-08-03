'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PropertyGalleryProps {
  images: string[];
  title: string;
}

export default function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="mb-6 lg:mb-8">
      {/* Main Image */}
      <div className="relative h-64 md:h-80 lg:h-96 bg-gray-200 rounded-lg overflow-hidden mb-3 md:mb-4">
        <div
          className="w-full h-full bg-cover bg-center transition-all duration-300"
          style={{ backgroundImage: `url(${images[currentImageIndex]})` }}
        />
        
        {/* Navigation Arrows */}
        <button
          onClick={prevImage}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={nextImage}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 transition-all"
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>

        {/* Image Counter */}
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
          {currentImageIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnail Navigation */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 transition-all ${
              index === currentImageIndex
                ? 'border-blue-500 opacity-100'
                : 'border-gray-200 opacity-60 hover:opacity-80'
            }`}
          >
            <div
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${images[index]})` }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
