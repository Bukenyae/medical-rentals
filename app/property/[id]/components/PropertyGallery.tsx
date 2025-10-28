'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface PropertyGalleryProps {
  images: string[];
  title: string;
}

export default function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [thumbnailPage, setThumbnailPage] = useState(0);

  const THUMBNAILS_PER_PAGE = 9;
  const totalThumbnailPages = useMemo(() => {
    if (images.length === 0) return 1;
    return Math.ceil(images.length / THUMBNAILS_PER_PAGE);
  }, [images.length]);

  const goToImage = (index: number) => {
    if (!images.length) return;
    const normalized = ((index % images.length) + images.length) % images.length;
    setCurrentImageIndex(normalized);
    setThumbnailPage(Math.floor(normalized / THUMBNAILS_PER_PAGE));
  };

  const nextImage = () => {
    if (!images.length) return;
    goToImage(currentImageIndex + 1);
  };

  const prevImage = () => {
    if (!images.length) return;
    goToImage(currentImageIndex - 1);
  };

  const showPrevThumbPage = () => {
    if (totalThumbnailPages <= 1) return;
    setThumbnailPage((prev) => (prev - 1 + totalThumbnailPages) % totalThumbnailPages);
  };

  const showNextThumbPage = () => {
    if (totalThumbnailPages <= 1) return;
    setThumbnailPage((prev) => (prev + 1) % totalThumbnailPages);
  };

  const thumbnailStartIndex = thumbnailPage * THUMBNAILS_PER_PAGE;
  const thumbnailSlice = images.slice(thumbnailStartIndex, thumbnailStartIndex + THUMBNAILS_PER_PAGE);
  const hasMultipleImages = images.length > 1;
  const hasImages = images.length > 0;
  const currentImage = hasImages ? images[currentImageIndex] : '/images/placeholder/house.jpg';

  return (
    <div className="mb-6 lg:mb-8">
      <div className="lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-6">
        {/* Main Image */}
        <div className="relative aspect-[16/11] md:aspect-[16/10] lg:aspect-[4/3] bg-gray-200 rounded-2xl overflow-hidden">
          <Image
            src={currentImage}
            alt={title}
            fill
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover transition-transform duration-300"
            priority
          />

          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={prevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-all"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              <button
                type="button"
                onClick={nextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-all"
                aria-label="Next photo"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </>
          )}

          {hasMultipleImages && (
            <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {currentImageIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Thumbnail Grid for desktop */}
        {hasImages && (
          <div className="hidden lg:flex lg:flex-col lg:gap-4">
            {totalThumbnailPages > 1 && (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={showPrevThumbPage}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
                  aria-label="Previous thumbnails"
                  disabled={totalThumbnailPages <= 1}
                >
                  Prev
                </button>
                <div className="text-xs text-gray-500">
                  Page {thumbnailPage + 1} of {totalThumbnailPages}
                </div>
                <button
                  type="button"
                  onClick={showNextThumbPage}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
                  aria-label="Next thumbnails"
                  disabled={totalThumbnailPages <= 1}
                >
                  Next
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {thumbnailSlice.map((image, idx) => {
                const absoluteIndex = thumbnailStartIndex + idx;
                const isActive = absoluteIndex === currentImageIndex;
                return (
                  <button
                    key={absoluteIndex}
                    type="button"
                    onClick={() => goToImage(absoluteIndex)}
                    className={`relative aspect-square rounded-xl overflow-hidden border transition-all ${
                      isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'
                    }`}
                    aria-label={`View photo ${absoluteIndex + 1}`}
                  >
                    <Image
                      src={image}
                      alt={`Thumbnail ${absoluteIndex + 1}`}
                      fill
                      sizes="144px"
                      className="object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Mobile thumbnail strip */}
      {hasImages && (
        <div className="mt-3 flex space-x-2 overflow-x-auto pb-2 scrollbar-hide lg:hidden">
          {images.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToImage(index)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentImageIndex
                  ? 'border-blue-500 opacity-100'
                  : 'border-gray-200 opacity-60 hover:opacity-80'
              }`}
              aria-label={`View photo ${index + 1}`}
            >
              <Image
                src={images[index]}
                alt={`Thumbnail ${index + 1}`}
                width={56}
                height={56}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
