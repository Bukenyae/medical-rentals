'use client';

import Link from 'next/link';
import { Instagram } from 'lucide-react';

export default function Footer() {
  const links = [
    { href: '/about', label: 'About Us' },
    { href: '/how-we-work', label: 'Our Service' },
    { href: '/customer-engagement', label: 'Community' },
  ];

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Belle Rouge Properties</h2>
          <p className="text-sm text-gray-600 mt-1">Where Southern warmth meets tech-driven travel and hospitality.</p>
        </div>
        <nav aria-label="Footer navigation">
          <ul className="flex flex-wrap gap-4 text-sm text-gray-600">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-gray-800 transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="https://www.instagram.com/bellerouge.properties/?igsh=MXlkdnMwOWxscGJh"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Belle Rouge on Instagram"
                className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                <Instagram className="h-4 w-4" strokeWidth={2.56} />
              </Link>
            </li>
          </ul>
        </nav>
        <div className="text-xs text-gray-500">© {new Date().getFullYear()} Belle Rouge Properties. All rights reserved.</div>
      </div>
    </footer>
  );
}
