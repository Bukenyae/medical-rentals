'use client';

import Image from 'next/image';
import { Clock, Award, Users, Star, Heart } from 'lucide-react';

interface PropertyManagementSectionProps {
  showHeading?: boolean;
  className?: string;
}

export default function PropertyManagementSection({ showHeading = true, className = '' }: PropertyManagementSectionProps = {}) {
  const features = [
    // 24/7 Support (top), Quality Guarantee (bottom) — "Trusted Homes" removed per request
    {
      icon: Clock,
      title: "Around-the-Clock Care",
      description: "We are dedicated to providing attentive support whenever you need it, ensuring your comfort and peace of mind throughout your stay."
    },
    {
      icon: Award,
      title: "Our Promise of Quality",
      description: "We stand behind the cleanliness, comfort, and thoughtful amenities of each home; your well-being is at the heart of our service."
    },
  ];

  // Concise titles for bottom row
  const conciseTitles = [
    '24/7 Support',
    'Quality Promise',
  ];

  // Stats cards duplicated from Reviews section content
  const stats = [
    {
      icon: Users,
      number: "500+",
      label: "Professionals Served",
      description: "Safe haven for every professional community",
    },
    {
      icon: Star,
      number: "4.9",
      label: "Average Rating",
      description: "Consistently excellent guest experiences",
    },
    {
      icon: Heart,
      number: "98%",
      label: "Guest Satisfaction",
      description: "Exceeding expectations every stay",
    },
  ];

  const imageTopClasses = showHeading
    ? 'top-52 sm:top-64 md:top-72 lg:top-80'
    : 'top-8 sm:top-10 md:top-12 lg:top-14';

  return (
    <section
      className={`pt-4 md:pt-6 lg:pt-8 pb-16 md:pb-32 lg:pb-72 relative overflow-hidden min-h-[840px] sm:min-h-[960px] md:min-h-[1120px] lg:min-h-[1280px] ${className}`.trim()}
    >
      {/* Top subtitle (moved off the image, black text) */}
      {showHeading && (
        <div className="relative z-50 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3 pb-4 sm:pb-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
              Ethos
            </h2>
            <p className="w-full text-center text-gray-600 text-xl leading-snug font-medium mx-auto max-w-3xl sm:max-w-4xl lg:max-w-5xl">
              As owners and operators, we embrace a philosophy of meticulous care and attention to every detail, so you can confidently focus on what truly matters—your work, studies, service, and the moments that make life meaningful.
            </p>
          </div>
        </div>
      )}
      {/* Background Image (pushed down to make room for subtitle) */}
      <div className={`absolute inset-x-0 bottom-0 ${imageTopClasses} overflow-hidden`}>
        <Image
          src="/images/properties/Lexington/Front-Profile.png"
          alt="Lexington - Front Profile"
          fill
          className="object-cover sm:object-contain object-center transform scale-[1.5] sm:scale-[1.5125] origin-center"
        />
      </div>

      {/* Content container (left column retained but logo moved to overlay) */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="w-full md:w-2/3 lg:w-1/2 xl:w-1/3">
          {/* Paragraph moved to overlay */}
        </div>
      </div>

      {/* Overlay content container (features removed; bottom row retained) */}
      <div className={`absolute inset-x-0 bottom-0 ${imageTopClasses} z-30 pointer-events-none`}>
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Contact + social bar anchored to bottom INSIDE overlay */}
          <div className="absolute inset-x-0 bottom-2 sm:bottom-3 md:bottom-0 z-40 pointer-events-auto">
            <div className="w-full py-3 md:py-4 px-2 sm:px-3 md:px-4 pb-[env(safe-area-inset-bottom)] flex flex-row items-center justify-center gap-1 sm:gap-2 md:gap-3 whitespace-nowrap bg-white/80 lg:bg-transparent backdrop-blur-sm lg:backdrop-blur-0 text-gray-900 lg:text-white max-w-[880px] sm:max-w-[920px] md:max-w-[980px] mx-auto">
              {/* Left: Mobile */}
              <div className="flex items-center space-x-1 sm:space-x-2 order-1 whitespace-nowrap">
                <span className="text-xs sm:text-sm font-semibold">Mobile:</span>
                <span className="text-xs sm:text-sm">+1 (225) 936-3650</span>
              </div>

              {/* Middle: Email */}
              <div className="flex items-center space-x-1 sm:space-x-2 order-3 md:order-none justify-center whitespace-nowrap">
                <span className="text-xs sm:text-sm font-semibold">Email:</span>
                <span className="text-xs sm:text-sm">agnesandrews1953@gmail.com</span>
              </div>

              {/* Right: Social */}
              <div className="flex items-center space-x-2 sm:space-x-3 order-2 md:order-none whitespace-nowrap mx-3 sm:mx-5 md:mx-8">
                <a
                  href="#"
                  className="text-gray-900 hover:text-gray-700 lg:text-white lg:hover:text-white/90 transition-colors duration-200"
                  aria-label="Twitter"
                >
                  {/* Twitter (X) icon */}
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.162 5.656c-.73.324-1.516.543-2.34.642a4.087 4.087 0 0 0 1.793-2.254 8.167 8.167 0 0 1-2.59.989 4.078 4.078 0 0 0-6.946 3.72 11.57 11.57 0 0 1-8.401-4.258 4.08 4.08 0 0 0 1.261 5.444 4.05 4.05 0 0 1-1.848-.51v.052a4.078 4.078 0 0 0 3.273 4.001 4.09 4.09 0 0 1-1.842.07 4.081 4.081 0 0 0 3.81 2.832A8.177 8.177 0 0 1 2 18.408a11.542 11.542 0 0 0 6.255 1.833c7.507 0 11.614-6.22 11.614-11.614 0-.177-.004-.353-.012-.527a8.302 8.302 0 0 0 2.005-2.144z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-gray-900 hover:text-gray-700 lg:text-white lg:hover:text-white/90 transition-colors duration-200"
                  aria-label="Instagram"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.59-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          {/* Small-screen: right-side vertical stack to preserve ~70% background visibility */}
          <div className="absolute right-2 sm:right-4 bottom-24 sm:bottom-24 pointer-events-auto block lg:hidden">
            <div className="flex flex-col items-stretch gap-3 sm:gap-4 max-w-[200px] sm:max-w-[260px]">
              {features.map((feature, i) => (
                <div key={i} className="group">
                  <div className="bg-black/30 rounded-2xl p-3 sm:p-5 text-center transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                    <div className="text-sm sm:text-lg font-semibold text-white mb-1.5 sm:mb-2">{conciseTitles[i] ?? feature.title}</div>
                    <p className="text-[11px] sm:text-sm text-gray-200 leading-snug">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Large screens: bottom-centered horizontal row */}
          <div className="absolute inset-x-0 bottom-8 sm:bottom-10 md:bottom-12 lg:bottom-14 pointer-events-auto hidden lg:block">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 items-stretch">
                {features.map((feature, i) => (
                  <div key={i} className="group">
                    <div className="bg-black/30 rounded-3xl p-8 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
                      <div className="text-2xl font-semibold text-white mb-3">{conciseTitles[i] ?? feature.title}</div>
                      <p className="text-gray-200 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </section>
  );
}
