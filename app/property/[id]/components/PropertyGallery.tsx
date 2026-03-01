'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface PropertyGalleryProps {
  images: string[];
  title: string;
  onBack?: () => void;
}

export default function PropertyGallery({ images, title, onBack }: PropertyGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [thumbnailPage, setThumbnailPage] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

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
    <div className="-mx-4 mb-6 sm:mx-0 lg:mb-8">
      <div className="lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-6">
        {/* Main Image */}
        <div
          className="relative aspect-[4/3] bg-gray-200 overflow-hidden sm:aspect-[16/10] sm:rounded-2xl lg:aspect-[4/3]"
          onTouchStart={(event) => {
            const start = event.touches?.[0]?.clientX;
            setTouchStartX(typeof start === 'number' ? start : null);
          }}
          onTouchEnd={(event) => {
            if (touchStartX === null || !hasMultipleImages) return;
            const end = event.changedTouches?.[0]?.clientX;
            if (typeof end !== 'number') {
              setTouchStartX(null);
              return;
            }
            const delta = touchStartX - end;
            if (Math.abs(delta) > 45) {
              if (delta > 0) nextImage();
              else prevImage();
            }
            setTouchStartX(null);
          }}
        >
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="absolute left-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-gray-900 shadow-sm backdrop-blur md:hidden"
              aria-label="Back to properties"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          <Image
            src={currentImage}
            alt={title}
            fill
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover transition-transform duration-300"
            priority
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" />

          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={prevImage}
                className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 transition-all hover:bg-white md:inline-flex"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              <button
                type="button"
                onClick={nextImage}
                className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 transition-all hover:bg-white md:inline-flex"
                aria-label="Next photo"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </>
          )}

          {hasMultipleImages && (
            <div className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white lg:right-4 lg:top-auto lg:bottom-4 lg:text-sm">
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

    </div>
  );
}
