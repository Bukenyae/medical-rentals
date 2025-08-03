'use client';

import { Star, Heart, Users } from 'lucide-react';

export default function CustomerSuccessSection() {
  const stats = [
    {
      icon: Users,
      number: "500+",
      label: "Medical Professionals Served",
      description: "Trusted by healthcare workers nationwide"
    },
    {
      icon: Star,
      number: "4.9",
      label: "Average Rating",
      description: "Consistently excellent guest experiences"
    },
    {
      icon: Heart,
      number: "98%",
      label: "Guest Satisfaction",
      description: "Exceeding expectations every stay"
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Trusted by Healthcare Heroes
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Our commitment to excellence has made us the preferred choice for 
            traveling medical professionals across the region.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {stats.map((stat, index) => (
            <div key={index} className="group">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-xl border border-blue-100">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 group-hover:from-blue-600 group-hover:to-indigo-700 transition-all duration-300">
                  <stat.icon className="w-10 h-10 text-white" />
                </div>
                <div className="text-5xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {stat.number}
                </div>
                <div className="text-xl font-semibold text-gray-900 mb-3">{stat.label}</div>
                <p className="text-gray-600 leading-relaxed">{stat.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonial */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-8 h-8 text-yellow-400 fill-current mx-1 drop-shadow-sm" />
            ))}
          </div>
          <blockquote className="text-2xl md:text-3xl text-gray-800 mb-8 italic font-light leading-relaxed max-w-4xl mx-auto">
            "Bayou Medical Rentals made my 3-month assignment in Baton Rouge feel like home. 
            The proximity to the hospital and the quality of the accommodation exceeded all my expectations."
          </blockquote>
          <div className="inline-block">
            <div className="text-xl font-bold text-gray-900 mb-1">Dr. Nia Thompson Jenkins, MD, MPH</div>
            <div className="text-blue-600 font-medium">Board Certified OB/GYN</div>
          </div>
        </div>
      </div>
    </section>
  );
}
