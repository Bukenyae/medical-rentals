'use client';

import { Star } from 'lucide-react';
import Image from 'next/image';

interface PropertyInfoProps {
  property: {
    title: string;
    location: string;
    rating: number;
    reviewCount: number;
    description: string;
    professionalsDesc?: string;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    proximityBadges: Array<{
      text: string;
      bgColor: string;
      textColor: string;
    }>;
    amenities: Array<{
      icon: any;
      label: string;
    }>;
    host: {
      name: string;
      avatar?: string;
      joinedYear?: string;
      reviewCount?: number;
      rating?: number;
    };
    hostBio?: string | null;
  };
}

export default function PropertyInfo({ property }: PropertyInfoProps) {
  const proximityBadges = Array.isArray(property.proximityBadges) ? property.proximityBadges : [];
  return (
    <div className="lg:col-span-2">
      {/* Property Title and key stats */}
      <div className="mb-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold leading-[1.15] text-gray-900 sm:leading-tight">{property.title}</h1>
          {proximityBadges.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {proximityBadges.map((badge, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${badge.bgColor} ${badge.textColor}`}
                >
                  {badge.text}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span>{property.bedrooms} bedrooms</span>
            <span>•</span>
            <span>{property.bathrooms} bathrooms</span>
            <span>•</span>
            <span>{property.sqft} sqft</span>
          </div>
        </div>
      </div>

      {/* Host Information */}
      <div className="border-t border-gray-200 pt-6 mt-6 flex flex-col gap-4 pb-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <Image
              src={property.host.avatar || '/images/host-avatar.jpg'}
              alt={property.host.name}
              width={56}
              height={56}
              className="h-14 w-14 rounded-lg object-cover"
            />
          </div>
          <div className="flex flex-col gap-1 text-sm text-gray-600">
            <h2 className="text-base text-black">
              <span className="text-[#888]">Hosted by</span>{' '}
              <span className="font-semibold">{property.host.name}</span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="font-medium text-gray-900">{property.rating.toFixed(1)}</span>
                <span className="text-gray-500">({property.reviewCount} reviews)</span>
              </div>
              {property.host.joinedYear && (
                <span>• Joined in {property.host.joinedYear}</span>
              )}
            </div>
          </div>
        </div>
        {property.hostBio && (
          <p className="text-gray-700 leading-relaxed">{property.hostBio}</p>
        )}
      </div>

      {/* Property Description */}
      <div className="pb-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">About this space</h3>
        <p className="text-gray-700 mb-4">
          {property.description || 'No description provided yet.'}
        </p>
      </div>

      {/* Indoor & Outdoor Experiences */}
      <div className="pb-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">The indoor & outdoor experiences</h3>
        <p className="text-gray-600">
          {property.professionalsDesc || 'No experience details provided yet.'}
        </p>
      </div>

      {/* Amenities */}
      <div className="pb-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">What this place offers</h3>
        <div className="grid grid-cols-2 gap-4">
          {property.amenities.map((amenity, index) => (
            <div key={index} className="flex items-center">
              <amenity.icon className="w-5 h-5 text-gray-600 mr-3" />
              <span className="text-gray-700">{amenity.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
