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

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    onPropertySelected?.(selectedId);
  }, [selectedId, onPropertySelected]);

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

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Create or Edit Property</h3>
        <button
          className="text-sm text-blue-600 hover:underline"
          onClick={() => loadIntoForm(undefined)}
        >New</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
