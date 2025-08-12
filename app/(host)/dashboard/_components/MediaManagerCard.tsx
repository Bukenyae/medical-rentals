"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  fetchProperties,
  deletePropertyRow,
  type PropertyRow,
} from "@/lib/properties";
import useSupabaseRealtime from "@/hooks/useSupabaseRealtime";
import ConfirmDialog from "./ConfirmDialog";
import PropertyCard, { PropertyCardSkeleton } from "./PropertyCard";

export default function MediaManagerCard() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "unpublished">("all");
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearch(input), 300);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
      else setLoading(false);
    });
  }, [supabase]);

  const loadInitial = useCallback(async () => {
    if (!userId) return;
    const { data, count } = await fetchProperties(supabase, userId, {
      search,
      status: status === "all" ? undefined : status,
      limit: 2,
      offset: 0,
    });
    setProperties(data);
    setHasMore(data.length < count);
    setPage(1);
    setLoading(false);
  }, [userId, supabase, search, status]);

  const loadMore = useCallback(async () => {
    if (!userId) return;
    const offset = page * 2;
    const { data } = await fetchProperties(supabase, userId, {
      search,
      status: status === "all" ? undefined : status,
      limit: 2,
      offset,
    });
    setProperties((prev) => [...prev, ...data]);
    setPage(page + 1);
    if (data.length < 2) setHasMore(false);
  }, [userId, supabase, search, status, page]);

  useEffect(() => {
    if (userId) {
      setLoading(true);
      loadInitial();
    }
  }, [userId, search, status, refreshIndex, loadInitial]);

  const refresh = () => setRefreshIndex((n) => n + 1);

  const handleDelete = async (id: string) => {
    setConfirmId(null);
    const prev = properties;
    setProperties(prev.filter((p) => p.id !== id));
    try {
      await deletePropertyRow(supabase, id);
      alert("Property deleted");
    } catch (err: any) {
      setProperties(prev);
      alert(err.message || "Failed to delete property");
    }
  };

  const handlePublish = async (id: string) => {
    const prev = properties;
    setProperties(prev.map((p) => (p.id === id ? { ...p, status: "published" } : p)));
    try {
      await supabase.from("properties").update({ status: "published" }).eq("id", id);
      alert("Property published");
    } catch (err: any) {
      setProperties(prev);
      alert(err.message || "Failed to publish property");
    }
  };

  const matches = useCallback(
    (p: PropertyRow) => {
      if (status !== "all") {
        if (status === "published" && p.status !== "published") return false;
        if (status === "unpublished" && p.status === "published") return false;
      }
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    },
    [status, search]
  );

  useSupabaseRealtime<PropertyRow>(supabase, {
    table: "properties",
    filter: userId ? `owner_id=eq.${userId}` : undefined,
    onInsert: ({ new: record }) => {
      const p = record as PropertyRow;
      if (matches(p)) setProperties((prev) => [p, ...prev]);
    },
    onUpdate: ({ new: record }) => {
      const p = record as PropertyRow;
      setProperties((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    },
    onDelete: ({ old }) => {
      const p = old as PropertyRow;
      setProperties((prev) => prev.filter((x) => x.id !== p.id));
    },
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-gray-900">Property Assets</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none"
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
          </select>
          <button
            onClick={refresh}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <p className="text-sm text-gray-500">
          No properties yet. Use ‘Add new property’ above.
        </p>
      ) : (
        <div className="grid gap-4 grid-cols-2">
          {properties.map((p) => (
            <PropertyCard
              key={p.id}
              item={p}
              onEdit={(id) => router.push(`/host/properties/${id}/edit`)}
              onDelete={(id) => setConfirmId(id)}
              onPublish={handlePublish}
            />
          ))}
        </div>
      )}

      {hasMore && !loading && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm"
          >
            Load more
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete property?"
        description="This action cannot be undone."
        onCancel={() => setConfirmId(null)}
        onConfirm={() => confirmId && handleDelete(confirmId)}
      />
    </div>
  );
}

