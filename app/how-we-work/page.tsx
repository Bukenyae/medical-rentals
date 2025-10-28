'use client';

import Image from 'next/image';
import { useState } from 'react';
import InfoPageLayout from '@/components/InfoPageLayout';

interface TabContent {
  key: string;
  label: string;
  title: string;
  body: string;
}

const tabs: TabContent[] = [
  {
    key: 'stay',
    label: 'Stay',
    title: "Stay a While, Y’all",
    body:
      "At Belle Rouge, we celebrate the art of staying local. Whether it’s a Creole cottage shaded by oak trees, a chic loft steps from downtown Baton Rouge, or a riverside home where you can watch the sunset over the Mississippi, every stay tells a story. Our spaces are hand-picked for comfort, cleanliness, and that soulful touch only Louisiana homes can offer. From the scent of magnolias to the sound of jazz spilling through open windows, you’ll experience the culture, warmth, and rhythm of our region firsthand. Here, you’re not just visiting—you’re coming home to the South.",
  },
  {
    key: 'rates',
    label: 'Rates',
    title: 'Real Rates, No Riddles',
    body:
      "We believe booking a Louisiana getaway should feel as easy as a Sunday afternoon. At Belle Rouge, what you see is what you pay—no surprise fees, no fine print, no gimmicks. Every price reflects fair value for both guests and hosts, keeping hospitality honest and transparent. We want your focus on the gumbo, not the math. Whether you’re booking for a quick weekend in Baton Rouge or a festival week in New Orleans, you can trust our platform to give you straightforward pricing that respects your time, your wallet, and your peace of mind.",
  },
  {
    key: 'bookings',
    label: 'Bookings',
    title: 'Book It in a Snap',
    body:
      "We’ve made booking your stay as smooth as sweet tea. Find a home that speaks to you? It’s yours in seconds. Every reservation on Belle Rouge is instantly confirmed—no waiting for approvals, no back-and-forth messages. You’ll get all your details immediately so you can start planning your visit, not worrying about logistics. Our goal is to give you time to focus on the real joy of travel: exploring Louisiana’s food, music, and people. From crawfish boils to late-night jazz sets, we make sure your trip starts easy and ends memorable.",
  },
  {
    key: 'fees',
    label: 'Fees',
    title: 'No Hidden Lagniappe Fees',
    body:
      "In Louisiana, lagniappe means \"a little something extra\"—a token of goodwill, not an extra charge. That’s the Belle Rouge way. We’ll never surprise you with hidden booking or administrative fees. The price you see is the price you pay, plain and true. Many of our hosts even offer flexible cancellation policies because we know plans can change as fast as the weather on the bayou. We value fairness and trust, and we treat our guests like family. When you book with Belle Rouge, your only surprise should be how good it feels to stay here.",
  },
  {
    key: 'safety',
    label: 'Safety',
    title: 'Safe as a Southern Handshake',
    body:
      "Down here, a handshake means something. It’s a promise of trust, respect, and keeping your word—and that’s how Belle Rouge does business. Every transaction runs through our secure platform, built with industry-leading encryption and strict privacy standards. We protect your personal and payment information as if it were our own. Our hosts are verified, our listings reviewed, and our support team keeps a watchful eye to make sure your stay goes smoothly. When you book with us, you’re not just using a service—you’re joining a community built on the same values Louisiana was founded on: integrity and care.",
  },
  {
    key: 'help',
    label: 'Help',
    title: 'Help When You Need It',
    body:
      "Hospitality is a 24/7 job—and we take that seriously. Whether you’re booking late at night, arriving early for a festival, or just need directions to the best po’boy in town, our local support team is here to help. We’re not a call center across the ocean—we’re real people right here in Louisiana who know the area, the hosts, and the culture. You can reach us any time, day or night, for quick answers and genuine assistance. At Belle Rouge, support isn’t an afterthought—it’s part of the southern hospitality that defines who we are.",
  },
  {
    key: 'hosts',
    label: 'Hosts',
    title: 'For the Hosts Who Make It Home',
    body:
      "Belle Rouge was built to empower the people who make Louisiana shine—our hosts. From lifelong residents opening their family homes to young entrepreneurs managing unique stays, we make it easy to share your space, earn income, and keep your property’s story alive. Our tools simplify bookings, payments, and guest communication, so you can focus on what really matters: creating memorable experiences. Every host contributes to the culture and color that travelers fall in love with. Together, we’re not just building a platform—we’re nurturing a network of community, creativity, and southern pride.",
  },
  {
    key: 'practice',
    label: 'Practice',
    title: 'Our Promise in Practice',
    body:
      'The heart of every promise we make shows up in the homes we share. Step inside one of our flagship residences and you’ll see the Belle Rouge difference—thoughtful amenities, trusted hosts, and round-the-clock care ready when you need it.',
  },
];

export default function HowWeWorkPage() {
  const [activeTab, setActiveTab] = useState<TabContent>(tabs[0]);

  return (
    <InfoPageLayout
      title="How We Work"
      description="Rooted in Southern hospitality. Driven by local pride."
      titleAlign="left"
    >
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 sm:pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className="relative w-full h-64 sm:h-80 lg:h-[540px] rounded-3xl overflow-hidden">
              <Image
                src="/images/properties/Lexington/Front-Profile.png"
                alt="Belle Rouge flagship home exterior"
                fill
                className="object-cover"
                priority
              />
            </div>

            <div className="space-y-8">
              <div className="overflow-x-auto">
                <div className="flex min-w-full justify-start gap-6 border-b border-gray-200">
                  {tabs.map((tab) => {
                    const isActive = tab.key === activeTab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab)}
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
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">{activeTab.title}</h3>
                <p className="text-base sm:text-lg leading-relaxed text-gray-700">{activeTab.body}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </InfoPageLayout>
  );
}
