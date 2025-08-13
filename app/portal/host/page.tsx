"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import AuthGate from "@/components/portal/AuthGate";
import SectionFeedback from "@/components/portal/SectionFeedback";
import PropertyForm from "@/components/portal/PropertyForm";
import MapLinkForm from "@/components/portal/MapLinkForm";
import MediaManagerCard from "@/app/(host)/dashboard/_components/MediaManagerCard";
import MediaManager from "@/components/portal/MediaManager";
import { createClient } from "@/lib/supabase/client";
import PublishChecklist from "@/components/portal/PublishChecklist";
import Card from "@/components/portal/Card";
import Icon from "@/components/portal/Icon";
import SidebarItem from "@/components/portal/SidebarItem";
import BottomBar from "@/components/portal/BottomBar";
import PaymentsList from "@/components/portal/PaymentsList";
import TenantsList from "@/components/portal/TenantsList";
import UserMenu from "@/components/portal/UserMenu";

export default function HostPortalPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const [hasMapLink, setHasMapLink] = useState(false);
  const [hasApprovedImage, setHasApprovedImage] = useState(false);
  const [hasCoverImage, setHasCoverImage] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [activeSection, setActiveSection] = useState<
    | "dashboard"
    | "media"
    | "location"
    | "payments"
    | "tenants"
    | "checkin"
    | "feedback"
    | "analytics"
    | "messages"
    | "metrics"
  >("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  // section refs for sidebar scroll + active highlight
  const topRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<HTMLElement | null>(null);
  const locationRef = useRef<HTMLElement | null>(null);
  const paymentsRef = useRef<HTMLElement | null>(null);
  const tenantsRef = useRef<HTMLElement | null>(null);
  const checkinRef = useRef<HTMLElement | null>(null);
  const feedbackRef = useRef<HTMLElement | null>(null);
  const metricsRef = useRef<HTMLElement | null>(null);
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

  // Observe sections to update active sidebar state
  useEffect(() => {
    const sections: Array<{ id: typeof activeSection; el: Element | null }> = [
      { id: "dashboard", el: topRef.current },
      { id: "media", el: mediaRef.current },
      { id: "location", el: locationRef.current },
      { id: "payments", el: paymentsRef.current },
      { id: "tenants", el: tenantsRef.current },
      { id: "checkin", el: checkinRef.current },
      { id: "feedback", el: feedbackRef.current },
      { id: "metrics", el: metricsRef.current },
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top > b.boundingClientRect.top ? 1 : -1));
        if (visible[0]) {
          const found = sections.find((s) => s.el === visible[0].target);
          if (found) setActiveSection(found.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    sections.forEach((s) => s.el && observer.observe(s.el));
    return () => observer.disconnect();
  }, []);

  // Fetch lightweight publish status for the selected property
  const fetchStatus = useCallback(async (pid: string) => {
    // properties: map_url and is_published
    const { data: prop } = await supabase
      .from('properties')
      .select('map_url,is_published,cover_image_url')
      .eq('id', pid)
      .maybeSingle();
    setHasMapLink(!!prop?.map_url);
    setHasCoverImage(!!prop?.cover_image_url);
    setIsPublished(!!prop?.is_published);
    // property_images: approved exists?
    const { count } = await supabase
      .from('property_images')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', pid)
      .eq('is_approved', true);
    setHasApprovedImage((count ?? 0) > 0);
  }, [supabase]);

  useEffect(() => {
    if (!selectedPropertyId) return;
    void fetchStatus(selectedPropertyId);
  }, [selectedPropertyId, fetchStatus]);

  async function publishSelected() {
    if (!selectedPropertyId) return;
    const { error } = await supabase
      .from('properties')
      .update({ is_published: true })
      .eq('id', selectedPropertyId);
    if (error) {
      alert(error.message);
      return;
    }
    await fetchStatus(selectedPropertyId);
    alert('Property published');
  }

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
                <input
                  placeholder="Search"
                  className="bg-transparent outline-none text-sm w-56"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-xl hover:bg-gray-100" aria-label="Notifications">
                <Icon name="bell" />
              </button>
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className={`col-span-12 transition-all ${collapsed ? "md:col-span-1 lg:col-span-1" : "md:col-span-3 lg:col-span-2"}`}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 space-y-2 sticky top-20">
              <button
                className={`p-2 rounded-xl hover:bg-white/50 ${collapsed ? "mx-auto" : "ml-auto"}`}
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <Icon name={collapsed ? "arrow-right" : "arrow-left"} />
              </button>
              <SidebarItem
                icon="dashboard"
                label="Dashboard"
                active={activeSection === "dashboard"}
                onClick={() => {
                  setActiveSection("dashboard");
                  topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                collapsed={collapsed}
              />
              <SidebarItem
                icon="media"
                label="Property Assets"
                active={activeSection === "media"}
                onClick={() => {
                  setActiveSection("media");
                  mediaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                collapsed={collapsed}
              />
              <SidebarItem
                icon="payments"
                label="Payments & Collections"
                active={activeSection === "payments"}
                onClick={() => {
                  setActiveSection("payments");
                  paymentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                collapsed={collapsed}
              />
              <SidebarItem
                icon="history"
                label="Tenant History"
                active={activeSection === "tenants"}
                onClick={() => {
                  setActiveSection("tenants");
                  tenantsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                collapsed={collapsed}
              />
              <SidebarItem
                icon="check"
                label="Check-in / Check-out"
                active={activeSection === "checkin"}
                onClick={() => {
                  setActiveSection("checkin");
                  checkinRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                collapsed={collapsed}
              />
              <SidebarItem
                icon="analytics"
                label="Analytics"
                active={activeSection === "analytics"}
                onClick={() => {
                  setActiveSection("analytics");
                  metricsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                collapsed={collapsed}
              />
              <SidebarItem
                icon="messages"
                label="Messages"
                active={activeSection === "messages"}
                onClick={() => {
                  setActiveSection("messages");
                  metricsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                collapsed={collapsed}
              />
              <SidebarItem
                icon="feedback"
                label="Feedback & Updates"
                active={activeSection === "feedback"}
                onClick={() => {
                  setActiveSection("feedback");
                  feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                collapsed={collapsed}
              />
              <SidebarItem
                icon="manage"
                label="Manage & Updates"
                active={activeSection === "location"}
                onClick={() => {
                  setActiveSection("location");
                  locationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                collapsed={collapsed}
              />
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

            {/* Property Assets + Publish status */}
            <div className="grid grid-cols-12 gap-6" ref={mediaRef as any}>
              <div className="col-span-12 lg:col-span-8 space-y-6">
                <Card
                  title="Property Assets"
                  right={
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-3 py-2 text-sm hover:bg-black"
                        onClick={() => setShowCreateModal(true)}
                      >
                        <Icon name="plus" />
                        Add new Property
                      </button>
                      <button
                        className="inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-3 py-2 text-sm hover:bg-black disabled:opacity-50"
                        onClick={() => setShowImagesModal(true)}
                        disabled={!selectedPropertyId}
                      >
                        <Icon name="plus" />
                        Add images
                      </button>
                    </div>
                  }
                >
                  <MediaManagerCard />
                </Card>

                <section ref={locationRef as any}>
                  <Card title="Location">
                    <MapLinkForm propertyId={selectedPropertyId} />
                  </Card>
                </section>
              </div>

              <div className="col-span-12 lg:col-span-4 order-last lg:order-none">
                <PublishChecklist
                  selectedPropertyId={selectedPropertyId}
                  hasMapLink={hasMapLink}
                  hasApprovedImage={hasApprovedImage}
                  hasCoverImage={hasCoverImage}
                  isPublished={isPublished}
                  onPublish={publishSelected}
                />
              </div>
            </div>

            {/* Feedback & Updates */}
            <section ref={feedbackRef as any}>
              <Card title="Property feedback & updates">
                <SectionFeedback sections={sections} />
              </Card>
            </section>

            {/* Operations: Payments & Tenants (search-aware stubs) */}
            <section>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div ref={paymentsRef as any}>
                  <Card title="Payments">
                    <PaymentsList query={searchQuery} />
                  </Card>
                </div>
                <div ref={tenantsRef as any}>
                  <Card title="Tenants">
                    <TenantsList query={searchQuery} />
                  </Card>
                </div>
              </div>
            </section>

            {/* Check-in / Check-out */}
            <section ref={checkinRef as any}>
              <Card title="Check-in / Check-out">
                <p className="text-sm text-gray-600">Manage guest check-in and check-out schedules here.</p>
              </Card>
            </section>

            {/* Bottom bar metrics */}
            <section ref={metricsRef as any}>
              <BottomBar />
            </section>
          </section>
        </main>

        {/* Create Property modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
            <div className="relative z-10 w-full max-w-2xl mx-auto">
              <Card title="Create Property" right={
                <button onClick={() => setShowCreateModal(false)} className="text-sm text-gray-600 hover:text-gray-900">Close</button>
              }>
                <div ref={topRef as any} />
                <PropertyForm onPropertySelected={(id) => { setSelectedPropertyId(id); setShowCreateModal(false); }} />
              </Card>
            </div>
          </div>
        )}

        {/* Add Images modal */}
        {showImagesModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
            <div className="relative z-10 w-full max-w-4xl mx-auto">
              <Card
                title="Add Images"
                right={
                  <button
                    onClick={() => setShowImagesModal(false)}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Close
                  </button>
                }
              >
                <MediaManager propertyId={selectedPropertyId} query={searchQuery} />
              </Card>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}
