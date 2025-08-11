"use client";

import { useMemo } from "react";

interface PaymentsListProps {
  query?: string;
}

interface PaymentRow {
  id: string;
  tenant: string;
  amount: number;
  status: "paid" | "due" | "overdue";
  date: string; // ISO or display
}

const MOCK_PAYMENTS: PaymentRow[] = [
  { id: "pmt_001", tenant: "Dr. Angelica Celestine", amount: 2200, status: "paid", date: "2025-08-01" },
  { id: "pmt_002", tenant: "Erica Rogers NP", amount: 2100, status: "due", date: "2025-08-10" },
  { id: "pmt_003", tenant: "Marley Aguillard", amount: 2150, status: "overdue", date: "2025-07-28" },
];

export default function PaymentsList({ query }: PaymentsListProps) {
  const q = (query ?? "").trim().toLowerCase();
  const rows = useMemo(() => {
    if (!q) return MOCK_PAYMENTS;
    return MOCK_PAYMENTS.filter((r) =>
      r.tenant.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  }, [q]);

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <div className="text-sm text-gray-500">No payments match "{query}".</div>
      )}
      {rows.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 bg-white">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-gray-900">{p.tenant}</div>
            <div className="text-xs text-gray-500">{p.date}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-900">${p.amount.toLocaleString()}</div>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              p.status === "paid" ? "bg-emerald-100 text-emerald-700" : p.status === "due" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
            }`}>{p.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
