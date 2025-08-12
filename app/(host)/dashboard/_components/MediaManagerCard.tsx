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

function relativeTime(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const divisions: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.34524, "week"],
    [12, "month"],
    [Infinity, "year"],
  ];
  let unit: Intl.RelativeTimeFormatUnit = "second";
  let duration = diff;
  for (const [amount, nextUnit] of divisions) {
    if (Math.abs(duration) < amount) break;
    duration /= amount;
    unit = nextUnit;
  }
  return rtf.format(-Math.round(duration), unit);
}

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
      is_published: status === "all" ? undefined : status === "published",
      limit: 10,
      offset: 0,
    });
    setProperties(data);
    setHasMore(data.length < count);
    setPage(1);
    setLoading(false);
  }, [userId, supabase, search, status]);

  const loadMore = useCallback(async () => {
    if (!userId) return;
    const offset = page * 10;
    const { data } = await fetchProperties(supabase, userId, {
      search,
      is_published: status === "all" ? undefined : status === "published",
      limit: 10,
      offset,
    });
    setProperties((prev) => [...prev, ...data]);
    setPage(page + 1);
    if (data.length < 10) setHasMore(false);
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

  const matches = useCallback(
    (p: PropertyRow) => {
      if (status !== "all" && p.is_published !== (status === "published")) return false;
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
        <h3 className="text-base font-semibold text-gray-900">Media Manager</h3>
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
        <ul className="divide-y divide-gray-100">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="flex items-center gap-4 py-3 animate-pulse">
              <div className="h-16 w-16 rounded-md bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-gray-200" />
                <div className="h-3 w-1/4 rounded bg-gray-200" />
              </div>
            </li>
          ))}
        </ul>
      ) : properties.length === 0 ? (
        <p className="text-sm text-gray-500">
          No properties yet. Use ‘Add new property’ above.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {properties.map((p) => (
            <li key={p.id} className="flex items-center gap-4 py-3">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                {p.cover_image_url ? (
                  <img
                    src={p.cover_image_url}
                    alt={p.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                    No image
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                      p.is_published
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {p.is_published ? "published" : "unpublished"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Updated {relativeTime(p.updated_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push(`/host/properties/${p.id}/edit`)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmId(p.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
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

