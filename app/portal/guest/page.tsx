"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthGate from "@/components/portal/AuthGate";
import SectionFeedback from "@/components/portal/SectionFeedback";
import { toCurrency } from "@/lib/pricing";
import { EnvelopeIcon, PuzzlePieceIcon, WrenchIcon, MapPinIcon, UserCircleIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon, ShieldCheckIcon, UserMinusIcon } from "@heroicons/react/24/outline";
import AccountMenu from "@/components/AccountMenu";
import useAuthUser from "@/hooks/useAuthUser";
import CheckoutDialog from "@/components/payments/CheckoutDialog";
import { createClient } from "@/lib/supabase/client";
import Footer from "@/components/Footer";

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
  highlights?: string[];
  utilities?: string[];
  decorNotes?: string[];
  cleanliness?: string[];
  safety?: string[];
  multimedia?: string[];
  notes?: string[];
  defaultDescription?: string;
}

export default function GuestPortalPage() {
  const searchParams = useSearchParams();
  const tabs = [
    { key: "payments", label: "Payments" },
    { key: "extend", label: "Extend Stay" },
    { key: "history", label: "Transactions" },
  ];

  const supabase = useMemo(() => createClient(), []);
  const [propertyAddress, setPropertyAddress] = useState<string>("");
  const [propertyTitleDisplay, setPropertyTitleDisplay] = useState<string | null>(null);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [propertyImages, setPropertyImages] = useState<string[]>([]);
  const mapHref = useMemo(() => {
    if (mapUrl) return mapUrl;
    if (!propertyAddress) return undefined;
    const q = encodeURIComponent(propertyAddress);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }, [mapUrl, propertyAddress]);

  // Centralized auth state
  const { user } = useAuthUser();

  // Mirror property details visual style with real assets once wired; placeholder uses existing image for now
  const baseRooms: RoomDef[] = useMemo(
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

  const [rooms, setRooms] = useState<RoomDef[]>(() => baseRooms);
  const [activeRoomKey, setActiveRoomKey] = useState<RoomKey>(baseRooms[0]?.key ?? "living-room");
  const [heroImage, setHeroImage] = useState<string>(baseRooms[0]?.src ?? "/images/properties/Leighton/living-room.jpg");
  const heroBlockRef = useRef<HTMLDivElement | null>(null);
  const leftStickyRef = useRef<HTMLDivElement | null>(null);
  const [priceSummary, setPriceSummary] = useState<{ subtotal?: number; total?: number }>({});
  const [draftDetails, setDraftDetails] = useState<{ propertyId?: string; propertyTitle?: string; checkIn?: string; checkOut?: string; guests?: number; currency?: string }>({});
  const [showCheckout, setShowCheckout] = useState(false);
  const [isReserveInView, setIsReserveInView] = useState(false);

  const sidebarTabs = [
    { key: "reserve", label: "Finish Reserve" },
    { key: "extend", label: "Extend Stay" },
    { key: "transactions", label: "Transactions" },
    { key: "past", label: "Past Stays" },
  ] as const;
  type SidebarKey = typeof sidebarTabs[number]["key"];
  const [activeSidebar, setActiveSidebar] = useState<SidebarKey>("reserve");

  const leftTabs = [
    { key: "current", label: "Current Stay" },
    { key: "details", label: "Details" },
    { key: "amenities", label: "Amenities" },
    { key: "decor", label: "Ambience" },
  ] as const;
  type LeftTabKey = typeof leftTabs[number]["key"];
  const [activeLeft, setActiveLeft] = useState<LeftTabKey>("current");

  const scrollToSidebar = () => {
    if (leftStickyRef.current) {
      leftStickyRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (!rooms.length) return;
    if (!rooms.some((room) => room.key === activeRoomKey)) {
      setActiveRoomKey(rooms[0].key);
    }
  }, [rooms, activeRoomKey]);

  useEffect(() => {
    if (!rooms.length) {
      setHeroImage(baseRooms[0]?.src ?? "/images/properties/Leighton/living-room.jpg");
      return;
    }
    const current = rooms.find((room) => room.key === activeRoomKey) ?? rooms[0];
    setHeroImage(current.src);
  }, [rooms, activeRoomKey, baseRooms]);

  const activeRoom = rooms.find((r) => r.key === activeRoomKey) ?? rooms[0] ?? baseRooms[0];
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [messageCategory, setMessageCategory] = useState<"issue" | "amenities" | "contact">("issue");
  const [messageText, setMessageText] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [transactionDetails, setTransactionDetails] = useState<{ status?: string | null; paymentIntentId?: string | null; updatedAt?: string | null; amount?: number | null }>({});

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

  async function handleSendMessage() {
    if (!messageText.trim()) return;
    try {
      setIsSending(true);
      const res = await fetch("/api/guest/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomKey: activeRoom?.key ?? null,
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

  // Read booking draft details from localStorage (written on property page before auth)
  useEffect(() => {
    const KEY = "booking:draft";
    const read = () => {
      try {
        if (typeof window === "undefined") return;
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return;
        const data = JSON.parse(raw) as {
          subtotal?: number;
          total?: number;
          checkIn?: string;
          checkOut?: string;
          guests?: number;
          propertyId?: string;
          propertyTitle?: string;
          propertyAddress?: string;
          mapUrl?: string;
          currency?: string;
        };

        setPriceSummary((prev) => ({
          ...prev,
          subtotal: typeof data?.subtotal === "number" ? data.subtotal : prev.subtotal,
          total: typeof data?.total === "number" ? data.total : prev.total,
        }));

        setDraftDetails((prev) => ({
          ...prev,
          propertyId: data?.propertyId ?? prev.propertyId,
          propertyTitle: data?.propertyTitle ?? prev.propertyTitle,
          checkIn: data?.checkIn ?? prev.checkIn,
          checkOut: data?.checkOut ?? prev.checkOut,
          guests: typeof data?.guests === "number" ? data.guests : prev.guests,
          currency: data?.currency ?? prev.currency ?? "usd",
        }));

        if (data?.propertyAddress) setPropertyAddress((prev) => prev || data.propertyAddress!);
        if (data?.propertyTitle) setPropertyTitleDisplay((prev) => prev || data.propertyTitle!);
        if (data?.mapUrl) setMapUrl((prev) => prev || data.mapUrl!);
      } catch (err) {
        console.warn("[guest-portal] failed to read booking draft from storage", err);
      }
    };

    read();

    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY) read();
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

// Observe the sidebar visibility to hide mobile CTA when Reserve is fully visible
useEffect(() => {
  const target = leftStickyRef.current;
  if (!target) return;
  if (typeof window === "undefined") return;

  const io = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      setIsReserveInView(entry.intersectionRatio === 1);
    },
    { root: null, threshold: 1 }
  );
  io.observe(target);
  return () => io.disconnect();
}, [leftStickyRef]);

return (
  <AuthGate allowRoles={["guest", "admin"]} showInlineSignOut={false}>
    <div className="min-h-screen bg-white">
      {/* Page header with account menu */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 supports-[backdrop-filter]:backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo/BelleRougeLogo.png"
              alt="Belle Rouge Properties logo"
              width={200}
              height={48}
              className="h-10 w-auto"
              priority
              quality={100}
            />
            <div className="hidden sm:block">
              <span className="text-sm font-semibold text-gray-900">Guest Portal</span>
              <span className="inline text-xs text-gray-500">Manage your stay</span>
            </div>
          </div>
          <div className="relative">{user && <AccountMenu user={user} />}</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title + Hero with a 1/2 vs 1/2 split on large screens */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-8">
          {/* Left sidebar: visible on mobile, sticky on both mobile and desktop */}
          <aside
            ref={leftStickyRef}
            className="space-y-4 sticky top-2 z-20 lg:sticky lg:top-6 self-start lg:max-h-[calc(100vh-1rem)] lg:overflow-auto"
          >
            <div className="flex gap-6 overflow-x-auto scrollbar-hide border-b border-gray-200 pb-2" role="tablist" aria-orientation="horizontal" aria-label="Transaction actions">
              {sidebarTabs.map((t) => {
                const selected = activeSidebar === t.key;
                return (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={selected ? "true" : "false"}
                    className={`pb-1 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      selected ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setActiveSidebar(t.key)}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl p-4 mt-3">
              {activeSidebar === "reserve" && (
                <div aria-labelledby="Finish Reserve" className="space-y-3">
                  <h3 className="text-base font-semibold text-gray-900">Complete Your Reservation</h3>
                  <p className="text-sm text-gray-600">Review your dates, guests, and price, then confirm.</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li className="flex justify-between"><span>Check‑in</span><span>{draftDetails.checkIn || "—"}</span></li>
                    <li className="flex justify-between"><span>Check‑out</span><span>{draftDetails.checkOut || "—"}</span></li>
                    <li className="flex justify-between"><span>Guests</span><span>{draftDetails.guests ?? "—"}</span></li>
                    <li className="flex justify-between font-medium"><span>Total</span><span>{typeof priceSummary.total === "number" ? toCurrency(priceSummary.total) : "—"}</span></li>
                  </ul>
                  <button
                    onClick={() => setShowCheckout(true)}
                    disabled={!(typeof priceSummary.total === "number")}
                    className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Finish Reserve
                  </button>
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
                <div aria-labelledby="Transactions" className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Transactions</h3>
                    <p className="mt-1 text-xs text-gray-500">Latest activity for this booking.</p>
                  </div>
                  {transactionDetails.amount ? (
                    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Reservation payment</span>
                        <span className="text-sm font-semibold text-gray-900">{toCurrency(transactionDetails.amount)}</span>
                      </div>
                      <dl className="grid grid-cols-1 gap-2 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <dt>Status</dt>
                          <dd className={`font-semibold ${transactionDetails.status === "confirmed" ? "text-green-700" : transactionDetails.status === "pending" ? "text-amber-600" : transactionDetails.status === "cancelled" ? "text-red-600" : "text-gray-700"}`}>
                            {transactionDetails.status ? transactionDetails.status.charAt(0).toUpperCase() + transactionDetails.status.slice(1) : "Pending"}
                          </dd>
                        </div>
                        {transactionDetails.updatedAt && (
                          <div className="flex justify-between">
                            <dt>Last updated</dt>
                            <dd className="font-medium text-gray-700">{new Date(transactionDetails.updatedAt).toLocaleString()}</dd>
                          </div>
                        )}
                        {transactionDetails.paymentIntentId && (
                          <div className="flex justify-between">
                            <dt>Payment intent</dt>
                            <dd className="font-medium text-gray-700 truncate max-w-[8rem] sm:max-w-[12rem]" title={transactionDetails.paymentIntentId}>
                              {transactionDetails.paymentIntentId}
                            </dd>
                          </div>
                        )}
                      </dl>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Charges are handled securely by Stripe.</span>
                        <Link href="https://dashboard.stripe.com/test/payments" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-medium">
                          View receipt
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                      No payment has been recorded for this booking yet. Complete checkout to generate a receipt.
                    </div>
                  )}
                </div>
              )}

              {activeSidebar === "past" && (
                <div aria-labelledby="Past Stays" className="space-y-3">
                  <h3 className="text-base font-semibold text-gray-900">Past Stays</h3>
                  <p className="text-sm text-gray-600">Review your previous bookings and download receipts.</p>
                  <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                    No past stays recorded yet. Once you complete a stay, it will appear here with check-in details and invoices.
                  </div>
                </div>
              )}
            </div>
          </aside>

          <div>
            {/* Title and context */}
            <div className="mb-4">
              {propertyTitleDisplay && (
                <h2 className="text-xl font-semibold text-gray-900">{propertyTitleDisplay}</h2>
              )}
              <p className="text-gray-600 text-sm md:text-base mt-1">
                Explore spaces, leave feedback, and manage your stay.
              </p>
            </div>
            <div ref={heroBlockRef}>
              <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden">
                <Image
                  key={heroImage}
                  src={heroImage}
                  alt={propertyTitleDisplay ?? "Selected property"}
                  fill
                  priority
                  className="object-cover"
                />
                {mapHref && (
                  <a
                    href={mapHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={propertyAddress ? `Open address in Maps: ${propertyAddress}` : "Open map"}
                    className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 text-gray-900 px-3 py-1 shadow-sm ring-1 ring-black/5 hover:bg-white transition"
                  >
                    <MapPinIcon className="h-4 w-4 text-red-600" />
                    {propertyAddress ? (
                      <span className="text-xs font-medium truncate max-w-[12rem] hidden sm:inline" title={propertyAddress}>
                        {propertyAddress}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold hidden sm:inline">View map</span>
                    )}
                    <span className="text-xs font-semibold sm:hidden">Map</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Two-column layout below the hero */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left column: room details */}
          <div className="space-y-4">
            {/* Tabs header */}
            <div className="flex gap-6 overflow-x-auto scrollbar-hide border-b border-gray-200 pb-2">
              {leftTabs.map((t) => {
                const selected = activeLeft === t.key;
                return (
                  <button
                    key={t.key}
                    className={`pb-1 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      selected
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setActiveLeft(t.key)}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Display window */}
            <div className="bg-white rounded-2xl p-4">
              {activeLeft === "details" && activeRoom && (
                <div>
                  <div className="flex items-center gap-2">
                    {activeRoom.key === "living-room" && <span aria-hidden className="text-lg">🛋️</span>}
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">{activeRoom.label} Details</h2>
                  </div>
                  <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700 text-sm">
                    {(activeRoom.details ?? []).map((detail, index) => (
                      <li key={`${activeRoom.key}-detail-${index}`} className="flex items-start gap-2"><span className="mt-1">•</span><span>{detail}</span></li>
                    ))}
                  </ul>
                  {activeRoom.highlights && activeRoom.highlights.length > 0 && (
                    <div className="mt-5">
                      <div className="flex items-center gap-2">
                        {activeRoom.key === "living-room" && <span aria-hidden className="text-base">🛋️</span>}
                        <h3 className="text-lg font-semibold text-gray-900">Feature Highlights</h3>
                      </div>
                      <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700 text-sm">
                        {activeRoom.highlights.map((highlight, index) => (
                          <li key={`${activeRoom.key}-highlight-${index}`} className="flex items-start gap-2"><span className="mt-1">•</span><span>{highlight}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {activeRoom.safety && activeRoom.safety.length > 0 && (
                    <div className="mt-5">
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="text-base">🛡️</span>
                        <h3 className="text-lg font-semibold text-gray-900">Accessibility & Safety</h3>
                      </div>
                      <ul className="mt-2 space-y-1 text-gray-700 text-sm">
                        {activeRoom.safety.map((item, index) => (
                          <li key={`${activeRoom.key}-safety-${index}`} className="flex items-start gap-2"><span className="mt-1">•</span><span>{item}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeLeft === "current" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">Current Stay Snapshot</h2>
                    <p className="mt-2 text-sm text-gray-600">Key booking details at a glance.</p>
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Check-in</dt>
                      <dd className="mt-1 font-medium text-gray-900">{draftDetails.checkIn || "Pending"}</dd>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Check-out</dt>
                      <dd className="mt-1 font-medium text-gray-900">{draftDetails.checkOut || "Pending"}</dd>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Guests</dt>
                      <dd className="mt-1 font-medium text-gray-900">{draftDetails.guests ?? "—"}</dd>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Total</dt>
                      <dd className="mt-1 font-medium text-gray-900">{typeof priceSummary.total === "number" ? toCurrency(priceSummary.total) : "—"}</dd>
                    </div>
                  </dl>
                  <div className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-600">
                    Need to adjust your stay? Switch to the Extend Stay tab or send us a message in the Feedback panel.
                  </div>
                </div>
              )}

              {activeLeft === "amenities" && activeRoom && (
                <div>
                  {/* Amenities (top) */}
                  <div className="flex items-center gap-2">
                    {(activeRoom.key === "living-room" || activeRoom.key === "kitchen") && <span aria-hidden className="text-base">📺</span>}
                    {activeRoom.key === "living-room" && <span aria-hidden className="text-base">📶</span>}
                    <h3 className="text-lg font-semibold text-gray-900">Amenities</h3>
                  </div>
                  <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700 text-sm">
                    {(activeRoom.amenities ?? []).map((amenity, index) => (
                      <li key={`${activeRoom.key}-amenity-${index}`} className="flex items-start gap-2"><span className="mt-1">•</span><span>{amenity}</span></li>
                    ))}
                  </ul>

                  {/* Decor notes */}
                  {activeRoom.decorNotes && activeRoom.decorNotes.length > 0 && (
                    <div className="mt-5">
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="text-base">🎨</span>
                        <h3 className="text-lg font-semibold text-gray-900">Ambience Notes</h3>
                      </div>
                      <ul className="mt-2 space-y-1 text-gray-700 text-sm">
                        {activeRoom.decorNotes.map((note, index) => (
                          <li key={`${activeRoom.key}-decor-${index}`} className="flex items-start gap-2"><span className="mt-1">•</span><span>{note}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Utilities */}
                  {activeRoom.utilities && activeRoom.utilities.length > 0 && (
                    <div className="mt-5">
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="text-base">🔌</span>
                        <h3 className="text-lg font-semibold text-gray-900">Utilities & How-To</h3>
                      </div>
                      <ul className="mt-2 space-y-1 text-gray-700 text-sm">
                        {activeRoom.utilities.map((utility, index) => (
                          <li key={`${activeRoom.key}-utility-${index}`} className="flex items-start gap-2"><span className="mt-1">•</span><span>{utility}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Multimedia */}
                  {activeRoom.multimedia && activeRoom.multimedia.length > 0 && (
                    <div className="mt-5">
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="text-base">🎧</span>
                        <h3 className="text-lg font-semibold text-gray-900">Multimedia</h3>
                      </div>
                      <ul className="mt-2 space-y-1 text-gray-700 text-sm">
                        {activeRoom.multimedia.map((item, index) => (
                          <li key={`${activeRoom.key}-multi-${index}`} className="flex items-start gap-2"><span className="mt-1">•</span><span>{item}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeLeft === "decor" && activeRoom && (
                <div className="space-y-4 min-w-0">
                  <section>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Cleanliness & Prep</h3>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {(activeRoom.cleanliness ?? []).map((item, index) => (
                        <li key={`${activeRoom.key}-clean-${index}`} className="flex items-start gap-2"><span className="mt-1">•</span><span>{item}</span></li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Room Snapshot</h3>
                    <p className="text-sm text-gray-600">
                      Quiet, comfortable, and staged for extended stays.
                    </p>
                  </section>
                </div>
              )}
              {/* Rating: moved from middle column to bottom of left column */}
              <div className="bg-white rounded-2xl p-4 mt-4">
                <h3 className="text-lg font-semibold text-gray-900">Rate your experience</h3>
                <div className="mt-2 flex items-center gap-1" aria-label="Rate this room">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="cursor-pointer p-1" aria-label={`${n} star`}>
                      <input
                        type="radio"
                        name={`rating-${activeRoom?.key ?? "room"}`}
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
          </div>

          {/* Right column: feedback tools */}
          <div className="space-y-4">
            <div className="flex gap-6 overflow-x-auto scrollbar-hide border-b border-gray-200 pb-2" role="tablist" aria-orientation="horizontal" aria-label="Feedback categories">
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
                    aria-selected={selected ? "true" : "false"}
                    aria-controls={`message-panel-${activeRoom?.key ?? "room"}`}
                    className={`pb-1 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      selected ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setMessageCategory(t.key as 'issue' | 'amenities' | 'contact')}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl p-4" id={`message-panel-${activeRoom?.key ?? "room"}`}>
              <div className="-mt-1">
                <div
                  ref={areasRef}
                  className="flex gap-4 overflow-x-auto scrollbar-hide border-b border-gray-200 pb-2"
                  role="group"
                  aria-label="Select a section of the house"
                >
                  {messageAreas.map((area) => {
                    const selected = selectedArea === area;
                    return (
                      <button
                        key={area}
                        type="button"
                        aria-pressed={selected ? "true" : "false"}
                        className={`pb-1 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                          selected
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                        onClick={() => setSelectedArea(selected ? "" : area)}
                      >
                        {area}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label htmlFor={`message-${activeRoom?.key ?? "room"}`} className="sr-only">Your message</label>
              <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <textarea
                  id={`message-${activeRoom?.key ?? "room"}`}
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
          </div>
        </div>

        {/* Checkout dialog lives outside column grid */}
        <CheckoutDialog
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          amount={Math.max(0, Math.round(((priceSummary.total ?? 0) as number) * 100))}
          currency={draftDetails.currency || "usd"}
          propertyId={draftDetails.propertyId || ""}
          propertyTitle={draftDetails.propertyTitle || undefined}
          checkIn={draftDetails.checkIn || ""}
          checkOut={draftDetails.checkOut || ""}
          guests={draftDetails.guests ?? 1}
          metadata={{
            source: "guest-portal",
            property_ref: draftDetails.propertyId || "",
            property_title: draftDetails.propertyTitle || "",
            check_in: draftDetails.checkIn || "",
            check_out: draftDetails.checkOut || "",
            guests: String(draftDetails.guests ?? ""),
          }}
          onSuccess={(paymentIntentId) => {
            console.log("Guest Portal payment successful:", paymentIntentId);
            setShowCheckout(false);
            // TODO: navigate to a confirmation view or show a toast
          }}
        />

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
        </main>
        <Footer />
      </div>
    </AuthGate>
  );
}
