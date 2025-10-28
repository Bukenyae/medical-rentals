'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import InfoPageLayout from '@/components/InfoPageLayout';

const heroImage = '/images/properties/Lexington/Guest-Dinning.jpg';

const travelerHighlights = [
  {
    icon: '🏡',
    title: 'Home Away from Home',
    description:
      'From hospital rotations to university residencies, every guest enjoys the charm and ease of Louisiana living.',
  },
  {
    icon: '📞',
    title: 'Always a Call Away',
    description: '24/7 concierge response ensures comfort even in life’s 2 a.m. moments.',
  },
  {
    icon: '💼',
    title: 'Trusted by Professionals',
    description: 'Over 500 healthcare and business travelers have made Belle Rouge their Baton Rouge home.',
  },
];

const actOnePanel = {
  title: 'Why Travelers Love Us',
  body:
    'Each stay is curated to honor the tempo of Louisiana life. We pair thoughtful amenities with responsive support so every guest feels grounded, even on the busiest rotations.',
  highlights: travelerHighlights,
};

const metricClusters = [
  {
    label: 'Response & Reliability',
    stats: [
      { heading: '12 min', text: 'Average response time' },
      { heading: '98%', text: 'Guest satisfaction' },
    ],
    caption: 'Concierge messages answered before your next cup of coffee.',
    fillRatio: 0.82,
  },
  {
    label: 'Care Programs',
    stats: [{ heading: '120', text: 'Care packages delivered' }],
    caption: 'From stocked pantries to welcome pralines — our little extras make long days lighter.',
    fillRatio: 0.6,
  },
  {
    label: 'Local Partnerships',
    stats: [
      { heading: '6', text: 'Partner hospitals' },
      { heading: '3', text: 'University partners' },
    ],
    caption: 'Hospital proximity and university alignment designed for your workflow.',
    fillRatio: 0.7,
  },
];

const testimonials = [
  {
    name: 'Dr. Nia Jenkins',
    role: 'OB/GYN',
    quote:
      'Belle Rouge made my travel rotation effortless — groceries ready, transport on time, and a quiet space to recharge.',
    image: '/images/Reviewers/Dr. Nia Jenkins.jpg',
  },
  {
    name: 'Erica Rogers, NP',
    role: 'Nurse Practitioner',
    quote:
      'The concierge team checked in after every shift. Their kindness reminded me of home when I was far from family.',
    image: '/images/Reviewers/Erica Rogers.NP.jpg',
  },
  {
    name: 'Marley Aguillard, NP',
    role: 'Pediatric Care Specialist',
    quote:
      'From flexible check-in to stocked snacks, Belle Rouge handled every detail so I could focus on my patients.',
    image: '/images/Reviewers/Marley Aguillard.NP.jpg',
  },
  {
    name: 'Dr. Angelica Celestine',
    role: 'Cardiology Fellow',
    quote:
      'Their proximity to teaching hospitals and thoughtful welcome gifts set the tone for a meaningful rotation.',
    image: '/images/Reviewers/Dr. Angelica Celestine.jpg',
  },
];

const conciergeHighlights = [
  {
    title: 'Pantry Restock',
    detail: 'Midnight grocery run for a resident coming off a 16-hour shift.',
    icon: '🛒',
  },
  {
    title: 'Storm Response',
    detail: 'Emergency HVAC repair completed during hurricane season prep.',
    icon: '🔧',
  },
  {
    title: 'Shuttle Support',
    detail: 'Complimentary rides to Baton Rouge General’s campus before dawn rounds.',
    icon: '🚌',
  },
  {
    title: 'Restful Check-ins',
    detail: 'Warm pralines and lavender kits delivered for incoming fellows.',
    icon: '🎁',
  },
];

const partners = ['Baton Rouge General', 'Our Lady of the Lake', 'Louisiana State University', 'Southern University'];

const responseStats = [
  {
    label: 'Response Time',
    value: 12,
    unit: ' min',
    color: 'from-blue-600 to-blue-400',
    widthClass: 'w-[60%]',
  },
  {
    label: 'Repeat Stay Rate',
    value: 84,
    unit: '%',
    color: 'from-amber-500 to-amber-300',
    widthClass: 'w-[84%]',
  },
];

const navTabs = [
  {
    label: 'Why Us',
    target: 'act-i',
    description: 'Explore why traveling professionals choose Belle Rouge as their Louisiana home base.',
  },
  {
    label: 'Our Response Time',
    target: 'act-ii',
    description: 'See how our concierge team responds in real time with data-backed service and care.',
  },
  {
    label: 'Social Proof',
    target: 'act-iii',
    description: 'Hear real stories from the specialists and residents who rely on Belle Rouge.',
  },
  {
    label: 'Concierge in Action',
    target: 'concierge',
    description: 'Browse snapshots of concierge moments that keep professionals cared for around the clock.',
  },
];

