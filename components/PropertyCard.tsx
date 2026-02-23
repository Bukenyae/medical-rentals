'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';
import type { CSSProperties } from 'react';

interface ProximityBadge {
  text: string;
  bgColor: string;
  textColor: string;
}

interface PropertyCardProps {
  id: string;
  title: string;
  description: string;
  rating: number;
  reviewCount: number;
  price: number;
  minimumNights?: number | null;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  imageUrl: string;
  imageAlt: string;
  hoverTint?: string;
}

export default function PropertyCard({
  id,
  title,
  description,
  rating,
  reviewCount,
  price,
  minimumNights,
  bedrooms,
  bathrooms,
  sqft,
  imageUrl,
  imageAlt,
  hoverTint
}: PropertyCardProps) {
  const hoverTintValue = hoverTint ?? '#FFE9D4';
  const minNights = typeof minimumNights === 'number' && minimumNights > 0 ? minimumNights : 1;
  const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
  const minimumStayTotal = currency.format(Math.max(0, Math.round(price * minNights)));
  const nightlyLabel = currency.format(price);

  return (
    <Link
      href={`/property/${id}`}
      className="group block focus:outline-none"
    >
      <div
        className="relative"
        style={{ '--hover-tint': hoverTintValue } as CSSProperties}
      >
        <div className="relative rounded-[24px] sm:rounded-[36px] bg-white shadow-[0_12px_28px_-26px_rgba(27,30,40,0.25)] transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]">
          <div className="absolute inset-0 rounded-[24px] sm:rounded-[36px] bg-white transition-transform transition-colors duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.05] group-hover:bg-[var(--hover-tint)] group-hover:shadow-[0_32px_75px_-30px_rgba(27,30,40,0.45)] group-focus-visible:scale-[1.05] group-focus-visible:bg-[var(--hover-tint)] group-focus-visible:shadow-[0_32px_75px_-30px_rgba(27,30,40,0.45)] group-active:scale-[1.03] group-active:bg-[var(--hover-tint)] group-active:shadow-[0_28px_65px_-26px_rgba(27,30,40,0.4)]" />

          <div className="relative rounded-[24px] sm:rounded-[36px] p-1 sm:p-1.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1 group-focus-visible:-translate-y-1 group-active:-translate-y-0.5">
            <div className="relative overflow-hidden rounded-[20px] sm:rounded-3xl bg-white shadow-[0_16px_26px_-28px_rgba(27,30,40,0.45)] transition-shadow duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:shadow-none group-focus-visible:shadow-none group-active:shadow-none">
              <div className="h-36 sm:h-64 lg:h-96 relative overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={imageAlt}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
              </div>

              <div className="p-3 sm:p-6 bg-white transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] rounded-b-[20px] sm:rounded-b-3xl group-hover:bg-[var(--hover-tint)] group-focus-visible:bg-[var(--hover-tint)] group-active:bg-[var(--hover-tint)]">
                <div className="flex items-center justify-end mb-1 sm:mb-2">
                  <div className="flex items-center">
                    <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-xs sm:text-sm font-medium text-gray-900">{rating}</span>
                  </div>
                </div>

                <h3 className="text-sm sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2 leading-tight">{title}</h3>
                <p className="hidden sm:block text-gray-600 mb-4">{description}</p>

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
                  <div className="flex items-center gap-2 sm:space-x-4 text-xs sm:text-sm text-gray-600">
                    <div className="hidden sm:flex items-center">
                      <span className="mr-1">🏠</span>
                      <span>{sqft.toLocaleString()} sqft</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-1 text-base sm:text-sm">🛏️</span>
                      <span>{bedrooms}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-1 text-base sm:text-sm">🚿</span>
                      <span>{bathrooms}</span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="flex flex-col items-start sm:items-end gap-1">
                      <div className="flex items-baseline justify-start sm:justify-end gap-1">
                        <span className="text-[10px] sm:text-base font-medium text-gray-500">From</span>
                        <span className="text-base sm:text-3xl font-extrabold text-gray-900">{minimumStayTotal}</span>
                        <span className="hidden sm:inline text-base font-medium text-gray-500">
                          for {minNights} {minNights === 1 ? 'night' : 'nights'}
                        </span>
                      </div>
                      <div className="text-xs sm:text-xs text-gray-500">
                        {nightlyLabel}/night
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
