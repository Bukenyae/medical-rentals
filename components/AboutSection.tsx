'use client';

import Image from 'next/image';

interface AboutSectionProps {
  showHeading?: boolean;
}

export default function AboutSection({ showHeading = true }: AboutSectionProps = {}) {
  const teamMembers = [
    {
      name: "Agnes Andrews",
      role: "CEO",
      description: "With over 40 years in insurance services, Agnes brings strategic leadership and a customer-first mindset that inspires reliability, integrity, and care — values that continue to guide Belle Rouge’s growth, culture, and commitment to exceptional hospitality.",
      image: "/images/team/Agnes-Smith.jpeg"
    },
    {
      name: "Kinda Andrews",
      role: "CMO",
      description: "Kinda leads Belle Rouge’s marketing with a focus on authentic partnerships across hospitals, universities, and local organizations — ensuring our properties connect seamlessly with medical staff, academics, military members, and young professionals when and where they need housing most.",
      image: "/images/team/Andrews-Sanders.jpeg"
    },
    {
      name: "Nayo Andrews",
      role: "COO",
      description: "Nayo oversees daily operations with a focus on excellence and guest satisfaction. Her meticulous attention to detail and passion for quality uphold the highest standards across all Belle Rouge Properties, ensuring every stay feels effortless and memorable.",
      image: "/images/team/Nayo-Zakiya.jpg"
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {showHeading && (
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              About Us
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're a family-owned business dedicated to providing exceptional accommodations
              for medical staff, academics, military personnel, college students, graduates,
              and young professionals. Our mission is to ensure you have a comfortable,
              safe, and convenient home away from home.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {teamMembers.map((member, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg overflow-hidden"
              {...(index === 0 ? { 'data-agnes-card': true } : {})}
            >
              <div className="h-80 relative overflow-hidden">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className="object-cover"
                  style={{ objectPosition: getObjectPosition(member.name), transform: `scale(${getScale(member.name)})` }}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                <p className="text-gray-600 font-semibold mb-3">{member.role}</p>
                <p className="text-gray-600 leading-relaxed">{member.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function getObjectPosition(name: string): string {
  switch (name) {
    case 'Agnes Andrews':
      // Slightly higher crop
      return '50% 20%';
    case 'Kinda Andrews':
      // Center with a small upward bias
      return '50% 35%';
    case 'Nayo Andrews':
      // Keep head visible while zooming in: slight downward shift from very top-biased crop
      return '50% 24%';
    default:
      return '50% 50%';
  }
}

function getScale(name: string): number {
  switch (name) {
    case 'Nayo Andrews':
      // Slightly reduced zoom per request to preserve top of head
      return 1.12;
    default:
      return 1.0;
  }
}
