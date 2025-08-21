"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import AuthGate from "@/components/portal/AuthGate";
import SectionFeedback from "@/components/portal/SectionFeedback";
import { PropertyListView } from "@/components/portal/PropertyListView";
import { createClient } from "@/lib/supabase/client";
import PublishChecklist from "@/components/portal/PublishChecklist";
import Card from "@/components/portal/Card";
import Icon from "@/components/portal/Icon";
import SidebarItem from "@/components/portal/SidebarItem";
import BottomBar from "@/components/portal/BottomBar";
import PaymentsList from "@/components/portal/PaymentsList";
import TenantsList from "@/components/portal/TenantsList";
import UserMenu from "@/components/portal/UserMenu";
import { PropertySwitcher } from "@/components/portal/PropertySwitcher";
import HostDetailPane from "@/components/portal/HostDetailPane";
import { useRouter, useSearchParams } from "next/navigation";

export default function HostPortalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<
    | "dashboard"
    | "media"
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
  const paymentsRef = useRef<HTMLElement | null>(null);
  const tenantsRef = useRef<HTMLElement | null>(null);
  const checkinRef = useRef<HTMLElement | null>(null);
  const feedbackRef = useRef<HTMLElement | null>(null);
  const metricsRef = useRef<HTMLElement | null>(null);
  const sections = ["Bedroom A", "Bathroom A", "Kitchen", "Living Room", "Laundry"];

  // Initialize selection from URL (?propertyId=...) or fallback to localStorage
  useEffect(() => {
    const fromUrl = searchParams?.get('propertyId');
    if (fromUrl) {
      setSelectedPropertyId(fromUrl);
      return;
    }
    const stored = typeof window !== 'undefined' ? localStorage.getItem('host_selected_property') : null;
    if (stored) setSelectedPropertyId(stored);
  }, [searchParams]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedPropertyId) localStorage.setItem('host_selected_property', selectedPropertyId);
      else localStorage.removeItem('host_selected_property');
    }
    // Persist selection in the URL for deep links
    const params = new URLSearchParams(searchParams?.toString());
    if (selectedPropertyId) params.set('propertyId', selectedPropertyId); else params.delete('propertyId');
    const newQuery = params.toString();
    const newUrl = typeof window !== 'undefined'
      ? (newQuery ? `${window.location.pathname}?${newQuery}` : window.location.pathname)
      : '/portal/host';
    router.replace(newUrl, { scroll: false });
  }, [selectedPropertyId, searchParams, router]);

  // Observe sections to update active sidebar state
  useEffect(() => {
    const sections: Array<{ id: typeof activeSection; el: Element | null }> = [
      { id: "dashboard", el: topRef.current },
      { id: "media", el: mediaRef.current },
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

  // No dashboard-level status fetching; handled inside PublishChecklist

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
    alert('Property published');
  }

  // Show toast from query param and then remove it from URL
  useEffect(() => {
    const toast = searchParams?.get('toast');
    if (!toast) return;
    setToastMsg(toast);
    setTimeout(() => setToastMsg(null), 2500);
    // Clean the URL without a full reload
    const params = new URLSearchParams(searchParams.toString());
    params.delete('toast');
    const newQuery = params.toString();
    const newUrl = typeof window !== 'undefined'
      ? (newQuery ? `${window.location.pathname}?${newQuery}` : window.location.pathname)
      : '/portal/host';
    router.replace(newUrl, { scroll: false });
  }, [searchParams, router]);

  return (
    <AuthGate allowRoles={["host", "admin"]}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Internal sticky header */}
        <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 border-b border-gray-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-2xl bg-emerald-600 text-white grid place-items-center font-bold">A</div>
            </div>
            <p className="flex-1 text-center text-sm text-gray-600 whitespace-nowrap"><span className="font-semibold text-gray-900">Host Dashboard</span> -- Finish your listing setup and publish when ready.</p>
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
                active={false}
                onClick={() => {}}
                collapsed={collapsed}
              />
            </div>
          </aside>

          {/* Content */}
          <section className="col-span-12 md:col-span-9 lg:col-span-10 space-y-6">
            <div ref={topRef as any} />

            {/* Property Assets + Publish status */}
            <div className="grid grid-cols-12 gap-6" ref={mediaRef as any}>
              <div className="col-span-12 lg:col-span-4 space-y-6">
                <Card
                  title="Property Assets"
                  right={
                    <a
                      href="/portal/host/properties/new"
                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 whitespace-nowrap transition-colors"
                      aria-label="Add Property"
                    >
                      <span className="text-gray-500"><Icon name="plus" /></span>
                      <span>Property</span>
                    </a>
                  }
                >
                  {/* Line 2: Property switcher */}
                  <div className="mb-3">
                    <PropertySwitcher
                      currentPropertyId={selectedPropertyId}
                      onPropertySelect={(id) => setSelectedPropertyId(id)}
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                    />
                  </div>
                  {/* Left column now shows list of properties with search/filter */}
                  <PropertyListView
                    selectedPropertyId={selectedPropertyId}
                    onPropertySelect={(id) => setSelectedPropertyId(id)}
                    refreshToken={refreshToken}
                    searchQuery={searchQuery}
                  />
                </Card>
              </div>

              <div className="col-span-12 lg:col-span-8 order-last lg:order-none">
                <HostDetailPane selectedPropertyId={selectedPropertyId} />
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

        {/* Toast */}
        {toastMsg && (
          <div className="fixed bottom-4 right-4 z-[60]">
            <div className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
              {toastMsg}
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}
