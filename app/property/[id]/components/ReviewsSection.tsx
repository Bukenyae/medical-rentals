'use client';

import { Star } from 'lucide-react';
import Image from 'next/image';

interface ReviewsSectionProps {
  rating: number;
  reviewCount: number;
}

export default function ReviewsSection({ rating, reviewCount }: ReviewsSectionProps) {
  const reviews = [
    {
      name: "Dr. Angelica Celestin Brumfield",
      image: "/images/Reviewers/Dr. Angelica Celestine.jpg",
      date: "March 2025",
      content: "Perfect location for my assignment at OLOL. Clean, quiet, and exactly what I needed as a traveling physician."
    },
    {
      name: "Dr. Nia Jenkins",
      image: "/images/Reviewers/Dr. Nia Jenkins.jpg",
      date: "February 2025",
      content: "Belle Rouge Properties exceeded my expectations. The property was immaculate and the location was perfect for my hospital rotations and graduate research."
    },
    {
      name: "Erica Rogers, NP",
      image: "/images/Reviewers/Erica Rogers.NP.jpg",
      date: "January 2025",
      content: "Fantastic stay! The workspace was perfect for charting and study sessions. Highly recommend for medical staff, visiting scholars, and young professionals."
    },
    {
      name: "Marley Aguillard, NP",
      image: "/images/Reviewers/Marley Aguillard.NP.jpg",
      date: "December 2024",
      content: "Outstanding property management and customer service. The space was spotless and perfectly equipped for my extended assignment."
    }
  ];

  return (
    <div>
      <div className="flex items-center mb-6">
        <Star className="w-5 h-5 text-yellow-400 fill-current mr-2" />
        <span className="text-lg font-semibold">{rating} • {reviewCount} reviews</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reviews.map((review, index) => (
          <div key={index} className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-start space-x-4">
              {/* Large square reviewer image on the left */}
              <div className="w-16 h-16 relative rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={review.image}
                  alt={review.name}
                  fill
                  className="object-cover"
                />
              </div>
              {/* Review content on the right */}
              <div className="flex-1">
                <div className="mb-2">
                  <div className="font-semibold text-gray-900 text-base">{review.name}</div>
                  <div className="text-sm text-gray-500">{review.date}</div>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">
                  "{review.content}"
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
