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
  bedrooms,
  bathrooms,
  sqft,
  imageUrl,
  imageAlt,
  hoverTint
}: PropertyCardProps) {
  const hoverTintValue = hoverTint ?? '#FFE9D4';

  return (
    <Link
      href={`/property/${id}`}
      className="group block focus:outline-none"
    >
      <div
        className="relative"
        style={{ '--hover-tint': hoverTintValue } as CSSProperties}
      >
        <div className="relative rounded-[36px] bg-white shadow-[0_12px_28px_-26px_rgba(27,30,40,0.25)] transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]">
          <div className="absolute inset-0 rounded-[36px] bg-white transition-transform transition-colors duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.05] group-hover:bg-[var(--hover-tint)] group-hover:shadow-[0_32px_75px_-30px_rgba(27,30,40,0.45)]" />

          <div className="relative rounded-[36px] p-1.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1">
            <div className="relative overflow-hidden rounded-3xl bg-white shadow-[0_16px_26px_-28px_rgba(27,30,40,0.45)] transition-shadow duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:shadow-none">
              <div className="h-96 relative overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={imageAlt}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
              </div>

              <div className="p-6 bg-white transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] rounded-b-3xl group-hover:bg-[var(--hover-tint)]">
                <div className="flex items-center justify-end mb-2">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm font-medium text-gray-900">{rating}</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 mb-4">{description}</p>

                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <span className="mr-1">🏠</span>
                      <span>{sqft.toLocaleString()} sqft</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-1">🛏️</span>
                      <span>{bedrooms}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-1">🚿</span>
                      <span>{bathrooms}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-base font-medium text-gray-500">From</span>
                      <span className="text-3xl font-extrabold text-gray-900">${price}</span>
                      <span className="text-base font-medium text-gray-500">/ night</span>
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
