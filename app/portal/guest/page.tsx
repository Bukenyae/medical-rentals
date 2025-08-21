"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AuthGate from "@/components/portal/AuthGate";
import SectionFeedback from "@/components/portal/SectionFeedback";
import { toCurrency } from "@/lib/pricing";
import { EnvelopeIcon, PuzzlePieceIcon, WrenchIcon, MapPinIcon, UserCircleIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon, ShieldCheckIcon, UserMinusIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/ui/Avatar";

type RoomKey =
  | "living-room"
  | "kitchen"
  | "main-bathroom"
  | "second-bathroom"
  | "primary-bedroom"
  | "bedroom-b"
  | "bedroom-c"
  | "laundry"
  | "dining-area"
  | "outdoor-space"
  | "storage-space"
  | "utility-closets"
  | "parking-space"
  | "security-features"
  | "heating-cooling";

interface RoomDef {
  key: RoomKey;
  label: string;
  src: string;
  details: string[];
  amenities: string[];
  highlights?: string[]; // feature highlights
  utilities?: string[]; // utility & engagement elements
  decorNotes?: string[]; // ambience & decor
  cleanliness?: string[]; // comfort & cleanliness assurance
  safety?: string[]; // accessibility & safety features
  multimedia?: string[]; // wifi/tv/apps
}

export default function GuestPortalPage() {
  const tabs = [
    { key: "payments", label: "Payments" },
    { key: "extend", label: "Extend Stay" },
    { key: "history", label: "Transactions" },
  ];

  // TODO: Wire this from property data (Supabase) or router params
  const propertyAddress = "123 Leighton Ave, Belle Rouge, LA";
  const mapHref = useMemo(() => {
    const q = encodeURIComponent(propertyAddress);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }, [propertyAddress]);

  // Account menu state and Supabase user
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuItemsRef = useRef<HTMLAnchorElement[] | HTMLButtonElement[] | any[]>([]);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (mounted) {
          setUserEmail(data.user?.email ?? "");
          const meta = (data.user?.user_metadata as any) || {};
          setAvatarUrl(typeof meta.avatar_url === "string" ? meta.avatar_url : "");
          setDisplayName(typeof meta.name === "string" ? meta.name : "");
        }
      } catch {}
    })();
    // subscribe to auth changes so avatar/email update immediately
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      setUserEmail(u?.email ?? "");
      const meta = (u?.user_metadata as any) || {};
      setAvatarUrl(typeof meta.avatar_url === "string" ? meta.avatar_url : "");
      setDisplayName(typeof meta.name === "string" ? meta.name : "");
    });

    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => {
      mounted = false;
      document.removeEventListener("click", onDocClick);
      sub?.subscription?.unsubscribe?.();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      localStorage.removeItem("mr_session");
    } catch {}
    if (typeof window !== "undefined") window.location.href = "/";
  };

  // Mirror property details visual style with real assets once wired; placeholder uses existing image for now
  const rooms: RoomDef[] = useMemo(
    () => [
      {
        key: "living-room",
        label: "Living Room",
        src: "/images/properties/Leighton/living-room.jpg",
        details: [
          "Comfort seating and natural light",
          "Smart TV with streaming apps",
          "Quiet hours respected for professionals",
        ],
        amenities: ["Wi‑Fi", "Smart TV", "Workspace side table"],
        highlights: [
          "Seats 4–6 comfortably",
          "Adjustable lamps + natural light",
          "USB + outlet charging nearby",
          "Optional side desk for laptop work",
        ],
        utilities: [
          "TV: Press Home for streaming apps",
          "Wi‑Fi: SSID and password in welcome card",
          "Storage: shelves/ottoman for clutter‑free stay",
        ],
        decorNotes: [
          "Local art and warm palette",
          "Plants selected for low‑allergen rooms",
        ],
        cleanliness: [
          "Covers and textiles laundered each turnover",
          "Easy‑clean fabrics on seating",
        ],
        safety: [
          "Smoke alarm nearby and fire extinguisher by kitchen entry",
          "Step‑free access from main hallway",
        ],
        multimedia: [
          "Wi‑Fi ~300Mbps down (typical)",
          "Apps: Netflix, Prime, YouTube (use your account)",
        ],
      },
      {
        key: "kitchen",
        label: "Kitchen",
        src: "/images/properties/Leighton/kitchen.jpg",
        details: [
          "Full kitchen for extended stays",
          "Coffee/tea starter kit",
          "Dishwasher and full cookware set",
        ],
        amenities: ["Full cookware", "Dishwasher", "Coffee maker"],
      },
      {
        key: "main-bathroom",
        label: "Bathroom A",
        src: "/images/properties/Leighton/bathroom.jpg",
        details: [
          "Hotel‑grade towels and toiletries",
          "Enhanced cleaning after each stay",
          "Hair dryer and extra paper supplies",
        ],
        amenities: ["Shampoo", "Body wash", "Hair dryer"],
      },
      {
        key: "second-bathroom",
        label: "Bathroom B",
        src: "/images/properties/Leighton/bathroom.jpg",
        details: [
          "Fresh linens and backup toiletries",
          "Weekly refresh for long stays",
          "First‑aid basics available",
        ],
        amenities: ["Extra towels", "Toiletries", "First‑aid kit"],
      },
      {
        key: "primary-bedroom",
        label: "Bedroom A",
        src: "/images/properties/Leighton/bedroom-one.jpg",
        details: [
          "Queen mattress with premium linens",
          "Blackout curtains for night shifts",
          "Closet and dresser storage",
        ],
        amenities: ["Premium linens", "Blackout curtains", "Closet"],
      },
      {
        key: "bedroom-b",
        label: "Bedroom B",
        src: "/images/properties/Leighton/bedroom-two.jpg",
        details: [
          "Cozy full/queen bed",
          "Desk or reading corner",
          "Quiet, restful setup",
        ],
        amenities: ["Linens", "Desk lamp", "Closet"],
      },
      {
        key: "bedroom-c",
        label: "Bedroom C",
        src: "/images/properties/Leighton/bedroom-one.jpg",
        details: [
          "Flexible sleeping arrangement",
          "Suitable for rotating shifts",
          "Extra blanket and pillows",
        ],
        amenities: ["Linens", "Blackout shades", "Storage"],
      },
      {
        key: "laundry",
        label: "Laundry",
        src: "/images/properties/Leighton/dining-one.jpg", // placeholder if laundry photo not available
        details: [
          "In‑unit washer and dryer",
          "Detergent and dryer sheets provided",
          "Iron and ironing board",
        ],
        amenities: ["Washer", "Dryer", "Detergent"],
      },
      {
        key: "dining-area",
        label: "Dining Area",
        src: "/images/properties/Leighton/dining-two.jpg",
        details: [
          "Table seating for meals or work",
          "Good lighting for study or charts",
          "Near kitchen for convenience",
        ],
        amenities: ["Dining table", "Chairs", "Centerpiece"],
      },
      {
        key: "outdoor-space",
        label: "Outdoor Space",
        src: "/images/properties/Leighton/living-room.jpg", // placeholder
        details: [
          "Relaxation area for fresh air",
          "Evening lighting where available",
          "Outdoor seating",
        ],
        amenities: ["Seating", "Lighting", "Privacy fence (where applicable)"],
      },
      {
        key: "storage-space",
        label: "Utilities + Storage",
        src: "/images/properties/Leighton/living-room.jpg", // placeholder
        details: [
          "Closets and shelving for longer stays",
          "Luggage storage options",
          "Lockable compartments (where available)",
        ],
        amenities: ["Closets", "Shelves", "Hangers"],
      },
      {
        key: "parking-space",
        label: "Parking Space",
        src: "/images/properties/Leighton/living-room.jpg", // placeholder
        details: [
          "Driveway or street parking",
          "No towing during listed hours",
          "Proximity to entrance",
        ],
        amenities: ["Driveway", "Street parking", "Lighting"],
      },
      {
        key: "security-features",
        label: "Security Features",
        src: "/images/properties/Leighton/living-room.jpg", // placeholder
        details: [
          "Smart lock with code rotation",
          "Exterior cameras on entry points",
          "Smoke/CO detectors tested",
        ],
        amenities: ["Smart lock", "Cameras (external)", "Smoke/CO detectors"],
      },
      {
        key: "heating-cooling",
        label: "Heating/Cooling Systems",
        src: "/images/properties/Leighton/living-room.jpg", // placeholder
        details: [
          "Programmable thermostat",
          "Ceiling or portable fans available",
          "Seasonal maintenance completed",
        ],
        amenities: ["Thermostat", "Fans", "Filters"],
      },
    ],
    []
  );

  const [activeKey, setActiveKey] = useState<RoomKey>(rooms[0].key);
  const active = rooms.find((r) => r.key === activeKey) ?? rooms[0];
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  // Feedback composer state
  const [messageCategory, setMessageCategory] = useState<"issue" | "amenities" | "contact">("issue");
  const [messageText, setMessageText] = useState<string>("");
  // dropdown removed in favor of left-side tabs
  const [isSending, setIsSending] = useState<boolean>(false);

  // Feedback area/title selector (carousel)
  const messageAreas = [
    "Living Room",
    "Kitchen",
    "Bedroom A",
    "Bedroom B",
    "Bedroom C",
    "Bathroom A",
    "Bathroom B",
    "Laundry",
    "Dining Area",
    "Outdoors",
    "Storage",
    "Parking",
    "Security",
    "Heat + Cooling",
  ] as const;
  const [selectedArea, setSelectedArea] = useState<string>("");
  const areasRef = useRef<HTMLDivElement>(null);

  // Category theming
  const categoryTheme: Record<"issue" | "amenities" | "contact", { chip: string; icon: string }> = {
    issue: { chip: "bg-amber-50 text-amber-700 border-amber-200", icon: "stroke-amber-600" },
    amenities: { chip: "bg-green-50 text-green-700 border-green-200", icon: "stroke-green-600" },
    contact: { chip: "bg-blue-50 text-blue-700 border-blue-200", icon: "stroke-blue-600" },
  };

  async function handleSendMessage() {
    if (!messageText.trim()) return;
    try {
      setIsSending(true);
      const res = await fetch("/api/guest/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomKey: active.key,
          category: messageCategory,
          message: messageText.trim(),
          areaTitle: selectedArea || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      setMessageText("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  }

  const sidebarTabs = [
    { key: "reserve", label: "Finish Reserve" },
    { key: "extend", label: "Extend Stay" },
    { key: "transactions", label: "Transactions" },
  ] as const;
  type SidebarKey = typeof sidebarTabs[number]["key"];
  const [activeSidebar, setActiveSidebar] = useState<SidebarKey>("reserve");

  // Left column tabs for room information (Highlights merged into Details; Utilities and Multimedia merged into Amenities; Cleanliness merged into Ambience)
  const leftTabs = [
    { key: "details", label: "Details" },
    { key: "amenities", label: "Amenities" },
    { key: "decor", label: "Ambience" },
  ] as const;
  type LeftTabKey = typeof leftTabs[number]["key"];
  const [activeLeft, setActiveLeft] = useState<LeftTabKey>("details");

  // Refs to sync left sidebar height with hero+carousel height
  const heroBlockRef = useRef<HTMLDivElement | null>(null);
  const leftStickyRef = useRef<HTMLDivElement | null>(null);
  const [isReserveInView, setIsReserveInView] = useState(false);
  const [priceSummary, setPriceSummary] = useState<{ subtotal?: number; total?: number }>({});
  const scrollToSidebar = () => {
    if (leftStickyRef.current) {
      leftStickyRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Keep the left sidebar min-height matched to the hero+carousel block on desktop (lg) only
  useEffect(() => {
    const leftEl = leftStickyRef.current;
    const target = heroBlockRef.current;
    if (!leftEl) return;

    const mql = typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)") : null; // lg breakpoint

    const apply = () => {
      if (!leftEl) return;
      if (mql && mql.matches && target) {
        const h = target.getBoundingClientRect().height;
        leftEl.style.minHeight = h > 0 ? `${Math.round(h)}px` : "";
      } else {
        // Clear minHeight on small screens
        leftEl.style.minHeight = "";
      }
    };

    // Initial sync
    apply();

    // Observe on lg only
    let ro: ResizeObserver | null = null;
    const attachObserverIfNeeded = () => {
      if (ro) {
        ro.disconnect();
        ro = null;
      }
      if (mql && mql.matches && target) {
        ro = new ResizeObserver(() => apply());
        ro.observe(target);
      }
    };
    attachObserverIfNeeded();

    const onChange = () => {
      attachObserverIfNeeded();
      apply();
    };

    mql?.addEventListener("change", onChange);
    if (typeof window !== "undefined") {
      window.addEventListener("resize", apply);
    }

    return () => {
      mql?.removeEventListener("change", onChange);
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", apply);
      }
      if (ro) ro.disconnect();
    };
  }, []);

  // Observe the sidebar visibility to hide mobile CTA when Reserve is fully visible
  useEffect(() => {
    const target = leftStickyRef.current;
    if (!target) return;
    if (typeof window === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // fully visible if intersectionRatio === 1
        setIsReserveInView(entry.intersectionRatio === 1);
      },
      { root: null, threshold: 1 }
    );
    io.observe(target);
    return () => io.disconnect();
  }, [leftStickyRef]);

  // Read booking summary (subtotal/total) from localStorage written by booking counter
  useEffect(() => {
    const KEY = "booking:draft";
    const read = () => {
      try {
        if (typeof window === "undefined") return;
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        const subtotal = typeof data?.subtotal === "number" ? data.subtotal : undefined;
        const total = typeof data?.total === "number" ? data.total : undefined;
        setPriceSummary((prev) => ({ ...prev, subtotal, total }));
      } catch {
        // ignore parse errors
      }
    };
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) read();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", onStorage);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", onStorage);
      }
    };
  }, []);


  return (
    <AuthGate allowRoles={["guest", "admin"]} showInlineSignOut={false}>
      {/* Page header with account menu */}
      <div className="sticky top-0 z-30 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">Guest Portal</span>
            <span className="hidden sm:inline text-xs text-gray-500">Manage your stay</span>
          </div>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              id="account-menu-button"
              aria-haspopup="menu"
              aria-expanded={menuOpen ? 'true' : 'false'}
              aria-controls="account-menu"
              onClick={() => setMenuOpen((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMenuOpen(true);
                  // focus first item after open
                  setTimeout(() => menuItemsRef.current[0]?.focus(), 0);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMenuOpen(true);
                  setTimeout(() => {
                    const items = menuItemsRef.current;
                    items[items.length - 1]?.focus();
                  }, 0);
                } else if (e.key === "Escape") {
                  setMenuOpen(false);
                }
              }}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              ref={triggerRef}
            >
              {avatarUrl ? (
                <Avatar src={avatarUrl} name={displayName || userEmail} email={userEmail} size="md" alt="Account" />
              ) : (
                <>
                  <UserCircleIcon className="h-5 w-5 text-gray-700" />
                  <span className="hidden sm:inline text-sm text-gray-800">Account</span>
                </>
              )}
            </button>
            {menuOpen && (
              <div
                role="menu"
                aria-labelledby="account-menu-button"
                id="account-menu"
                className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg p-1"
                tabIndex={-1}
                onKeyDown={(e) => {
                  const items = menuItemsRef.current;
                  const currentIndex = items.findIndex((el: HTMLElement) => el === document.activeElement);
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setMenuOpen(false);
                    setTimeout(() => triggerRef.current?.focus(), 0);
                  } else if (e.key === "Tab") {
                    // Trap focus
                    if (items.length === 0) return;
                    if (!e.shiftKey && document.activeElement === items[items.length - 1]) {
                      e.preventDefault();
                      items[0].focus();
                    } else if (e.shiftKey && document.activeElement === items[0]) {
                      e.preventDefault();
                      items[items.length - 1].focus();
                    }
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                    items[next]?.focus();
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                    items[prev]?.focus();
                  }
                }}
              >
                <div className="px-3 py-2">
                  <p className="text-xs text-gray-500">Signed in</p>
                  <p className="truncate text-sm font-medium text-gray-900" title={userEmail || "Guest"}>{userEmail || "Guest"}</p>
                </div>
                <div className="my-1 h-px bg-gray-100" />
                <Link href="/account" role="menuitem" tabIndex={0} ref={(el) => { menuItemsRef.current[0] = el; }} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50">
                  <Cog6ToothIcon className="h-4 w-4 text-gray-500" />
                  <span>Account settings</span>
                </Link>
                <Link href="/account/profile" role="menuitem" tabIndex={0} ref={(el) => { menuItemsRef.current[1] = el; }} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50">
                  <UserCircleIcon className="h-4 w-4 text-gray-500" />
                  <span>Profile</span>
                </Link>
                <Link href="/account/security" role="menuitem" tabIndex={0} ref={(el) => { menuItemsRef.current[2] = el; }} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50">
                  <ShieldCheckIcon className="h-4 w-4 text-gray-500" />
                  <span>Password & security</span>
                </Link>
                <Link href="/account/deactivate" role="menuitem" tabIndex={0} ref={(el) => { menuItemsRef.current[3] = el; }} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-rose-700 hover:bg-rose-50 focus:outline-none focus:bg-rose-50">
                  <UserMinusIcon className="h-4 w-4 text-rose-600" />
                  <span>Deactivate account</span>
                </Link>
                <div className="my-1 h-px bg-gray-100" />
                <button
                  role="menuitem"
                  tabIndex={0}
                  ref={(el) => { menuItemsRef.current[4] = el as any; }}
                  onClick={handleSignOut}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4 text-gray-500" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title moved inside right main column to align with hero width */}

        {/* Title + Hero + room carousel aligned to 2/3 width on desktop, with left sidebar in column 1 */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Left sidebar: visible on mobile, sticky on both mobile and desktop */}
          <div
            ref={leftStickyRef}
            className="space-y-4 sticky top-2 z-20 lg:sticky lg:top-6 self-start lg:max-h-[calc(100vh-1rem)] lg:overflow-auto"
          >
            <>
              {/* Tabs header (styled like left column) */}
              <div className="flex gap-1 overflow-x-auto scrollbar-hide" role="tablist" aria-orientation="horizontal" aria-label="Transaction actions">
                {sidebarTabs.map((t) => {
                  const selected = activeSidebar === t.key;
                  return (
                    <button
                      key={t.key}
                      role="tab"
                      aria-selected={selected}
                      className={`px-3 py-1.5 rounded-full border text-xs md:text-sm transition whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        selected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                      onClick={() => setActiveSidebar(t.key)}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Display window */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 mt-3">
                {activeSidebar === "reserve" && (
                  <div aria-labelledby="Finish Reserve" className="space-y-3">
                    <h3 className="text-base font-semibold text-gray-900">Complete Your Reservation</h3>
                    <p className="text-sm text-gray-600">Review your dates, guests, and price, then confirm.</p>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li className="flex justify-between"><span>Check‑in</span><span>—</span></li>
                      <li className="flex justify-between"><span>Check‑out</span><span>—</span></li>
                      <li className="flex justify-between"><span>Guests</span><span>—</span></li>
                      <li className="flex justify-between font-medium"><span>Total</span><span>—</span></li>
                    </ul>
                    <button className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">Finish Reserve</button>
                    <p className="text-xs text-gray-500">You’ll receive an email confirmation after completing your booking.</p>
                  </div>
                )}

                {activeSidebar === "extend" && (
                  <div aria-labelledby="Extend Stay" className="space-y-3">
                    <h3 className="text-base font-semibold text-gray-900">Extend Your Stay</h3>
                    <p className="text-sm text-gray-600">Select new dates to request an extension. We’ll confirm availability ASAP.</p>
                    <div className="grid grid-cols-1 gap-2">
                      <label className="text-sm text-gray-700">New Check‑out Date
                        <input type="date" className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                      </label>
                      <label className="text-sm text-gray-700">Notes (optional)
                        <textarea className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" rows={3} placeholder="Anything we should know?" />
                      </label>
                    </div>
                    <button className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50">Request Extension</button>
                    <p className="text-xs text-gray-500">We’ll notify you in the portal and via email.</p>
                  </div>
                )}

                {activeSidebar === "transactions" && (
                  <div aria-labelledby="Transactions" className="space-y-3">
                    <h3 className="text-base font-semibold text-gray-900">Transactions</h3>
                    <ul className="divide-y divide-gray-200 text-sm">
                      <li className="py-2 flex justify-between">
                        <span>Reservation Hold</span>
                        <span className="text-gray-600">$—</span>
                      </li>
                      <li className="py-2 flex justify-between">
                        <span>Cleaning Fee</span>
                        <span className="text-gray-600">$—</span>
                      </li>
                      <li className="py-2 flex justify-between">
                        <span>Service Charge</span>
                        <span className="text-gray-600">$—</span>
                      </li>
                    </ul>
                    <div className="flex justify-between text-sm font-medium pt-2">
                      <span>Total</span>
                      <span>$—</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          </div>
          <div className="lg:col-span-2">
            {/* Title and context */}
            <div className="mb-4">
              <p className="text-gray-600 text-sm md:text-base">Explore spaces, leave feedback, and manage your stay.</p>
            </div>
            {/* Hero + secondary images wrapped for height observation (excludes title) */}
            <div ref={heroBlockRef}>
              {/* Hero image */}
              <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden mb-4">
                <Image key={active.src} src={active.src} alt={active.label} fill priority className="object-cover transition-opacity duration-300" />
                {/* Address + Map pill */}
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open address in Maps: ${propertyAddress}`}
                  className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 text-gray-900 px-3 py-1 shadow-sm ring-1 ring-black/5 hover:bg-white transition"
                >
                  <MapPinIcon className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-medium truncate max-w-[12rem] hidden sm:inline" title={propertyAddress}>
                    {propertyAddress}
                  </span>
                  <span className="text-xs font-semibold sm:hidden">Map</span>
                </a>
                <div className="absolute bottom-3 left-3 bg-black/55 text-white text-xs md:text-sm px-2 py-1 rounded">
                  {active.label}
                </div>
              </div>

              {/* Secondary images row */}
              <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2 mb-6">
                {rooms.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setActiveKey(r.key)}
                    className={`relative shrink-0 rounded-xl overflow-hidden border ${
                      activeKey === r.key ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"
                    }`}
                    aria-label={`Show ${r.label}`}
                  >
                    <div className="relative w-36 h-20 md:w-44 md:h-24">
                      <Image src={r.src} alt={r.label} fill className="object-cover" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] md:text-xs px-2 py-1 text-center">
                      {r.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Three-column layout below: left column kept empty to align under the sidebar; content fills middle and right */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)_minmax(0,1fr)] gap-8">
          {/* Placeholder column under the sidebar to maintain alignment */}
          <div className="hidden lg:block" />
          {/* Middle column: active room details */}
          <div className="space-y-4">
            {/* Tabs header */}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {leftTabs.map((t) => {
                const selected = activeLeft === t.key;
                return (
                  <button
                    key={t.key}
                    className={`px-3 py-1.5 rounded-full border text-xs md:text-sm transition whitespace-nowrap ${
                      selected
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => setActiveLeft(t.key)}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Display window */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              {activeLeft === "details" && (
                <div>
                  <div className="flex items-center gap-2">
                    {active.key === "living-room" && <span aria-hidden className="text-lg">🛋️</span>}
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">{active.label} Details</h2>
                  </div>
                  <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700 text-sm">
                    {active.details.map((d, i) => (
                      <li key={i} className="flex items-start gap-2"><span className="mt-1">•</span><span>{d}</span></li>
                    ))}
                  </ul>
                  {active.highlights && active.highlights.length > 0 && (
                    <div className="mt-5">
                      <div className="flex items-center gap-2">
                        {active.key === "living-room" && <span aria-hidden className="text-base">🛋️</span>}
                        <h3 className="text-lg font-semibold text-gray-900">Feature Highlights</h3>
                      </div>
                      <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700 text-sm">
                        {active.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2"><span className="mt-1">•</span><span>{h}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {active.safety && active.safety.length > 0 && (
                    <div className="mt-5">
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="text-base">🛡️</span>
                        <h3 className="text-lg font-semibold text-gray-900">Accessibility & Safety</h3>
                      </div>
                      <ul className="mt-2 space-y-1 text-gray-700 text-sm">
                        {active.safety.map((s, i) => (
                          <li key={i} className="flex items-start gap-2"><span className="mt-1">•</span><span>{s}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeLeft === "amenities" && (
                <div>
                  {/* Amenities (top) */}
                  <div className="flex items-center gap-2">
                    {(active.key === "living-room" || active.key === "kitchen") && <span aria-hidden className="text-base">📺</span>}
                    {active.key === "living-room" && <span aria-hidden className="text-base">📶</span>}
                    <h3 className="text-lg font-semibold text-gray-900">Amenities</h3>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {active.amenities.map((a) => (
                      <span key={a} className="text-xs md:text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-800 border border-gray-200">{a}</span>
                    ))}
                  </div>

                  {/* Utilities (middle) */}
                  {active.utilities && active.utilities.length > 0 && (
                    <div className="mt-5">
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="text-base">🔌</span>
                        <h3 className="text-lg font-semibold text-gray-900">Guest Utility & Engagement</h3>
                      </div>
                      <ul className="mt-2 space-y-1 text-gray-700 text-sm">
                        {active.utilities.map((u, i) => (
                          <li key={i} className="flex items-start gap-2"><span className="mt-1">•</span><span>{u}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Multimedia (bottom) */}
                  {active.multimedia && active.multimedia.length > 0 && (
                    <div className="mt-5">
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="text-base">📺</span>
                        <span aria-hidden className="text-base">📶</span>
                        <h3 className="text-lg font-semibold text-gray-900">Multimedia & Entertainment</h3>
                      </div>
                      <ul className="mt-2 space-y-1 text-gray-700 text-sm">
                        {active.multimedia.map((m, i) => (
                          <li key={i} className="flex items-start gap-2"><span className="mt-1">•</span><span>{m}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              

              {activeLeft === "decor" && (
                <div>
                  {active.decorNotes && active.decorNotes.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="text-base">💡</span>
                        <h3 className="text-lg font-semibold text-gray-900">Local Ambience & Decor</h3>
                      </div>
                      <ul className="mt-2 space-y-1 text-gray-700 text-sm">
                        {active.decorNotes.map((n, i) => (
                          <li key={i} className="flex items-start gap-2"><span className="mt-1">•</span><span>{n}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {active.cleanliness && active.cleanliness.length > 0 && (
                    <div className="mt-5">
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="text-base">✨</span>
                        <h3 className="text-lg font-semibold text-gray-900">Comfort & Cleanliness</h3>
                      </div>
                      <ul className="mt-2 space-y-1 text-gray-700 text-sm">
                        {active.cleanliness.map((c, i) => (
                          <li key={i} className="flex items-start gap-2"><span className="mt-1">•</span><span>{c}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* feedback moved to dedicated middle column */}
              </div>

              {/* Rating: moved from middle column to bottom of left column */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 mt-4">
                <h3 className="text-lg font-semibold text-gray-900">Rate your experience</h3>
                <div className="mt-2 flex items-center gap-1" aria-label="Rate this room">
                  {[1,2,3,4,5].map((n) => (
                    <label key={n} className="cursor-pointer p-1" aria-label={`${n} star`}>
                      <input
                        type="radio"
                        name={`rating-${active.key}`}
                        className="sr-only"
                        checked={rating === n}
                        onChange={() => setRating(n)}
                        onFocus={() => setHoverRating(n)}
                        onBlur={() => setHoverRating(0)}
                      />
                      <span
                        aria-hidden
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        className={`${(hoverRating || rating) >= n ? 'text-yellow-500' : 'text-gray-300'}`}
                      >
                        ★
                      </span>
                    </label>
                  ))}
                  <span className="ml-2 text-xs text-gray-500">{rating ? `${rating}/5` : 'Tap a star to rate'}</span>
                </div>
              </div>
            </div>

          {/* Right column: Feedback (standalone) */}
          <div className="space-y-4">
            <>
              {/* Tabs header (middle column, pill style) */}
              <div className="flex gap-1 overflow-x-auto scrollbar-hide" role="tablist" aria-orientation="horizontal" aria-label="Feedback categories">
                {[
                  { key: 'issue', label: 'Report an Issue' },
                  { key: 'amenities', label: 'Amenity Requests' },
                  { key: 'contact', label: 'Contact Host' },
                ].map((t) => {
                  const selected = messageCategory === (t.key as 'issue' | 'amenities' | 'contact');
                  return (
                    <button
                      key={t.key}
                      role="tab"
                      aria-selected={selected}
                      aria-controls={`message-panel-${active.key}`}
                      className={`px-3 py-1.5 rounded-full border text-xs md:text-sm transition whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        selected ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setMessageCategory(t.key as 'issue' | 'amenities' | 'contact')}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Display window: spacious message box */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 mt-3" id={`message-panel-${active.key}`}>
                {/* Area selector carousel (message title) */}
                <div className="-mt-1">
                  <div
                    ref={areasRef}
                    className="flex gap-2 overflow-x-auto scrollbar-hide py-1"
                    role="group"
                    aria-label="Select a section of the house"
                  >
                    {messageAreas.map((area) => {
                      const selected = selectedArea === area;
                      return (
                        <button
                          key={area}
                          type="button"
                          aria-pressed={selected}
                          className={`px-3 py-1.5 rounded-full border text-xs md:text-sm whitespace-nowrap transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            selected
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => setSelectedArea(selected ? "" : area)}
                        >
                          {area}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Keep accessible label but hide visually */}
                <label htmlFor={`message-${active.key}`} className="sr-only">Your message</label>
                <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <textarea
                    id={`message-${active.key}`}
                    className="block w-full rounded-md bg-transparent px-3 py-2 text-sm outline-none min-h-[200px]"
                    placeholder={
                      messageCategory === 'issue'
                        ? (selectedArea ? `Describe the issue in ${selectedArea}...` : "Describe the issue you're experiencing...")
                        : messageCategory === 'amenities'
                        ? (selectedArea ? `What amenities would you like in ${selectedArea}?` : "List the additional amenities you're requesting...")
                        : (selectedArea ? `Write your message about ${selectedArea}...` : "Write your message to the host...")
                    }
                    value={messageText}
                    maxLength={1000}
                    onChange={(e) => setMessageText(e.target.value)}
                  />
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-xs text-gray-500">{1000 - messageText.length} characters left</span>
                    <span className="text-xs text-gray-400">{messageText.length}/1000</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-gray-500">Selecting a category helps the host prioritize and route your message.</p>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-sm text-sm disabled:opacity-50"
                    onClick={handleSendMessage}
                    disabled={isSending || !messageText.trim()}
                  >
                    {isSending ? 'Sending…' : 'Send Feedback'}
                  </button>
                </div>
              </div>
            </>
          </div>

          {/* (Sidebar removed here; it now lives above next to the hero) */}
        </div>

      </div>

      {/* Mobile sticky bottom CTA: Finish Reserve (hidden if Reserve card fully visible) */}
      <div
        className={`lg:hidden fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-t ${
          activeSidebar === "reserve" && isReserveInView ? "hidden" : ""
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Mini price summary */}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500">Subtotal</div>
            <div className="text-sm font-medium text-gray-900">{typeof priceSummary.subtotal === "number" ? toCurrency(priceSummary.subtotal) : "—"}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500">Total</div>
            <div className="text-sm font-semibold text-gray-900">{typeof priceSummary.total === "number" ? toCurrency(priceSummary.total) : "—"}</div>
          </div>
          <button
            type="button"
            aria-label="Finish Reserve"
            onClick={() => {
              setActiveSidebar("reserve");
              scrollToSidebar();
            }}
            className="shrink-0 inline-flex items-center justify-center rounded-xl bg-blue-600 text-white font-semibold px-4 py-3 shadow-sm hover:bg-blue-700 active:bg-blue-700"
          >
            Finish Reserve
          </button>
        </div>
      </div>

      {/* Spacer so mobile content isn't hidden behind bottom bar (only when the bar is shown) */}
      <div className={`lg:hidden ${activeSidebar === "reserve" && isReserveInView ? "h-0" : "h-20"}`} />
    </AuthGate>
  );
}
