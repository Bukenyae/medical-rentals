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

  async function refresh() {
    setLoading(true);
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("properties")
      .select("id,title,address,description,nightly_price,weekly_discount_pct,weekly_price,monthly_discount_pct,monthly_price,proximity_badge_1,proximity_badge_2,bedrooms,bathrooms,map_url,is_published,cover_image_url")
      .order("created_at", { ascending: false });
    if (!error && data) setMyProps(data as PropertyRow[]);
    setLoading(false);
  }

  async function handleSave() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    if (!title || !address) {
      alert("Title and address are required.");
      setLoading(false);
      return;
    }

    if (selectedId) {
      const { error } = await supabase
        .from("properties")
        .update({
          title,
          address,
          description,
          nightly_price: nightlyPrice,
          weekly_discount_pct: weeklyDiscountPct,
          weekly_price: weeklyPrice,
          monthly_discount_pct: monthlyDiscountPct,
          monthly_price: monthlyPrice,
          proximity_badge_1: proximityBadge1 || null,
          proximity_badge_2: proximityBadge2 || null,
          bedrooms,
          bathrooms,
        })
        .eq("id", selectedId);
      if (error) alert(error.message);
    } else {
      const { data: inserted, error } = await supabase
        .from("properties")
        .insert({
          title,
          address,
          description,
          nightly_price: nightlyPrice,
          weekly_discount_pct: weeklyDiscountPct,
          weekly_price: weeklyPrice,
          monthly_discount_pct: monthlyDiscountPct,
          monthly_price: monthlyPrice,
          proximity_badge_1: proximityBadge1 || null,
          proximity_badge_2: proximityBadge2 || null,
          bedrooms,
          bathrooms,
        })
        .select("id")
        .single();
      if (error) alert(error.message);
      if (inserted?.id) setSelectedId(inserted.id);
    }

    await refresh();
    setLoading(false);
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
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Create or Edit Property</h3>
        <button
          className="text-sm text-blue-600 hover:underline"
          onClick={() => loadIntoForm(undefined)}
        >New</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: wizard content */}
        <div className="space-y-3">
          {/* Step header */}
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-1 rounded ${step === 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Step 1</span>
            <span className={`px-2 py-1 rounded ${step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Step 2</span>
          </div>

          {step === 1 ? (
            <>
              <label className="text-sm">Title
                <input className="mt-1 w-full border rounded-md px-3 py-2" value={title} onChange={e => setTitle(e.target.value)} />
              </label>
              <label className="text-sm">Description
                <textarea className="mt-1 w-full border rounded-md px-3 py-2" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
              </label>
              <label className="text-sm">Address
                <input className="mt-1 w-full border rounded-md px-3 py-2" value={address} onChange={e => setAddress(e.target.value)} />
              </label>
              <label className="text-sm">Nightly Price ($)
                <input type="number" className="mt-1 w-full border rounded-md px-3 py-2" value={nightlyPrice} onChange={e => setNightlyPrice(Number(e.target.value))} />
              </label>
              <label className="text-sm">Bedrooms
                <input type="number" className="mt-1 w-full border rounded-md px-3 py-2" value={bedrooms} onChange={e => setBedrooms(Number(e.target.value))} />
              </label>
              <label className="text-sm">Bathrooms
                <input type="number" className="mt-1 w-full border rounded-md px-3 py-2" value={bathrooms} onChange={e => setBathrooms(Number(e.target.value))} />
              </label>
              <label className="text-sm">Square Feet
                <input type="number" className="mt-1 w-full border rounded-md px-3 py-2" value={sqft as number} onChange={e => setSqft(e.target.value === "" ? "" : Number(e.target.value))} />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm">Weekly discount (%)
                  <input type="number" className="mt-1 w-full border rounded-md px-3 py-2" value={weeklyDiscountPct} onChange={e => setWeeklyDiscountPct(Number(e.target.value))} />
                </label>
                <label className="text-sm">Weekly price ($/night)
                  <input type="number" className="mt-1 w-full border rounded-md px-3 py-2" value={weeklyPrice} onChange={e => setWeeklyPrice(Number(e.target.value))} />
                </label>
                <label className="text-sm">Monthly discount (%)
                  <input type="number" className="mt-1 w-full border rounded-md px-3 py-2" value={monthlyDiscountPct} onChange={e => setMonthlyDiscountPct(Number(e.target.value))} />
                </label>
                <label className="text-sm">Monthly price ($/night)
                  <input type="number" className="mt-1 w-full border rounded-md px-3 py-2" value={monthlyPrice} onChange={e => setMonthlyPrice(Number(e.target.value))} />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm">Proximity badge 1
                  <input className="mt-1 w-full border rounded-md px-3 py-2" placeholder="e.g., 5 min to General Hospital" maxLength={60} value={proximityBadge1} onChange={e => setProximityBadge1(e.target.value)} />
                </label>
                <label className="text-sm">Proximity badge 2
                  <input className="mt-1 w-full border rounded-md px-3 py-2" placeholder="e.g., 10 min to LSU" maxLength={60} value={proximityBadge2} onChange={e => setProximityBadge2(e.target.value)} />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm">Host name
                  <input className="mt-1 w-full border rounded-md px-3 py-2" value={hostName} onChange={e => setHostName(e.target.value)} />
                </label>
                <label className="text-sm">Host avatar URL
                  <input className="mt-1 w-full border rounded-md px-3 py-2" value={hostAvatarUrl} onChange={e => setHostAvatarUrl(e.target.value)} />
                </label>
              </div>
              <label className="text-sm">About the space
                <textarea className="mt-1 w-full border rounded-md px-3 py-2" rows={3} value={aboutSpace} onChange={e => setAboutSpace(e.target.value)} />
              </label>
              <label className="text-sm">Perfect for Traveling Professionals
                <textarea className="mt-1 w-full border rounded-md px-3 py-2" rows={3} value={professionalsDesc} onChange={e => setProfessionalsDesc(e.target.value)} />
              </label>
              <label className="text-sm">What this place offers (comma-separated)
                <input className="mt-1 w-full border rounded-md px-3 py-2" placeholder="Wi-Fi, Parking, Workspace" value={amenitiesCsv} onChange={e => setAmenitiesCsv(e.target.value)} />
              </label>

              <div className="flex items-center gap-2 pt-2">
                <button type="button" onClick={() => setStep(1)} className="px-4 py-2 rounded-md border">Back</button>
                <button onClick={handleSave} disabled={loading} className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60">{selectedId ? 'Save Changes' : 'Create Property'}</button>
              </div>
            </>
          )}
        </div>

        {/* Right: previews & media depending on step */}
        <div className="space-y-4">
          {step === 2 && (
            <div>
              <h4 className="font-medium mb-2">Cover image for card & hero</h4>
              {selectedId ? (
                approvedImages.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {approvedImages.map((img) => (
                        <button key={img.id} className={`border rounded-md overflow-hidden hover:ring-2 hover:ring-emerald-500 ${displayImageUrl === img.url ? 'ring-2 ring-emerald-600' : ''}`}
                          onClick={() => applyCoverImage(img.url)} type="button" title="Use as cover image">
                          <div className="aspect-video bg-gray-100">
                            <img src={img.url} alt="cover option" className="w-full h-full object-cover" />
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">Tip: Select one image to use as the property card image on the homepage and the hero image on the details page.</p>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No approved images yet. Upload images in Media Manager and approve one to enable selection.</div>
                )
              ) : (
                <div className="text-sm text-gray-500">Create and save the property first to select a cover image.</div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              <h4 className="font-medium">Homepage card preview</h4>
              <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
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
                <div className="rounded-xl overflow-hidden border bg-white">
                  <div className="aspect-[16/9] bg-gray-100">
                    <img src={displayImageUrl} alt="hero preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <div className="text-lg font-semibold text-gray-900">{title || 'Untitled Property'}</div>
                    <div className="text-sm text-gray-600">{address || 'Address to be added'}</div>
                  </div>
                </div>
              </div>

              {/* Booking widget preview */}
              <div className="space-y-2">
                <h4 className="font-medium">Booking widget preview</h4>
                <div className="border rounded-xl p-3 bg-white">
                  <div className="text-lg font-semibold text-gray-900">${nightlyPrice} <span className="text-sm text-gray-600">night</span></div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div className="border rounded-md p-2">
                      <div className="text-gray-500">Check-in</div>
                      <div className="text-gray-900">Select date</div>
                    </div>
                    <div className="border rounded-md p-2">
                      <div className="text-gray-500">Check-out</div>
                      <div className="text-gray-900">Select date</div>
                    </div>
                    <div className="col-span-2 border rounded-md p-2">
                      <div className="text-gray-500">Guests</div>
                      <div className="text-gray-900">1 guest</div>
                    </div>
                  </div>
                  <button className="w-full mt-3 bg-emerald-600 text-white py-2 rounded-md">Request to book</button>
                  <div className="text-[11px] text-gray-600 mt-2">Weekly: ${weeklyPrice}/night • Monthly: ${monthlyPrice}/night</div>
                </div>
              </div>
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
