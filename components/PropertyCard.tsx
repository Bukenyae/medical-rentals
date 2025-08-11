'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Star, Check } from 'lucide-react';

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
  proximityBadges: ProximityBadge[];
  imageUrl: string;
  imageAlt: string;
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
  proximityBadges,
  imageUrl,
  imageAlt
}: PropertyCardProps) {
  const weeklyRate = Math.round(price * 0.8);
  const monthlyRate = Math.round(price * 0.6);

  return (
    <Link
      href={`/property/${id}`}
      className="block bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer"
    >
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
      
      <div className="p-6">
        <div className="flex items-center justify-end mb-2">
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="ml-1 text-sm font-medium text-gray-900">{rating}</span>
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        
        {/* Proximity Badges */}
        <div className="flex items-center space-x-2 mb-4">
          {proximityBadges.map((badge, index) => (
            <span 
              key={index}
              className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium ${badge.bgColor} ${badge.textColor}`}
            >
              {badge.text}
            </span>
          ))}
        </div>
        
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
            <div className="text-3xl font-extrabold text-gray-900">
              From ${price} <span className="text-base font-medium text-gray-500">/ night</span>
            </div>
            <div className="mt-2 flex flex-col space-y-1 text-xs text-gray-600">
              <div className="flex items-center justify-end space-x-2">
                <span className="inline-flex items-center rounded-full border border-gray-300 px-2 py-0.5">
                  <Check className="w-3 h-3 mr-1 text-gray-600" />
                  <span className="font-medium">Weekly Discount</span>
                </span>
                <span>
                  7+ nights: 20% off — ${weeklyRate} / night
                </span>
              </div>
              <div className="flex items-center justify-end space-x-2">
                <span className="inline-flex items-center rounded-full border border-gray-300 px-2 py-0.5">
                  <Check className="w-3 h-3 mr-1 text-gray-600" />
                  <span className="font-medium">Monthly Discount</span>
                </span>
                <span>
                  21+ nights: 40% off — ${monthlyRate} / night
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
