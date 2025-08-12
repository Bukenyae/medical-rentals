"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface PropertyFormProps {
  onPropertySelected?: (propertyId: string | null) => void;
}

interface PropertyRow {
  id: string;
  title: string;
  address: string;
  description: string | null;
  nightly_price: number | null;
  weekly_discount_pct: number | null;
  weekly_price: number | null;
  monthly_discount_pct: number | null;
  monthly_price: number | null;
  proximity_badge_1?: string | null;
  proximity_badge_2?: string | null;
  bedrooms: number;
  bathrooms: number;
  map_url: string | null;
  is_published: boolean;
  cover_image_url: string | null;
}

interface ApprovedImageRow {
  id: string;
  url: string;
  is_approved: boolean;
  sort_order: number;
}

export default function PropertyForm({ onPropertySelected }: PropertyFormProps) {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(false);
  const [myProps, setMyProps] = useState<PropertyRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [nightlyPrice, setNightlyPrice] = useState<number>(150); // preview-only until schema column exists
  const [bedrooms, setBedrooms] = useState<number>(3);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [sqft, setSqft] = useState<number | "">(1100);
  const [weeklyDiscountPct, setWeeklyDiscountPct] = useState<number>(20);
  const [weeklyPrice, setWeeklyPrice] = useState<number>(40);
  const [monthlyDiscountPct, setMonthlyDiscountPct] = useState<number>(40);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(30);
  const [proximityBadge1, setProximityBadge1] = useState<string>("");
  const [proximityBadge2, setProximityBadge2] = useState<string>("");

  // wizard state
  const [step, setStep] = useState<1 | 2>(1);

  // Step 2 preview-only fields
  const [hostName, setHostName] = useState<string>("");
  const [hostAvatarUrl, setHostAvatarUrl] = useState<string>("");
  const [aboutSpace, setAboutSpace] = useState<string>("");
  const [professionalsDesc, setProfessionalsDesc] = useState<string>("");
  const [amenitiesCsv, setAmenitiesCsv] = useState<string>("");
  const AMENITY_OPTIONS = useMemo(
    () => [
      "Free WiFi",
      "Free parking",
      "55\" HDTV",
      "Full kitchen",
      "Fully furnished house",
      "In-unit washer and dryer",
      "Flexible lease terms (days/weeks/months)",
      "Self check-in",
    ],
    []
  );
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(new Set());
  const [cleaningFeePct, setCleaningFeePct] = useState<number>(0);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set()); // ISO date strings

  // Host profile (derived)
  const [hostNameDerived, setHostNameDerived] = useState<string>("");
  const [hostAvatarDerived, setHostAvatarDerived] = useState<string>("");
  const [hostJoinedYear, setHostJoinedYear] = useState<string>("");

  // approved images for preview/cover selection
  const [approvedImages, setApprovedImages] = useState<ApprovedImageRow[]>([]);
  const displayImageUrl = useMemo(() => {
    const current = myProps.find((p) => p.id === selectedId);
    return (
      current?.cover_image_url ||
      approvedImages[0]?.url ||
      "/images/placeholder/house.jpg"
    );
  }, [approvedImages, myProps, selectedId]);

  useEffect(() => {
    void refresh();
  }, []);

  // derive host info from profile
  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, created_at")
        .eq("id", uid)
        .single();
      if (data) {
        setHostNameDerived((data.full_name as string) || "");
        setHostAvatarDerived((data.avatar_url as string) || "");
        if (data.created_at) setHostJoinedYear(String(new Date(data.created_at).getFullYear()));
      }
    })();
  }, [supabase]);

  useEffect(() => {
    if (selectedId) onPropertySelected?.(selectedId);
  }, [selectedId, onPropertySelected]);

  // Fetch approved images when a property is selected to power previews/cover selection
  useEffect(() => {
    async function fetchImages(pid: string) {
      const { data, error } = await supabase
        .from("property_images")
        .select("id,url,is_approved,sort_order")
        .eq("property_id", pid)
        .eq("is_approved", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error && data) setApprovedImages(data as unknown as ApprovedImageRow[]);
      else setApprovedImages([]);
    }
    if (selectedId) void fetchImages(selectedId);
    else setApprovedImages([]);
  }, [selectedId, supabase]);

  // Load existing unavailable dates for the selected property
  useEffect(() => {
    (async () => {
      if (!selectedId) {
        setBlockedDates(new Set());
        return;
      }
      const { data, error } = await supabase
        .from('property_unavailable_dates')
        .select('date')
        .eq('property_id', selectedId);
      if (!error && data) {
        const set = new Set<string>(
          data.map((r: { date: string }) => new Date(r.date).toISOString().slice(0, 10))
        );
        setBlockedDates(set);
      }
    })();
  }, [selectedId, supabase]);

  // Toggle handler with optimistic updates and Supabase persistence
  const onToggleBlocked = async (iso: string, nextActive: boolean) => {
    const previous = new Set(blockedDates);
    const optimistic = new Set(blockedDates);
    if (nextActive) optimistic.add(iso); else optimistic.delete(iso);
    setBlockedDates(optimistic);
    if (!selectedId) return;
    if (nextActive) {
      const { error } = await supabase
        .from('property_unavailable_dates')
        .insert([{ property_id: selectedId, date: iso }]);
      if (error) {
        setBlockedDates(previous);
        alert(error.message || 'Failed to block date');
      }
    } else {
      const { error } = await supabase
        .from('property_unavailable_dates')
        .delete()
        .eq('property_id', selectedId)
        .eq('date', iso);
      if (error) {
        setBlockedDates(previous);
        alert(error.message || 'Failed to unblock date');
      }
    }
  };

  async function refresh() {
    setLoading(true);
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("properties")
      .select("id,title,address,description,proximity_badge_1,proximity_badge_2,bedrooms,bathrooms,is_published,cover_image_url")
      .order("created_at", { ascending: false });
    if (!error && data) setMyProps(data as PropertyRow[]);
    setLoading(false);
  }

  async function handleSave() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      if (!title || !address) {
        alert("Title and address are required.");
        setLoading(false);
        return;
      }

      // Primary payload with only known-safe columns (avoid schema-missing errors)
      const primary: Record<string, unknown> = {
        title,
        address,
        description,
        base_price: Number.isFinite(nightlyPrice) ? nightlyPrice : 150,
        proximity_badge_1: proximityBadge1 || null,
        proximity_badge_2: proximityBadge2 || null,
        bedrooms,
        bathrooms,
        cover_image_url: displayImageUrl || null,
      };

      const trySave = async (body: Record<string, unknown>) => {
        if (selectedId) {
          const { error } = await supabase
            .from('properties')
            .update(body)
            .eq('id', selectedId);
          if (error) throw error;
        } else {
          // ensure owner_id is set for new records
          const insertBody = { ...body, owner_id: user.id } as Record<string, unknown>;
          const { data, error } = await supabase
            .from('properties')
            .insert([insertBody])
            .select('id')
            .single();
          if (error) throw error;
          setSelectedId(data.id);
        }
      };

      try {
        await trySave(primary);
      } catch (e: any) {
        const msg: string = e?.message || '';
        // If discount columns are missing in the DB, retry with a minimal payload
        if (
          typeof e?.message === 'string' &&
          (e.message as string).toLowerCase().includes('schema cache') &&
          (e.message as string).toLowerCase().includes('could not find') &&
          (e.message as string).toLowerCase().includes('column')
        ) {
          // Fallback with minimal columns
          const fallback: Record<string, unknown> = {
            title,
            address,
            description,
            base_price: Number.isFinite(nightlyPrice) ? nightlyPrice : 150,
            proximity_badge_1: proximityBadge1 || null,
            proximity_badge_2: proximityBadge2 || null,
            bedrooms,
            bathrooms,
          };
          await trySave(fallback);
        } else {
          throw e;
        }
      }

      await refresh();
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert((err as any)?.message || 'Failed to save');
      setLoading(false);
    }
  }

  function loadIntoForm(p?: PropertyRow) {
    if (!p) {
      setSelectedId(null);
      setTitle("");
      setDescription("");
      setAddress("");
      setBedrooms(3);
      setBathrooms(2);
      setSqft(1100);
      return;
    }
    setSelectedId(p.id);
    setTitle(p.title);
    setDescription(p.description ?? "");
    setAddress(p.address);
    setNightlyPrice(p.nightly_price ?? 150);
    setWeeklyDiscountPct(p.weekly_discount_pct ?? 20);
    setWeeklyPrice(p.weekly_price ?? Math.round((p.nightly_price ?? 150) * 0.8));
    setMonthlyDiscountPct(p.monthly_discount_pct ?? 40);
    setMonthlyPrice(p.monthly_price ?? Math.round((p.nightly_price ?? 150) * 0.6));
    setProximityBadge1(p.proximity_badge_1 ?? "");
    setProximityBadge2(p.proximity_badge_2 ?? "");
    setBedrooms(p.bedrooms);
    setBathrooms(p.bathrooms);
    setSqft(1100);
    setStep(1);
  }

  async function applyCoverImage(url: string) {
    if (!selectedId) return;
    const { error } = await supabase
      .from("properties")
      .update({ cover_image_url: url })
      .eq("id", selectedId);
    if (error) alert(error.message);
    await refresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Create or Edit Property</h3>
        <button
          className="text-xs px-2 py-1 rounded border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition"
          onClick={() => loadIntoForm(undefined)}
        >New</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: wizard content */}
        <div className="space-y-3">
          {/* Step header */}
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-1 rounded ${step === 1 ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-600'}`}>Step 1</span>
            <span className={`px-2 py-1 rounded ${step === 2 ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-600'}`}>Step 2</span>
          </div>

          {step === 1 ? (
            <>
              <label className="text-sm">Title
                <input className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" value={title} onChange={e => setTitle(e.target.value)} />
              </label>
              <label className="text-sm">Description
                <textarea className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
              </label>
              <label className="text-sm">Address
                <input className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" value={address} onChange={e => setAddress(e.target.value)} />
              </label>
              <label className="text-sm">Nightly Price ($)
                <input type="number" className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" value={nightlyPrice} onChange={e => setNightlyPrice(Number(e.target.value))} />
              </label>
              <label className="text-sm">Bedrooms
                <input type="number" className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" value={bedrooms} onChange={e => setBedrooms(Number(e.target.value))} />
              </label>
              <label className="text-sm">Bathrooms
                <input type="number" className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" value={bathrooms} onChange={e => setBathrooms(Number(e.target.value))} />
              </label>
              <label className="text-sm">Square Feet
                <input type="number" className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" value={sqft as number} onChange={e => setSqft(e.target.value === "" ? "" : Number(e.target.value))} />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm">Weekly discount (%)
                  <input type="number" className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" value={weeklyDiscountPct} onChange={e => setWeeklyDiscountPct(Number(e.target.value))} />
                </label>
                <label className="text-sm">Weekly price ($/night)
                  <input type="number" className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" value={weeklyPrice} onChange={e => setWeeklyPrice(Number(e.target.value))} />
                </label>
                <label className="text-sm">Monthly discount (%)
                  <input type="number" className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" value={monthlyDiscountPct} onChange={e => setMonthlyDiscountPct(Number(e.target.value))} />
                </label>
                <label className="text-sm">Monthly price ($/night)
                  <input type="number" className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" value={monthlyPrice} onChange={e => setMonthlyPrice(Number(e.target.value))} />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm">Proximity badge 1
                  <input className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" placeholder="e.g., 5 min to General Hospital" maxLength={60} value={proximityBadge1} onChange={e => setProximityBadge1(e.target.value)} />
                </label>
                <label className="text-sm">Proximity badge 2
                  <input className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" placeholder="e.g., 10 min to LSU" maxLength={60} value={proximityBadge2} onChange={e => setProximityBadge2(e.target.value)} />
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button type="button" onClick={() => setStep(2)} className="px-4 py-2 rounded-md bg-blue-600 text-white">Next</button>
                {selectedId && (
                  <button type="button" onClick={handleSave} disabled={loading} className="px-4 py-2 rounded-md border">Save</button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Host derived */}
              <div className="flex items-center gap-3 p-2 border border-gray-200/50 rounded-md bg-gray-50">
                <img src={hostAvatarDerived || "/images/placeholder/avatar.png"} alt="host avatar" className="w-10 h-10 rounded-full object-cover" />
                <div className="text-sm">
                  <div className="font-medium">{hostNameDerived || hostName || "Host"}</div>
                  {hostJoinedYear && <div className="text-xs text-gray-600">Host since {hostJoinedYear}</div>}
                </div>
              </div>

              <label className="text-sm">About the space
                <textarea className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" rows={3} value={aboutSpace} onChange={e => setAboutSpace(e.target.value)} />
              </label>
              <label className="text-sm">The indoor & outdoor experiences
                <textarea className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" rows={3} value={professionalsDesc} onChange={e => setProfessionalsDesc(e.target.value)} />
              </label>

              {/* Amenity badges */}
              <div>
                <div className="text-sm font-medium mb-1">What this place offers</div>
                <div className="flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map((label) => {
                    const active = selectedAmenities.has(label);
                    return (
                      <button
                        type="button"
                        key={label}
                        onClick={() => {
                          const next = new Set(selectedAmenities);
                          if (next.has(label)) next.delete(label); else next.add(label);
                          setSelectedAmenities(next);
                        }}
                        className={`px-3 py-1 rounded-full text-xs border ${active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                        title={label}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cleaning fee */}
              <div className="mt-2">
                <label className="text-sm">Cleaning fee (% of subtotal)</label>
                <div className="mt-1 flex items-center gap-2">
                  <button type="button" className="px-2 py-1 border border-gray-300/50 rounded" onClick={() => setCleaningFeePct(Math.max(0, cleaningFeePct - 1))}>-</button>
                  <input
                    type="number"
                    className="w-24 border border-gray-300/50 rounded-md px-3 py-2"
                    value={cleaningFeePct}
                    onChange={e => setCleaningFeePct(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    title="Cleaning fee percentage"
                    aria-label="Cleaning fee percentage"
                  />
                  <button type="button" className="px-2 py-1 border border-gray-300/50 rounded" onClick={() => setCleaningFeePct(cleaningFeePct + 1)}>+</button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button type="button" onClick={() => setStep(1)} className="px-4 py-2 rounded-md border">Back</button>
                <button onClick={handleSave} disabled={loading} className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60">{selectedId ? 'Save Changes' : 'Create Property'}</button>
              </div>
            </>
          )}
        </div>

        {/* Right: previews & media depending on step */}
        <div className="space-y-4">
          
          

          {step === 1 && (
            <div className="space-y-2">
              <h4 className="font-medium">Homepage card preview</h4>
              <div className="border border-gray-200/50 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="aspect-video bg-gray-100">
                  <img src={displayImageUrl} alt="preview" className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900 truncate">{title || 'Untitled'}</div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1 truncate">{address || 'Address TBD'}</div>
                  {description && (<div className="text-xs text-gray-700 mt-1 line-clamp-2">{description}</div>)}
                  {(proximityBadge1 || proximityBadge2) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {proximityBadge1 && <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200">{proximityBadge1}</span>}
                      {proximityBadge2 && <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200">{proximityBadge2}</span>}
                    </div>
                  )}
                  <div className="text-sm text-gray-900 mt-1">${nightlyPrice}/night</div>
                  <div className="text-xs text-emerald-700 mt-1">{`7+ nights: ${weeklyDiscountPct}% off - $${weeklyPrice}/night`}</div>
                  <div className="text-xs text-emerald-700">{`Monthly: ${monthlyDiscountPct}% off - $${monthlyPrice}/night`}</div>
                  <div className="text-xs text-gray-500 mt-1">{bedrooms} bd • {bathrooms} ba • {sqft || 0} sqft</div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              {/* Hero Preview */}
              <div className="space-y-2">
                <h4 className="font-medium">Property details hero preview</h4>
                <div className="rounded-xl overflow-hidden border border-gray-200/50 bg-white">
                  <div className="aspect-[16/9] bg-gray-100">
                    <img src={displayImageUrl} alt="hero preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <div className="text-lg font-semibold text-gray-900">{title || 'Untitled Property'}</div>
                    <div className="text-sm text-gray-600">{address || 'Address to be added'}</div>
                  </div>
                </div>
              </div>

              {/* Availability calendar (block dates) */}
              <CalendarBlocker blockedDates={blockedDates} onToggle={onToggleBlocked} />
            </>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">My Properties</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {loading && <div className="text-sm text-gray-500">Loading...</div>}
          {!loading && myProps.length === 0 && (
            <div className="text-sm text-gray-500">No properties yet. Create your first above.</div>
          )}
          {myProps.map((p) => (
            <button
              key={p.id}
              onClick={() => loadIntoForm(p)}
              className={`text-left p-3 border rounded-md hover:bg-gray-50 ${selectedId === p.id ? "border-blue-500" : "border-gray-200"}`}
            >
              <div className="text-sm font-medium">{p.title}</div>
              <div className="text-xs text-gray-600">{p.address}</div>
              <div className="text-xs text-gray-500 mt-1">{p.bedrooms} bd • {p.bathrooms} ba</div>
              <div className={`text-[11px] mt-1 ${p.is_published ? 'text-green-600' : 'text-amber-600'}`}>{p.is_published ? 'Published' : 'Unpublished'}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Lightweight calendar blocker for Step 2
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
  let currentWeek: Array<number | null> = new Array(monthStartWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const fmt = (y: number, m: number, d: number) =>
    new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);

  const toggle = (d: number) => {
    const iso = fmt(year, month, d);
    const nextActive = !blockedDates.has(iso);
    void onToggle(iso, nextActive);
  };

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-2">
      <h4 className="font-medium">Availability calendar</h4>
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          className="px-2 py-1 border border-gray-300/50 rounded"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          aria-label="Previous month"
          title="Previous month"
        >
          ←
        </button>
        <div className="text-sm text-gray-700 min-w-[140px] text-center">{monthLabel}</div>
        <button
          type="button"
          className="px-2 py-1 border border-gray-300/50 rounded"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label="Next month"
          title="Next month"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[11px] text-gray-600">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
          <div key={d} className="px-1 py-1 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flatMap((w, wi) =>
          w.map((d, di) => {
            if (!d) return <div key={`${wi}-${di}`} className="h-8" />;
            const iso = fmt(year, month, d);
            const active = blockedDates.has(iso);
            return (
              <button
                key={`${wi}-${di}`}
                type="button"
                onClick={() => toggle(d)}
                className={`h-8 text-sm rounded border ${active ? 'bg-rose-50 text-rose-700 border-rose-200/60' : 'bg-white text-gray-800 border-gray-200/50'}`}
                aria-pressed={active ? 'true' : 'false'}
                aria-label={`Toggle ${iso}`}
                title={active ? `Unavailable: ${iso}` : `Available: ${iso}`}
              >
                {d}
              </button>
            );
          })
        )}
      </div>
      <div className="text-xs text-gray-600">Click dates to toggle unavailable. These dates will be used to disable booking on the guest calendar after we wire persistence.</div>
    </div>
  );
}
