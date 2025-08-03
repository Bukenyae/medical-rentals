'use client';

import { Star } from 'lucide-react';

interface PropertyInfoProps {
  property: {
    title: string;
    location: string;
    rating: number;
    reviewCount: number;
    description: string;
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
    };
  };
}

export default function PropertyInfo({ property }: PropertyInfoProps) {
  return (
    <div className="lg:col-span-2">
      {/* Property Title and Rating */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{property.title}</h1>
        <div className="flex items-center mb-2">
          <div className="flex items-center">
            <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
            <span className="font-medium">{property.rating}</span>
            <span className="text-gray-500 ml-1">({property.reviewCount} reviews)</span>
          </div>
        </div>
        
        {/* Proximity Badges */}
        <div className="flex items-center space-x-2 mb-4">
          {property.proximityBadges.map((badge, index) => (
            <span key={index} className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium ${badge.bgColor} ${badge.textColor}`}>
              {badge.text}
            </span>
          ))}
        </div>
      </div>

      {/* Host Information */}
      <div className="flex items-center justify-between pb-6 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Hosted by {property.host.name}
          </h2>
          <div className="flex items-center space-x-2 text-gray-600 mt-1">
            <span>{property.bedrooms} bedrooms</span>
            <span>•</span>
            <span>{property.bathrooms} bathrooms</span>
            <span>•</span>
            <span>{property.sqft} sqft</span>
          </div>
        </div>
        <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-lg font-semibold text-gray-700">
            {property.host.name.charAt(0)}
          </span>
        </div>
      </div>

      {/* Property Description */}
      <div className="pb-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">About this space</h3>
        <p className="text-gray-700 mb-4">
          {property.description}
        </p>
      </div>

      {/* Medical Professionals Description */}
      <div className="pb-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Perfect for Medical Professionals</h3>
        <p className="text-gray-600">
          Specially designed for traveling nurses, doctors, and healthcare workers. 
          Quiet neighborhood with easy hospital access and dedicated workspace.
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
