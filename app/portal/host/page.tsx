"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/portal/AuthGate";
import SidebarTabs from "@/components/portal/SidebarTabs";
import SectionFeedback from "@/components/portal/SectionFeedback";
import PropertyForm from "@/components/portal/PropertyForm";
import MapLinkForm from "@/components/portal/MapLinkForm";
import MediaManager from "@/components/portal/MediaManager";
import { createClient } from "@/lib/supabase/client";
import PublishChecklist from "@/components/portal/PublishChecklist";

export default function HostPortalPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const [hasMapLink, setHasMapLink] = useState(false);
  const [hasApprovedImage, setHasApprovedImage] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const tabs = [
    { key: "payments", label: "Payments & Collections" },
    { key: "tenants", label: "Tenant History" },
    { key: "analytics", label: "Analytics" },
    { key: "messages", label: "Messages" },
  ];

  const sections = ["Bedroom A", "Bathroom A", "Kitchen", "Living Room", "Laundry"];

  // Persist selected property across reloads
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('host_selected_property') : null;
    if (stored) setSelectedPropertyId(stored);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedPropertyId) localStorage.setItem('host_selected_property', selectedPropertyId);
      else localStorage.removeItem('host_selected_property');
    }
  }, [selectedPropertyId]);

  // Fetch lightweight publish status for the selected property
  useEffect(() => {
    async function fetchStatus(pid: string) {
      // properties: map_url and is_published
      const { data: prop } = await supabase
        .from('properties')
        .select('map_url,is_published')
        .eq('id', pid)
        .maybeSingle();
      setHasMapLink(!!prop?.map_url);
      setIsPublished(!!prop?.is_published);
      // property_images: approved exists?
      const { count } = await supabase
        .from('property_images')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', pid)
        .eq('is_approved', true);
      setHasApprovedImage((count ?? 0) > 0);
    }
    if (selectedPropertyId) {
      void fetchStatus(selectedPropertyId);
    } else {
      setHasMapLink(false);
      setHasApprovedImage(false);
      setIsPublished(false);
    }
  }, [selectedPropertyId, supabase]);

  return (
    <AuthGate allowRoles={["host", "admin"]}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="relative w-10 h-10 rounded-md overflow-hidden border border-gray-200">
              <Image src="/images/properties/LexingtonNight/WellcomeDrs.png" alt="Property" fill className="object-cover" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">Host Dashboard</h1>
              <p className="text-sm text-gray-600">Finish your listing setup and publish when ready.</p>
            </div>
          </div>
          {/* Sub nav (non-functional placeholders for now) */}
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">Overview</span>
            <span className="px-3 py-1 rounded-full border border-gray-200 text-gray-700">Listings</span>
            <span className="px-3 py-1 rounded-full border border-gray-200 text-gray-700">Messages</span>
            <span className="px-3 py-1 rounded-full border border-gray-200 text-gray-700">Payouts</span>
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Left: setup checklist */}
          <div className="xl:col-span-8 space-y-6">
            {/* Setup progress */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Setup checklist</h2>
              <p className="text-sm text-gray-600 mb-4">Complete the steps below to publish your listing.</p>
              <div className="space-y-6">
                {/* 1. Basics */}
                <div className="rounded-xl border border-gray-200">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white text-xs">1</span>
                      <span className="font-medium text-gray-900">Basics</span>
                    </div>
                    <span className="text-xs text-gray-500">Add title, address, price and details</span>
                  </div>
                  <div className="p-5">
                    <PropertyForm onPropertySelected={setSelectedPropertyId} />
                  </div>
                </div>

                {/* 2. Location */}
                <div className="rounded-xl border border-gray-200">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white text-xs">2</span>
                      <span className="font-medium text-gray-900">Location</span>
                    </div>
                    <span className="text-xs text-gray-500">Add a Google Maps link</span>
                  </div>
                  <div className="p-5">
                    <MapLinkForm propertyId={selectedPropertyId} />
                  </div>
                </div>

                {/* 3. Photos */}
                <div className="rounded-xl border border-gray-200">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white text-xs">3</span>
                      <span className="font-medium text-gray-900">Photos</span>
                    </div>
                    <span className="text-xs text-gray-500">Upload and approve at least one image</span>
                  </div>
                  <div className="p-5">
                    <MediaManager propertyId={selectedPropertyId} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: sidebar */}
          <div className="xl:col-span-4 space-y-6 lg:sticky lg:top-6 self-start">
            {/* Publish status */}
            <PublishChecklist
              selectedPropertyId={selectedPropertyId}
              hasMapLink={hasMapLink}
              hasApprovedImage={hasApprovedImage}
              isPublished={isPublished}
              onPublish={() => { /* TODO: wire actual publish action */ }}
            />

            {/* Manage */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Manage</h3>
              <SidebarTabs tabs={tabs} />
              <div className="mt-4 text-sm text-gray-600">
                <p className="mb-1"><strong>Payments & Collections</strong> — monitor per-tenant payments</p>
                <p className="mb-1"><strong>Tenant History</strong> — view past guests and stays</p>
                <p className="mb-1"><strong>Analytics</strong> — 3, 6, 12-month summaries</p>
                <p className="mb-1"><strong>Messages</strong> — communicate with guests</p>
                <p className="text-xs text-gray-500">Scaffold only; wiring comes next.</p>
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Property feedback & updates</h3>
              <SectionFeedback sections={sections} />
            </div>
          </div>
        </div>
      </div>
    </AuthGate>
  );
}
