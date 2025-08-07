'use client';

import Image from 'next/image';
import { Shield, Clock, Award, HeadphonesIcon, Phone, Mail } from 'lucide-react';

export default function PropertyManagementSection() {
  const features = [
    {
      icon: Shield,
      title: "Verified Properties",
      description: "All properties are thoroughly vetted and inspected for quality and safety standards."
    },
    {
      icon: Clock,
      title: "24/7 Support",
      description: "Round-the-clock assistance for any issues or questions during your stay."
    },
    {
      icon: Award,
      title: "Quality Guarantee",
      description: "We guarantee clean, comfortable accommodations that meet the needs of medical staff, academics, military members, and young professionals."
    },
    {
      icon: HeadphonesIcon,
      title: "Concierge Service",
      description: "Personal assistance with local recommendations, transportation, and special requests."
    }
  ];

  return (
    <section className="py-16 md:py-32 lg:py-72 relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/properties/LexingtonNight/WellcomeDrs.png"
          alt="Welcome professionals - property management background"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-70 md:bg-opacity-60"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="w-full md:w-2/3 lg:w-1/2 xl:w-1/3">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Professional Property Management
          </h2>
          <p className="text-lg md:text-xl lg:text-2xl text-gray-200 mb-8 leading-relaxed">
            We handle every detail so you can focus on what matters most—your work, studies, service, and life.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <feature.icon className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Information */}
          <div className="border-t border-gray-600 pt-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-white">
              <div className="flex items-center space-x-2">
                <Phone className="w-5 h-5 text-blue-400" />
                <span className="text-sm md:text-base">Mobile: +1 (225) 936-3650</span>
              </div>
              <div className="hidden sm:block text-gray-400">|</div>
              <div className="flex items-center space-x-2">
                <Mail className="w-5 h-5 text-blue-400" />
                <span className="text-sm md:text-base">agnesandrews1953@gmail.com</span>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="flex items-center space-x-4">
            <span className="text-white text-sm font-medium">Follow us:</span>
            <a 
              href="#" 
              className="text-gray-300 hover:text-white transition-colors duration-200"
              aria-label="TikTok"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
            </a>
            <a 
              href="#" 
              className="text-gray-300 hover:text-white transition-colors duration-200"
              aria-label="Instagram"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
