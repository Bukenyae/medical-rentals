import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  tone?: "default" | "success" | "muted";
}

export default function Badge({ children, tone = "default" }: BadgeProps) {
  const styles =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "muted"
      ? "bg-gray-100 text-gray-700"
      : "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${styles}`}>
      {children}
    </span>
  );
}