const tabPanels: Record<
  string,
  {
    title: string;
    body: string;
    highlights?: typeof travelerHighlights;
    progressBars?: typeof responseStats;
    metricGroups?: typeof metricClusters;
    testimonials?: typeof testimonials;
    conciergeStories?: typeof conciergeHighlights;
    partnerList?: typeof partners;
  }
> = {
  'act-i': actOnePanel,
  'act-ii': {
    title: 'How We Respond in Real Time',
    body:
      'Our concierge playbook blends hospitality intuition with data-informed service. Metrics help us anticipate needs while our team delivers the human touches that matter most.',
    progressBars: responseStats,
    metricGroups: metricClusters,
  },
  'act-iii': {
    title: 'Proof & Outcomes',
    body:
      'Real stories from residents, fellows, and traveling specialists who trust Belle Rouge to keep them comfortable, focused, and connected while on assignment.',
    testimonials,
  },
  concierge: {
    title: 'Concierge in Action',
    body:
      'Swipe through on-the-ground moments that show how our concierge team supports professionals from check-in to check-out.',
    conciergeStories: conciergeHighlights,
    partnerList: partners,
  },
};

export default function CustomerEngagementPage() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [activeSection, setActiveSection] = useState(navTabs[0].target);
  const [isDiscoveryFormOpen, setIsDiscoveryFormOpen] = useState(false);
  const [showDiscoverySuccess, setShowDiscoverySuccess] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 7000);

    return () => clearInterval(timer);
  }, []);

  const handleTabClick = (target: string) => {
    const element = document.getElementById(target);
    if (element) {
      const offset = 96;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
    setActiveSection(target);
  };

  const handleDiscoverySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowDiscoverySuccess(true);
    setIsDiscoveryFormOpen(false);
    event.currentTarget.reset();
  };

  const activeTab = navTabs.find((tab) => tab.target === activeSection) ?? navTabs[0];
  const activePanel = tabPanels[activeSection] ?? tabPanels['act-i'];
  const discoveryFormAriaExpanded = isDiscoveryFormOpen ? 'true' : 'false';

  return (
    <InfoPageLayout>
      <div>
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Customer Engagement</h1>
              </div>
              <div className="relative w-full h-72 sm:h-80 lg:h-[420px] overflow-hidden rounded-[40px] shadow-xl shadow-blue-200/30">
                <Image
                  src={heroImage}
                  alt="Traveling medical professional arriving at a Belle Rouge residence"
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              <div className="space-y-6">
                <div className="rounded-[32px] bg-white/80 backdrop-blur-sm shadow-sm border border-white/60 px-6 sm:px-8 py-8">
                  <h3 className="text-xl font-semibold text-gray-900">Join the Belle Rouge Concierge List</h3>
                  <p className="mt-3 text-gray-600 text-sm sm:text-base">
                    Traveling for a residency, corporate residency, or academic fellowship? Tell us your dates and priorities. We’ll curate the stay that keeps you rested and ready.
                  </p>
                  <Link
                    href="/#properties"
                    className="mt-4 inline-flex items-center justify-center rounded-full border border-[#8B1A1A] bg-[#F8F5F2] px-5 py-3 text-sm font-semibold text-[#8B1A1A] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#ede9e3] hover:text-[#8B1A1A] hover:shadow-md"
                  >
                    Stay with Us
                  </Link>
                </div>

                <div className="rounded-[32px] bg-white/80 backdrop-blur-sm shadow-sm border border-white/60 px-6 sm:px-8 py-8">
                  <h3 className="text-xl font-semibold text-gray-900">Partner with Belle Rouge</h3>
                  <p className="mt-3 text-gray-600 text-sm sm:text-base">
                    Own or manage a property near Baton Rouge hospitals or universities? Let’s design an experience that honors your space and delights our professionals.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDiscoveryFormOpen((prev) => !prev);
                      setShowDiscoverySuccess(false);
                    }}
                    aria-expanded={discoveryFormAriaExpanded}
                    className={`mt-4 w-full rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-200 ${
                      isDiscoveryFormOpen
                        ? 'border-[#8B1A1A] bg-[#F8F5F2] text-[#8B1A1A] shadow-sm hover:bg-[#ede9e3] hover:text-[#8B1A1A] hover:shadow-md'
                        : 'border-[#8B1A1A] bg-[#F8F5F2] text-[#8B1A1A] shadow-sm hover:bg-[#ede9e3] hover:text-[#8B1A1A] hover:shadow-md'
                    }`}
                  >
                    {isDiscoveryFormOpen ? 'Close Discovery Form' : 'Book a Discovery Call'}
                  </button>
                  {isDiscoveryFormOpen && (
                    <form
                      className="mt-4 space-y-4 rounded-3xl bg-white/90 px-6 py-6 shadow-sm"
                      onSubmit={handleDiscoverySubmit}
                    >
                      <div>
                        <label className="block text-sm font-semibold text-gray-700" htmlFor="discovery-name">
                          Name
                        </label>
                        <input
                          id="discovery-name"
                          name="name"
                          type="text"
                          required
                          autoComplete="name"
                          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700" htmlFor="discovery-email">
                          Email
                        </label>
                        <input
                          id="discovery-email"
                          name="email"
                          type="email"
                          required
                          autoComplete="email"
                          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700" htmlFor="discovery-phone">
                          Phone Number
                        </label>
                        <input
                          id="discovery-phone"
                          name="phone"
                          type="tel"
                          required
                          autoComplete="tel"
                          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700" htmlFor="discovery-location">
                          Location
                        </label>
                        <input
                          id="discovery-location"
                          name="location"
                          type="text"
                          required
                          autoComplete="address-level2"
                          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded-full border border-[#8B1A1A] bg-[#8B1A1A] px-5 py-3 text-sm font-semibold text-[#F8F5F2] shadow-lg shadow-[rgba(139,26,26,0.35)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                      >
                        Submit
                      </button>
                    </form>
                  )}
                  {showDiscoverySuccess && (
                    <p className="mt-4 text-sm font-medium text-emerald-600">
                      Thank you! Our concierge team will connect with you shortly.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="overflow-x-auto">
                <div className="flex min-w-full justify-start gap-6 border-b border-gray-200">
                  {navTabs.map((tab) => {
                    const isActive = tab.target === activeSection;
                    return (
                      <button
                        key={tab.target}
                        type="button"
                        onClick={() => handleTabClick(tab.target)}
                        className={`relative whitespace-nowrap pb-2 text-sm font-medium transition-colors duration-200 border-b-2 ${
                          isActive
                            ? 'text-blue-600 border-blue-500'
                            : 'text-gray-500 border-transparent hover:text-gray-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm">
                <p className="text-gray-600 sm:text-lg leading-relaxed">
                  {activePanel.body || activeTab.description}
                </p>
                {activePanel.highlights && (
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activePanel.highlights.map((item) => (
                      <div key={item.title} className="rounded-2xl px-4 py-5">
                        <div className="text-2xl" aria-hidden>
                          {item.icon}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-gray-900">{item.title}</h3>
                        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activePanel.progressBars && (
                  <div className="mt-6 space-y-4">
                    {activePanel.progressBars.map((stat) => (
                      <div key={`${activePanel.title}-${stat.label}`}>
                        <div className="flex justify-between text-sm font-medium text-gray-700">
                          <span>{stat.label}</span>
                          <span>
                            {stat.value}
                            {stat.unit}
                          </span>
                        </div>
                        <div className="mt-2 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${stat.color} ${stat.widthClass}`}
                            aria-hidden
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activePanel.metricGroups && (
                  <div className="mt-6 grid grid-cols-1 gap-4">
                    {activePanel.metricGroups.map((cluster) => (
                      <div key={`${activePanel.title}-${cluster.label}`} className="rounded-2xl px-5 py-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">{cluster.label}</h3>
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/80 to-blue-300/60 text-white text-sm font-semibold">
                            {(cluster.fillRatio * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-700">
                          {cluster.stats.map((stat) => (
                            <div key={`${cluster.label}-${stat.heading}`}>
                              <p className="text-xl font-semibold text-gray-900">{stat.heading}</p>
                              <p className="text-sm text-gray-600">{stat.text}</p>
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-sm text-gray-600">{cluster.caption}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activePanel.testimonials && (
                  <div className="mt-6 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white shadow">
                        <Image
                          src={activePanel.testimonials[activeTestimonial].image}
                          alt={`Portrait of ${activePanel.testimonials[activeTestimonial].name}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-900">
                          {activePanel.testimonials[activeTestimonial].name}
                        </p>
                        <p className="text-sm text-blue-600">
                          {activePanel.testimonials[activeTestimonial].role}
                        </p>
                      </div>
                    </div>
                    <blockquote className="text-gray-700 leading-relaxed">
                      “{activePanel.testimonials[activeTestimonial].quote}”
                    </blockquote>
                    <div className="flex items-center gap-1 text-amber-400" aria-hidden>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <span key={`card-star-${index}`}>★</span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {activePanel.testimonials.map((_, index) => (
                        <button
                          key={`card-dot-${index}`}
                          type="button"
                          className={`h-2 w-8 rounded-full transition-all duration-300 ${
                            activeTestimonial === index ? 'bg-[#E63946]' : 'bg-slate-300'
                          }`}
                          onClick={() => setActiveTestimonial(index)}
                          aria-label={`Show testimonial ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {activePanel.conciergeStories && (
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activePanel.conciergeStories.map((story) => (
                      <div key={`${activePanel.title}-${story.title}`} className="rounded-2xl px-5 py-5">
                        <div className="text-2xl" aria-hidden>
                          {story.icon}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-gray-900">{story.title}</h3>
                        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{story.detail}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activePanel.partnerList && (
                  <div className="mt-6 space-y-4">
                    <p className="text-sm font-semibold text-gray-700">Community & Partners</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {activePanel.partnerList.map((partner) => (
                        <div
                          key={`${activePanel.title}-${partner}`}
                          className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700"
                        >
                          {partner}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </section>

      </div>
    </InfoPageLayout>
  );
}
