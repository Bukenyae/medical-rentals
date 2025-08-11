"use client";

import { useMemo } from "react";

interface TenantsListProps {
  query?: string;
}

interface TenantRow {
  id: string;
  name: string;
  property: string;
  status: "active" | "past" | "pending";
}

const MOCK_TENANTS: TenantRow[] = [
  { id: "tnt_001", name: "Dr. Nia Jenkins", property: "Lexington Night House", status: "active" },
  { id: "tnt_002", name: "Samuel Carter", property: "Downtown Med Loft", status: "pending" },
  { id: "tnt_003", name: "Elena Diaz", property: "Lakeview Bungalow", status: "past" },
];

export default function TenantsList({ query }: TenantsListProps) {
  const q = (query ?? "").trim().toLowerCase();
  const rows = useMemo(() => {
    if (!q) return MOCK_TENANTS;
    return MOCK_TENANTS.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.property.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  }, [q]);

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <div className="text-sm text-gray-500">No tenants match "{query}".</div>
      )}
      {rows.map((t) => (
        <div key={t.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 bg-white">
          <div className="flex flex-col">
            <div className="text-sm font-medium text-gray-900">{t.name}</div>
            <div className="text-xs text-gray-500">{t.property}</div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            t.status === "active" ? "bg-emerald-100 text-emerald-700" : t.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
          }`}>{t.status}</span>
        </div>
      ))}
    </div>
  );
}
