'use client';

import Image from 'next/image';

export default function AboutSection() {
  const teamMembers = [
    {
      name: "Agnes Andrews",
      role: "CEO",
      description: "Agnes founded Belle Rouge Properties to provide exceptional housing for professionals from all walks of life. With 40+ years in insurance services, she understands the unique importance of reliability, facility management, and customer satisfaction.",
      image: "/images/team/agnes-andrews.jpg"
    },
    {
      name: "Kinda Andrews",
      role: "CMO",
      description: "Kinda leads our marketing efforts with a focus on building authentic relationships with hospitals, universities, and community organizations. Her strategic approach ensures our properties reach medical staff, academics, military members, and young professionals at the right time.",
      image: "/images/team/kinda-andrews.jpg"
    },
    {
      name: "Nayo Andrews",
      role: "COO",
      description: "Nayo oversees operations to ensure every guest experience exceeds expectations. Her attention to detail and commitment to excellence maintains the highest standards across all Belle Rouge Properties locations.",
      image: "/images/team/nayo-andrews.jpg"
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {teamMembers.map((member, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="h-80 relative">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className="object-cover object-top"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                <p className="text-blue-600 font-semibold mb-3">{member.role}</p>
                <p className="text-gray-600 leading-relaxed">{member.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
