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
  nightly_price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number | null;
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
  const [address, setAddress] = useState("");
  const [nightlyPrice, setNightlyPrice] = useState<number>(150);
  const [bedrooms, setBedrooms] = useState<number>(3);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [sqft, setSqft] = useState<number | "">(1100);

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
      .select("id,title,address,nightly_price,bedrooms,bathrooms,sqft,map_url,is_published,cover_image_url")
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
          nightly_price: nightlyPrice,
          bedrooms,
          bathrooms,
          sqft: sqft === "" ? null : Number(sqft),
        })
        .eq("id", selectedId);
      if (error) alert(error.message);
    } else {
      const { error } = await supabase
        .from("properties")
        .insert({
          title,
          address,
          nightly_price: nightlyPrice,
          bedrooms,
          bathrooms,
          sqft: sqft === "" ? null : Number(sqft),
          created_by: user.id,
        });
      if (error) alert(error.message);
    }

    await refresh();
    setLoading(false);
  }

  function loadIntoForm(p?: PropertyRow) {
    if (!p) {
      setSelectedId(null);
      setTitle("");
      setAddress("");
      setNightlyPrice(150);
      setBedrooms(3);
      setBathrooms(2);
      setSqft(1100);
      return;
    }
    setSelectedId(p.id);
    setTitle(p.title ?? "");
    setAddress(p.address ?? "");
    setNightlyPrice(p.nightly_price ?? 0);
    setBedrooms(p.bedrooms ?? 0);
    setBathrooms(p.bathrooms ?? 0);
    setSqft(p.sqft ?? "");
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
        {/* Left: form fields */}
        <div className="space-y-3">
        <label className="text-sm">Title
          <input className="mt-1 w-full border rounded-md px-3 py-2" value={title} onChange={e => setTitle(e.target.value)} />
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
        </div>

        {/* Right: live previews & cover selection */}
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Cover image for card & hero</h4>
            {selectedId ? (
              approvedImages.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {approvedImages.map((img) => (
                      <button key={img.id} className={`border rounded-md overflow-hidden hover:ring-2 hover:ring-emerald-500 ${displayImageUrl === img.url ? 'ring-2 ring-emerald-600' : ''}`}
                        onClick={() => applyCoverImage(img.url)}
                        type="button"
                        title="Use as cover image"
                      >
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

          {/* Card Preview */}
          <div className="space-y-2">
            <h4 className="font-medium">Homepage card preview</h4>
            <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="aspect-video bg-gray-100">
                <img src={displayImageUrl} alt="preview" className="w-full h-full object-cover" />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900 truncate">{title || "Untitled"}</div>
                  <div className="text-sm text-gray-700">${nightlyPrice}/night</div>
                </div>
                <div className="text-xs text-gray-600 mt-1 truncate">{address || "Address TBD"}</div>
                <div className="text-xs text-gray-500 mt-1">{bedrooms} bd • {bathrooms} ba • {sqft || 0} sqft</div>
              </div>
            </div>
          </div>

          {/* Hero Preview */}
          <div className="space-y-2">
            <h4 className="font-medium">Property details hero preview</h4>
            <div className="rounded-xl overflow-hidden border bg-white">
              <div className="aspect-[16/9] bg-gray-100">
                <img src={displayImageUrl} alt="hero preview" className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <div className="text-lg font-semibold text-gray-900">{title || "Untitled Property"}</div>
                <div className="text-sm text-gray-600">{address || "Address to be added"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60"
        >{selectedId ? "Save Changes" : "Create Property"}</button>
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
              <div className="text-xs text-gray-500 mt-1">{p.bedrooms} bd • {p.bathrooms} ba • ${p.nightly_price}/night</div>
              <div className={`text-[11px] mt-1 ${p.is_published ? 'text-green-600' : 'text-amber-600'}`}>{p.is_published ? 'Published' : 'Unpublished'}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
