"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/portal/Card";
import Icon from "@/components/portal/Icon";
import PublishChecklist from "@/components/portal/PublishChecklist";
import { createClient } from "@/lib/supabase/client";

interface HostDetailPaneProps {
  selectedPropertyId: string | null;
}

function PublishStatusStrip({ selectedPropertyId }: { selectedPropertyId: string | null }) {
  // Placeholder dates — in real implementation, source from audit trails / updated_at fields
  const date = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toLocaleDateString();
  };
  const chips: string[] = [
    `Property +/- ${date(12)}`,
    `Google URL ${selectedPropertyId ? "Set" : "Missing"}`,
    `Photo Update ${date(5)}`,
    `Published ${selectedPropertyId ? date(1) : "—"}`,
  ];
  return (
    <div className="mt-4">
      <ul className="flex flex-wrap items-center gap-2">
        {chips.map((text) => (
          <li key={text} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs border border-gray-200 text-gray-600 bg-transparent">
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Client Engagement Card ---
function ClientEngagementCard() {
  const [tab, setTab] = useState<"messages" | "feedback" | "updates">("messages");
  return (
    <Card
      title="Client Engagement"
      right={
        <div className="flex items-center gap-2">
          <nav className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5" role="tablist" aria-label="Client Engagement Tabs">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "messages"}
              onClick={() => setTab("messages")}
              className={`px-2 py-1 text-xs rounded-md border ${
                tab === "messages" ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
            >
              Messages
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "feedback"}
              onClick={() => setTab("feedback")}
              className={`px-2 py-1 text-xs rounded-md border ${
                tab === "feedback" ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
            >
              Feedback
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "updates"}
              onClick={() => setTab("updates")}
              className={`px-2 py-1 text-xs rounded-md border ${
                tab === "updates" ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
            >
              Updates
            </button>
          </nav>
        </div>
      }
    >
      {tab === "messages" ? (
        <div className="space-y-2 text-sm text-gray-800">
          <div className="text-sm font-medium text-gray-900">Recent messages</div>
          <ul className="space-y-1">
            <li>Guest: “ETA ~6pm, thanks!”</li>
            <li>Cleaner: “Completed Unit A.”</li>
          </ul>
        </div>
      ) : tab === "feedback" ? (
        <div className="space-y-2 text-sm text-gray-800">
          <div className="text-sm font-medium text-gray-900">Latest feedback</div>
          <ul className="space-y-1">
            <li>“Great location, very clean.” — 5★</li>
            <li>“Could improve Wi‑Fi speed.” — 4★</li>
          </ul>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-gray-800">
          <div className="text-sm font-medium text-gray-900">Operational updates</div>
          <ul className="space-y-1">
            <li>8/14 — Replaced air filter</li>
            <li>8/15 — Keypad battery on order</li>
          </ul>
        </div>
      )}
    </Card>
  );
}

function OverviewBreakdown({ kpis }: { kpis: KPIs | null }) {
  // Hooks must be called unconditionally (before any early returns)
  const [showMoreExp, setShowMoreExp] = useState(false);
  if (!kpis) return null;
  // Minimalist, readable layout. Uses available totals; granular rows show placeholders when unknown.
  const currency = (n: number | null | undefined) =>
    typeof n === "number" ? `$${n.toLocaleString()}` : "—";

  // Derive simple, conservative estimates for demo-only display without asserting data integrity.
  // Keep balance very lightweight; if totals are absent, show dashes.
  const revenueTotal = kpis.revenue;
  const expensesTotal = kpis.expenses;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Left column: stack Revenue, ROI, LOS */}
      <div className="space-y-3">
        <section className="rounded-lg border border-gray-200 bg-white p-3">
          <header className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Revenue</div>
            <div className="text-sm font-semibold text-gray-900">{currency(revenueTotal)}</div>
          </header>
          <ul className="text-sm text-gray-700 space-y-1">
            <li className="flex items-center justify-between"><span>Nightly Rate</span><span className="tabular-nums">—</span></li>
            <li className="flex items-center justify-between"><span>Cleaning Fees</span><span className="tabular-nums">—</span></li>
            <li className="flex items-center justify-between"><span>Other Income</span><span className="tabular-nums">—</span></li>
          </ul>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-3">
          <header className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">ROI</div>
            <div className="text-sm font-semibold text-gray-900">{Math.round(kpis.roi * 100)}%</div>
          </header>
          <ul className="text-sm text-gray-700 space-y-1">
            <li className="flex items-center justify-between"><span>Net Profit</span><span className="tabular-nums">{currency(kpis.revenue - kpis.expenses)}</span></li>
            <li className="text-gray-500 opacity-40">ROI = Net Profit / Expenses × 100%</li>
          </ul>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-3">
          <header className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Length of Stay</div>
            <div className="text-sm font-semibold text-gray-900">{kpis.los} nights</div>
          </header>
          <ul className="text-sm text-gray-700 space-y-1">
            <li className="flex items-center justify-between"><span>Average Booking</span><span className="tabular-nums">{kpis.los} nights</span></li>
            <li className="flex items-center justify-between"><span>Number of Stays</span><span className="tabular-nums">{kpis.bookings}</span></li>
            <li className="flex items-center justify-between"><span>Longest Stay</span><span className="tabular-nums">—</span></li>
          </ul>
        </section>
      </div>

      {/* Right column: long Expenses list */}
      <section className="rounded-lg border border-gray-200 bg-white p-3">
        <header className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Expenses</div>
          <div className="text-sm font-semibold text-gray-900">{currency(expensesTotal)}</div>
        </header>
        <ul className="text-sm text-gray-700 space-y-1">
          {/* Base items always visible */}
          <li className="flex items-center justify-between"><span>Cleaning</span><span className="tabular-nums">—</span></li>
          <li className="flex items-center justify-between"><span>Maintenance</span><span className="tabular-nums">—</span></li>
          <li className="flex items-center justify-between"><span>Utilities</span><span className="tabular-nums">—</span></li>
          <li className="flex items-center justify-between"><span>HOA Fees</span><span className="tabular-nums">—</span></li>
          <li className="flex items-center justify-between"><span>Mortgage</span><span className="tabular-nums">—</span></li>
          <li className="flex items-center justify-between"><span>Booking Fees</span><span className="tabular-nums">—</span></li>

          {/* Advanced items behind Show more */}
          {showMoreExp && (
            <>
              <li className="flex items-center justify-between"><span>Ads & Marketings</span><span className="tabular-nums">—</span></li>
              <li className="flex items-center justify-between"><span>Appliance & Furniture</span><span className="tabular-nums">—</span></li>
              <li className="flex items-center justify-between"><span>Household supplies</span><span className="tabular-nums">—</span></li>
              <li className="flex items-center justify-between"><span>Insurance</span><span className="tabular-nums">—</span></li>
              <li className="flex items-center justify-between"><span>LodgingTaxes</span><span className="tabular-nums">—</span></li>
              <li className="flex items-center justify-between"><span>Professional Services</span><span className="tabular-nums">—</span></li>
              <li className="flex items-center justify-between"><span>Property Management Fees</span><span className="tabular-nums">—</span></li>
              <li className="flex items-center justify-between"><span>Property Taxes</span><span className="tabular-nums">—</span></li>
              <li className="flex items-center justify-between"><span>Subscriptions</span><span className="tabular-nums">—</span></li>
              <li className="flex items-center justify-between"><span>Travel Expenses</span><span className="tabular-nums">—</span></li>
              <li className="flex items-center justify-between"><span>Capital Reserve</span><span className="tabular-nums">—</span></li>
              <li className="flex items-center justify-between"><span>Other</span><span className="tabular-nums">—</span></li>
            </>
          )}
        </ul>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowMoreExp((v) => !v)}
            className="text-xs text-gray-600 hover:text-gray-900"
            aria-expanded={showMoreExp ? 'true' : 'false'}
          >
            {showMoreExp ? "Show less" : "Show more"}
          </button>
        </div>
      </section>
    </div>
  );
}

// Simple KPI type
interface KPIs {
  bookings: number;
  revenue: number;
  adr: number; // Average Daily Rate
  occupancy: number; // 0..1
  revpar: number; // Revenue per available room/night
  expenses: number; // total variable + fixed costs
  roi: number; // ratio: (revenue - expenses) / expenses
  los: number; // average length of stay (nights)
}

type RangeKey = "7d" | "30d" | "90d" | "ytd";

export default function HostDetailPane({ selectedPropertyId }: HostDetailPaneProps) {
  const supabase = useMemo(() => createClient(), []);
  const [range, setRange] = useState<RangeKey>("30d");
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [board, setBoard] = useState<KanbanState>(() => defaultKanban());
  const [showOverviewDetails, setShowOverviewDetails] = useState(false);
  const [opsTab, setOpsTab] = useState<"check" | "pipeline" | "pricing">("check");

  // Fetch KPIs – placeholder implementation (safe/no throw)
  useEffect(() => {
    let mounted = true;
    async function fetchKPIs() {
      setLoading(true);
      try {
        // NOTE: Replace this placeholder with real aggregates once tables are defined.
        // Guard against missing tables by not querying until schema is confirmed.
        const revenue = selectedPropertyId ? 8200 : 24500;
        const expenses = selectedPropertyId ? 5200 : 13800;
        const roi = (revenue - expenses) / Math.max(expenses, 1); // ratio
        const mock: KPIs = {
          bookings: selectedPropertyId ? 12 : 34,
          revenue,
          adr: selectedPropertyId ? 175 : 160,
          occupancy: selectedPropertyId ? 0.62 : 0.58,
          revpar: selectedPropertyId ? 108.5 : 92.8,
          expenses,
          roi,
          los: selectedPropertyId ? 13 : 11,
        };
        if (!mounted) return;
        setKpis(mock);
      } catch (e) {
        if (!mounted) return;
        setKpis(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchKPIs();
    return () => {
      mounted = false;
    };
  }, [supabase, selectedPropertyId, range]);

  return (
    <div className="space-y-6">
      {selectedPropertyId ? (
        <>
          <Card title="Overview" right={<RangeToggles range={range} setRange={setRange} />}> 
            {loading ? (
              <KPISkeleton />
            ) : (
              <>
                <KpiRow kpis={kpis} />
                <div className="mt-3 border-t border-gray-100">
                  {showOverviewDetails && (
                    <div className="pt-3">
                      <OverviewBreakdown kpis={kpis} />
                    </div>
                  )}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowOverviewDetails((v) => !v)}
                      className="group w-full inline-flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                      aria-expanded={showOverviewDetails ? 'true' : 'false'}
                    >
                      <span>{showOverviewDetails ? "Hide details" : "View details"}</span>
                      <svg
                        className={`h-4 w-4 transition-transform ${showOverviewDetails ? "rotate-180" : "rotate-0"}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </Card>

          <OperationsCard
            loading={loading}
            opsTab={opsTab}
            setOpsTab={setOpsTab}
            board={board}
            setBoard={setBoard}
            selectedPropertyId={selectedPropertyId}
          />
          <ClientEngagementCard />

          <div className="flex items-center gap-2">
            <a
              href={`/portal/host/properties/${selectedPropertyId}/edit`}
              className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <Icon name="pencil" /> Edit listing
            </a>
            <a
              href={`#pricing`}
              className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <Icon name="payments" /> Pricing
            </a>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-3 py-2 text-sm hover:bg-emerald-700"
            >
              <Icon name="check" /> Publish
            </button>
          </div>
        </>
      ) : (
        <>
          <Card title="All properties">
            {loading ? (
              <KPISkeleton />
            ) : (
              <>
                <KpiRow kpis={kpis} />
                <PublishStatusStrip selectedPropertyId={null} />
              </>
            )}
          </Card>
          <OperationsCard
            loading={loading}
            opsTab={opsTab}
            setOpsTab={setOpsTab}
            board={board}
            setBoard={setBoard}
            selectedPropertyId={null}
          />
          <ClientEngagementCard />
        </>
      )}
    </div>
  );
}

function RangeToggles({ range, setRange }: { range: RangeKey; setRange: (r: RangeKey) => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
      {([
        ["7d", "7"],
        ["30d", "30"],
        ["90d", "90"],
        ["ytd", "YTD"],
      ] as [RangeKey, string][]).map(([key, label]) => (
        <button
          key={key}
          className={`px-2.5 py-1 text-xs rounded-md ${range === key ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`}
          onClick={() => setRange(key)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function KpiRow({ kpis }: { kpis: KPIs | null }) {
  if (!kpis) return null;
  // Right column Overview KPIs (distinct from left column card KPIs):
  // Order: Revenue → Expenses → ROI → Length of Stay (RevPAR removed)
  const items: Array<{ label: string; value: string; tip?: string }> = [
    { label: "Revenue", value: `$${kpis.revenue.toLocaleString()}` },
    { label: "Expenses", value: `$${kpis.expenses.toLocaleString()}` },
    {
      label: "ROI",
      value: `${Math.round(kpis.roi * 100)}%`,
      tip: "(Revenue - Expenses) / Expenses",
    },
    {
      label: "Length of Stay",
      value: `${kpis.los} nights`,
      tip: "Average number of nights per booking",
    },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((k) => (
        <div key={k.label} className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="text-xs text-gray-500">
            {k.tip ? (
              <abbr title={k.tip} className="no-underline cursor-help">
                {k.label}
              </abbr>
            ) : (
              k.label
            )}
          </div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{k.value}</div>
        </div>
      ))}
    </div>
  );
}

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-3 animate-pulse">
          <div className="h-3 w-16 bg-gray-200 rounded" />
          <div className="mt-2 h-5 w-24 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded" />
      ))}
    </div>
  );
}

// --- Kanban ---
interface CardItem { id: string; title: string; subtitle?: string; }
interface KanbanState {
  inquiries: CardItem[];
  checkin: CardItem[];
  stay: CardItem[];
  checkout: CardItem[];
  post: CardItem[];
}

function defaultKanban(): KanbanState {
  return {
    inquiries: [
      { id: "q1", title: "RN — Baylor Clinic", subtitle: "Aug 22" },
      { id: "q2", title: "Locum — Ochsner", subtitle: "Aug 24" },
    ],
    checkin: [{ id: "c1", title: "Dr. Smith", subtitle: "Fri" }],
    stay: [{ id: "s1", title: "Dr. Lee", subtitle: "Now" }],
    checkout: [{ id: "o1", title: "PA Turner", subtitle: "Sun" }],
    post: [{ id: "p1", title: "Survey", subtitle: "Pending" }],
  };
}

function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
          <div className="space-y-2">
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Kanban({ board, setBoard }: { board: KanbanState; setBoard: (b: KanbanState) => void }) {
  const cols: Array<{ key: keyof KanbanState; title: string }> = [
    { key: "inquiries", title: "Inquiries" },
    { key: "checkin", title: "Check-in" },
    { key: "stay", title: "Stay" },
    { key: "checkout", title: "Check-out" },
    { key: "post", title: "Post-stay" },
  ];

  const onDragStart = (e: React.DragEvent, from: keyof KanbanState, id: string) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ from, id }));
  };
  const onDrop = (e: React.DragEvent, to: keyof KanbanState) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    try {
      const { from, id } = JSON.parse(data) as { from: keyof KanbanState; id: string };
      if (!from || !id || from === to) return;
      setBoard(moveCard(board, from, to, id));
    } catch {}
  };
  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {cols.map((c) => (
        <div key={c.key} className="rounded-xl border border-gray-200 bg-white p-3" onDragOver={allowDrop} onDrop={(e) => onDrop(e, c.key)}>
          <div className="text-sm font-semibold text-gray-900 mb-2">{c.title}</div>
          <div className="space-y-2 min-h-[60px]">
            {board[c.key].map((card) => (
              <div
                key={card.id}
                className="cursor-grab active:cursor-grabbing rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm text-gray-800"
                draggable
                onDragStart={(e) => onDragStart(e, c.key, card.id)}
              >
                {/* Mobile: single-line for faster scanning; show subtitle inline, truncate */}
                <div className="block sm:hidden font-medium truncate">
                  {card.title}
                  {card.subtitle ? <span className="text-xs text-gray-500 ml-1">• {card.subtitle}</span> : null}
                </div>
                {/* Desktop: two-line layout */}
                <div className="hidden sm:block">
                  <div className="font-medium">{card.title}</div>
                  {card.subtitle && <div className="text-xs text-gray-500">{card.subtitle}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function moveCard(board: KanbanState, from: keyof KanbanState, to: keyof KanbanState, id: string): KanbanState {
  const src = [...board[from]];
  const dst = [...board[to]];
  const idx = src.findIndex((c) => c.id === id);
  if (idx === -1) return board;
  const [card] = src.splice(idx, 1);
  dst.unshift(card);
  return { ...board, [from]: src, [to]: dst } as KanbanState;
}

// --- Consolidated Operations Card ---
function OperationsCard({
  loading,
  opsTab,
  setOpsTab,
  board,
  setBoard,
  selectedPropertyId,
}: {
  loading: boolean;
  opsTab: "check" | "pipeline" | "pricing";
  setOpsTab: (t: "check" | "pipeline" | "pricing") => void;
  board: KanbanState;
  setBoard: (b: KanbanState) => void;
  selectedPropertyId: string | null;
}) {
  // Local Supabase client for this card
  const supabase = useMemo(() => createClient(), []);
  // Blocked dates state shared with Pricing & Calendar
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Fetch blocked dates when property changes
  useEffect(() => {
    let mounted = true;
    async function loadBlocked() {
      if (!selectedPropertyId) { setBlockedDates(new Set()); return; }
      setLoadingCalendar(true);
      try {
        const { data, error } = await supabase
          .from('property_unavailable_dates')
          .select('date')
          .eq('property_id', selectedPropertyId);
        if (error) throw error;
        const set = new Set<string>((data ?? []).map((r: any) => (r.date as string).slice(0,10)));
        if (mounted) setBlockedDates(set);
      } catch {
        if (mounted) setBlockedDates(new Set());
      } finally {
        if (mounted) setLoadingCalendar(false);
      }
    }
    loadBlocked();
    return () => { mounted = false; };
  }, [supabase, selectedPropertyId]);

  // Toggle handler with optimistic updates and Supabase persistence
  const onToggleBlocked = async (iso: string, nextActive: boolean) => {
    const previous = new Set(blockedDates);
    const optimistic = new Set(blockedDates);
    if (nextActive) optimistic.add(iso); else optimistic.delete(iso);
    setBlockedDates(optimistic);
    if (!selectedPropertyId) return;
    if (nextActive) {
      const { error } = await supabase
        .from('property_unavailable_dates')
        .insert([{ property_id: selectedPropertyId, date: iso }]);
      if (error) {
        setBlockedDates(previous);
        alert(error.message || 'Failed to block date');
      }
    } else {
      const { error } = await supabase
        .from('property_unavailable_dates')
        .delete()
        .eq('property_id', selectedPropertyId)
        .eq('date', iso);
      if (error) {
        setBlockedDates(previous);
        alert(error.message || 'Failed to unblock date');
      }
    }
  };

  return (
      <Card
        title="Operations"
        right={
          <nav className="inline-flex items-center gap-1" role="tablist" aria-label="Operations tabs">
            <button
              type="button"
              role="tab"
              aria-selected={opsTab === "check"}
              onClick={() => setOpsTab("check")}
              className={`px-2 py-1 text-xs rounded-md border ${
                opsTab === "check" ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
            >
              Check-in/Out
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={opsTab === "pipeline"}
              onClick={() => setOpsTab("pipeline")}
              className={`px-2 py-1 text-xs rounded-md border ${
                opsTab === "pipeline" ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
            >
              Pipeline & Ops
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={opsTab === "pricing"}
              onClick={() => setOpsTab("pricing")}
              className={`px-2 py-1 text-xs rounded-md border ${
                opsTab === "pricing" ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
            >
              Pricing & Calendar
            </button>
          </nav>
        }
      >
        {loading ? (
          opsTab === "check" ? <KanbanSkeleton /> : <ListSkeleton rows={opsTab === "pricing" ? 8 : 6} />
        ) : opsTab === "check" ? (
          <Kanban board={board} setBoard={setBoard} />
        ) : opsTab === "pipeline" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-800">
            <section className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Upcoming</div>
              <ul className="space-y-1">
                <li>Check-in — Dr. Smith (Fri)</li>
                <li>Check-out — Dr. Lee (Sun)</li>
              </ul>
            </section>
            <section className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Open tickets</div>
              <ul className="space-y-1">
                <li>#1043 — AC filter replacement</li>
                <li>#1048 — Door keypad low battery</li>
              </ul>
            </section>
            <section className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Messages</div>
              <ul className="space-y-1">
                <li>Guest: "ETA ~6pm, thanks!"</li>
                <li>Cleaner: "Completed Unit A"</li>
              </ul>
            </section>
          </div>
        ) : opsTab === "pricing" ? (
          <PricingCalendarSection
            loading={loadingCalendar}
            blockedDates={blockedDates}
            onToggleBlocked={onToggleBlocked}
            disabled={!selectedPropertyId}
          />
        ) : null}
      </Card>
  );
}

function PricingCalendarSection({
  loading,
  blockedDates,
  onToggleBlocked,
  disabled,
}: {
  loading: boolean;
  blockedDates: Set<string>;
  onToggleBlocked: (iso: string, nextActive: boolean) => void | Promise<void>;
  disabled: boolean;
}) {
  return (
    <div id="pricing" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-900">Pricing & availability</div>
        <div className="text-xs text-gray-500">Toggle dates to block availability</div>
      </div>
      {loading ? (
        <ListSkeleton rows={6} />
      ) : (
        <CalendarBlocker blockedDates={blockedDates} onToggle={disabled ? () => {} : onToggleBlocked} />
      )}
      {disabled && (
        <div className="text-xs text-amber-600">Save/select a property first to persist calendar changes.</div>
      )}
    </div>
  );
}

// Lightweight calendar blocker, adapted from PropertyForm.tsx
function CalendarBlocker({
  blockedDates,
  onToggle,
}: {
  blockedDates: Set<string>;
  onToggle: (iso: string, nextActive: boolean) => void | Promise<void>;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthStartWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks: Array<Array<number | null>> = [];
  let w: Array<number | null> = Array.from({ length: monthStartWeekday }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    w.push(d);
    if (w.length === 7) { weeks.push(w); w = []; }
  }
  if (w.length) { while (w.length < 7) w.push(null); weeks.push(w); }

  const fmt = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const nextMonth = () => setCursor(new Date(year, month + 1, 1));
  const prevMonth = () => setCursor(new Date(year, month - 1, 1));
  const toggle = (d: number) => {
    const iso = fmt(year, month, d);
    const nextActive = !blockedDates.has(iso);
    void onToggle(iso, nextActive);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <button type="button" className="p-1 rounded hover:bg-gray-100" onClick={prevMonth} aria-label="Previous month">‹</button>
        <div className="text-sm font-medium text-gray-900">{monthLabel}</div>
        <button type="button" className="p-1 rounded hover:bg-gray-100" onClick={nextMonth} aria-label="Next month">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[10px] text-gray-500">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <div key={d} className="text-center">{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {weeks.map((row, i) => (
          <>
            {row.map((d, j) => {
              if (!d) return <div key={`e-${i}-${j}`} className="h-8" />;
              const iso = fmt(year, month, d);
              const active = blockedDates.has(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => toggle(d)}
                  className={`h-8 text-xs rounded border ${active ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                  aria-pressed={active ? 'true' : 'false'}
                  aria-label={`Toggle ${iso}`}
                  title={active ? `Unavailable: ${iso}` : `Available: ${iso}`}
                >
                  {d}
                </button>
              );
            })}
          </>
        ))}
      </div>
      <div className="text-xs text-gray-600 mt-2">Click dates to toggle unavailable. Saved automatically.</div>
    </div>
  );
}
