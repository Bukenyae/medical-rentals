"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface MediaManagerProps {
  propertyId: string | null;
  query?: string;
}

interface ImageRow {
  id: string;
  property_id: string;
  url: string;
  alt: string | null;
  sort_order: number;
  is_approved: boolean;
  created_at: string;
}

export default function MediaManager({ propertyId, query }: MediaManagerProps) {
  const supabase = useMemo(() => createClient(), []);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!propertyId) return;
    void refresh();
  }, [propertyId]);

  async function refresh() {
    if (!propertyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("property_images")
      .select("id,property_id,url,alt,sort_order,is_approved,created_at")
      .eq("property_id", propertyId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (!error && data) setImages(data as ImageRow[]);
    setLoading(false);
  }

  async function uploadFiles(files: FileList) {
    if (!propertyId) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    for (const file of Array.from(files)) {
      const path = `${user.id}/${propertyId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('property-images').upload(path, file, { upsert: false });
      if (upErr) { console.error(upErr); continue; }
      const { data: publicUrl } = supabase.storage.from('property-images').getPublicUrl(path);
      const { error: insertErr } = await supabase
        .from('property_images')
        .insert({ property_id: propertyId, url: publicUrl.publicUrl, alt: file.name, is_approved: false });
      if (insertErr) console.error(insertErr);
    }

    await refresh();
    setLoading(false);
  }

  async function toggleApprove(img: ImageRow) {
    const { error } = await supabase
      .from('property_images')
      .update({ is_approved: !img.is_approved })
      .eq('id', img.id);
    if (error) alert(error.message);
    await refresh();
  }

  async function setCover(img: ImageRow) {
    if (!propertyId) return;
    const { error } = await supabase.rpc('set_property_cover_image', { p_property_id: propertyId, p_image_id: img.id });
    if (error) alert(error.message);
    await refresh();
  }

  async function reorder(img: ImageRow, dir: -1 | 1) {
    // naive reorder: adjust sort_order locally and persist
    const current = images.findIndex((i) => i.id === img.id);
    const target = current + dir;
    if (target < 0 || target >= images.length) return;
    const a = images[current];
    const b = images[target];
    const { error: errA } = await supabase.from('property_images').update({ sort_order: b.sort_order }).eq('id', a.id);
    const { error: errB } = await supabase.from('property_images').update({ sort_order: a.sort_order }).eq('id', b.id);
    if (errA || errB) alert((errA || errB)!.message);
    await refresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Media Manager</h3>
        <div className="flex items-center gap-2">
          {/* Accessible label for hidden file input */}
          <label htmlFor="media-upload" className="sr-only">Upload property images</label>
          <input
            id="media-upload"
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            title="Upload property images"
            aria-label="Upload property images"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!propertyId || loading}
            className="px-3 py-2 rounded-md bg-gray-900 text-white disabled:opacity-50"
            aria-controls="media-upload"
          >Upload Images</button>
        </div>
      </div>
      {!propertyId && <p className="text-sm text-gray-500">Select or create a property first.</p>}
      {propertyId && (
        <>
          {loading && <div className="text-sm text-gray-500">Loading...</div>}
          {/** filter images by query (alt or filename substring) */}
          {(() => {
            const q = (query ?? "").trim().toLowerCase();
            const filtered = q
              ? images.filter((img) =>
                  (img.alt ?? "").toLowerCase().includes(q) || img.url.toLowerCase().includes(q)
                )
              : images;
            return (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map((img) => (
              <div key={img.id} className="border rounded-md overflow-hidden">
                <div className="aspect-video bg-gray-100">
                  <img src={img.url} alt={img.alt ?? ""} className="w-full h-full object-cover" />
                </div>
                <div className="p-2 space-y-1">
                  <div className="text-xs truncate" title={img.alt ?? ''}>{img.alt ?? 'Untitled'}</div>
                  <div className="flex items-center justify-between">
                    <button onClick={() => toggleApprove(img)} className={`text-xs px-2 py-1 rounded ${img.is_approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {img.is_approved ? 'Approved' : 'Unapproved'}
                    </button>
                    <button onClick={() => setCover(img)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Set cover</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <button onClick={() => reorder(img, -1)} className="text-xs text-gray-600 hover:text-gray-900">↑</button>
                    <span className="text-[10px] text-gray-500">#{img.sort_order}</span>
                    <button onClick={() => reorder(img, 1)} className="text-xs text-gray-600 hover:text-gray-900">↓</button>
                  </div>
                </div>
              </div>
                ))}
              </div>
            );
          })()}
          {!loading && images.length === 0 && (
            <div className="text-sm text-gray-500">No images yet. Upload above.</div>
          )}
        </>
      )}
    </div>
  );
}
