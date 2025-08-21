"use client";

import Image from "next/image";
import { Pencil, Trash2, Upload } from "lucide-react";
import { PropertyRow } from "@/lib/properties";

interface PropertyCardProps {
  item: PropertyRow;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
}

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

const statusClasses: Record<PropertyRow["status"], string> = {
  draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
  published: "bg-green-50 text-green-700 border-green-200",
  archived: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function PropertyCard({ item, onEdit, onDelete, onPublish }: PropertyCardProps) {
  return (
    <div
      tabIndex={0}
      className="rounded-2xl border bg-white shadow-sm p-4 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-black/10"
    >
      <div className="mb-4 h-36 w-full overflow-hidden rounded-xl bg-gray-100 flex items-center justify-center relative">
        {item.cover_image_url ? (
          <Image
            src={item.cover_image_url}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover"
            unoptimized
            priority={false}
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-gray-400"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        )}
      </div>
      <h4 className="mb-1 truncate text-sm font-bold" title={item.title}>
        {item.title}
      </h4>
      <p
        className="text-sm text-gray-600"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {item.description || "No description yet."}
      </p>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${statusClasses[item.status]}`}
        >
          {item.status}
        </span>
        <span className="text-gray-500">Updated {relativeTime(item.updated_at)}</span>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          aria-label="Edit property"
          onClick={() => onEdit(item.id)}
          className="inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-800 hover:bg-gray-50"
        >
          <Pencil className="mr-1 h-4 w-4" /> Edit
        </button>
        <button
          aria-label="Delete property"
          onClick={() => onDelete(item.id)}
          className="inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-sm font-medium border border-red-300 text-red-700 hover:bg-red-50"
        >
          <Trash2 className="mr-1 h-4 w-4" /> Delete
        </button>
        <button
          aria-label="Publish property"
          disabled={item.status === 'published'}
          onClick={() => onPublish(item.id)}
          className="inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-sm font-medium bg-black text-white hover:bg-gray-900 disabled:opacity-50"
        >
          <Upload className="mr-1 h-4 w-4" /> Publish
        </button>
      </div>
    </div>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-white shadow-sm p-4">
      <div className="mb-4 h-36 w-full rounded-xl bg-gray-100 animate-pulse" />
      <div className="mb-2 h-4 w-3/4 rounded bg-gray-100 animate-pulse" />
      <div className="mb-1 h-3 w-full rounded bg-gray-100 animate-pulse" />
      <div className="mb-4 h-3 w-2/3 rounded bg-gray-100 animate-pulse" />
      <div className="h-4 w-1/3 rounded bg-gray-100 animate-pulse" />
    </div>
  );
}
