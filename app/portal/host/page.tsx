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
import Card from "@/components/portal/Card";
import Icon from "@/components/portal/Icon";
import SidebarItem from "@/components/portal/SidebarItem";
import BottomBar from "@/components/portal/BottomBar";

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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Internal sticky header */}
        <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 border-b border-gray-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-2xl bg-emerald-600 text-white grid place-items-center font-bold">A</div>
              <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                <Icon name="search" className="w-4 h-4 text-gray-500" />
                <input placeholder="Search" className="bg-transparent outline-none text-sm w-56" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-xl hover:bg-gray-100" aria-label="Notifications">
                <Icon name="bell" />
              </button>
              <div className="w-8 h-8 rounded-full bg-gray-200" />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 space-y-1 sticky top-20">
              <SidebarItem icon="dashboard" label="Dashboard" active />
              <SidebarItem icon="media" label="Media Manager" />
              <SidebarItem icon="payments" label="Payments & Collections" />
              <SidebarItem icon="history" label="Tenant History" />
              <SidebarItem icon="analytics" label="Analytics" />
              <SidebarItem icon="messages" label="Messages" />
              <SidebarItem icon="feedback" label="Feedback & Updates" />
              <SidebarItem icon="manage" label="Manage & Updates" />
            </div>
          </aside>

          {/* Content */}
          <section className="col-span-12 md:col-span-9 lg:col-span-10 space-y-6">
            {/* Top intro card */}
            <Card>
              <div className="flex items-center gap-4">
                <div className="relative w-10 h-10 rounded-md overflow-hidden border border-gray-200">
                  <Image src="/images/properties/LexingtonNight/WellcomeDrs.png" alt="Property" fill className="object-cover" />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-semibold text-gray-900">Host Dashboard</h1>
                  <p className="text-sm text-gray-600">Finish your listing setup and publish when ready.</p>
                </div>
              </div>
            </Card>

            {/* Media Manager + Publish status */}
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-8 space-y-6">
                <Card title="Media Manager" right={
                  <button className="inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-3 py-2 text-sm hover:bg-black">
                    <Icon name="plus" />
                    Add new Property
                  </button>
                }>
                  <MediaManager propertyId={selectedPropertyId} />
                </Card>

                <Card title="Location">
                  <MapLinkForm propertyId={selectedPropertyId} />
                </Card>
              </div>

              <div className="col-span-12 lg:col-span-4 order-last lg:order-none">
                <PublishChecklist
                  selectedPropertyId={selectedPropertyId}
                  hasMapLink={hasMapLink}
                  hasApprovedImage={hasApprovedImage}
                  isPublished={isPublished}
                  onPublish={() => { /* TODO: wire actual publish action */ }}
                />
              </div>
            </div>

            {/* Feedback & Updates */}
            <Card title="Property feedback & updates">
              <SectionFeedback sections={sections} />
            </Card>

            {/* Bottom bar metrics */}
            <BottomBar />
          </section>
        </main>
      </div>
    </AuthGate>
  );
}
