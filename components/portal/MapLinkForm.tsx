"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface MapLinkFormProps {
  propertyId: string | null;
}

interface PropertyRow {
  id: string;
  map_url: string | null;
  is_published: boolean;
  title: string;
}

function isValidMapUrl(url: string) {
  try {
    const u = new URL(url);
    return (
      u.hostname.includes("google.") &&
      (u.pathname.includes("/maps") || u.searchParams.has("q"))
    );
  } catch {
    return false;
  }
}

export default function MapLinkForm({ propertyId }: MapLinkFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [mapUrl, setMapUrl] = useState("");
  const [published, setPublished] = useState(false);
  const [title, setTitle] = useState("");

  const fetchProperty = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("properties")
      .select("id,map_url,is_published,title")
      .eq("id", propertyId)
      .maybeSingle();
    if (!error && data) {
      const p = data as PropertyRow;
      setMapUrl(p.map_url ?? "");
      setPublished(p.is_published);
      setTitle(p.title);
    }
    setLoading(false);
  }, [propertyId, supabase]);

  useEffect(() => {
    if (!propertyId) return;
    void fetchProperty();
  }, [propertyId, fetchProperty]);

  async function saveMapUrl() {
    if (!propertyId) return;
    if (!mapUrl || !isValidMapUrl(mapUrl)) {
      alert("Please enter a valid Google Maps URL.");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("properties")
      .update({ map_url: mapUrl })
      .eq("id", propertyId);
    if (error) alert(error.message);
    await fetchProperty();
    setLoading(false);
  }

  async function publish() {
    if (!propertyId) return;
    setLoading(true);
    const { error } = await supabase.rpc("publish_property", { p_property_id: propertyId });
    if (error) alert(error.message);
    await fetchProperty();
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <h3 className="text-lg font-semibold">Map Link & Publishing</h3>
      {!propertyId && (
        <p className="text-sm text-gray-500">Select or create a property first.</p>
      )}
      {propertyId && (
        <>
          <div className="text-sm text-gray-800">Property: <span className="font-medium">{title}</span></div>
          <label className="text-sm block">Google Maps URL
            <input
              className="mt-1 w-full border rounded-md px-3 py-2"
              placeholder="https://maps.google.com/..."
              value={mapUrl}
              onChange={e => setMapUrl(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-2">
            <a
              className="text-sm text-blue-600 hover:underline"
              href={mapUrl || undefined}
              target="_blank"
              rel="noreferrer"
            >Test Link</a>
            <button
              onClick={saveMapUrl}
              disabled={loading || !mapUrl}
              className="px-3 py-2 rounded-md bg-gray-900 text-white disabled:opacity-50"
            >Save Map Link</button>
            <button
              onClick={publish}
              disabled={loading}
              className="px-3 py-2 rounded-md bg-emerald-600 text-white disabled:opacity-50"
            >Publish</button>
            <span className={`text-xs ml-2 ${published ? 'text-green-700' : 'text-amber-700'}`}>{published ? 'Published' : 'Unpublished'}</span>
          </div>
        </>
      )}
    </div>
  );
}
