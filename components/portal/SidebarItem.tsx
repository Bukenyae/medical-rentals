import React from "react";
import Icon from "./Icon";

interface SidebarItemProps {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export default function SidebarItem({ icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button
      className={`group flex items-center gap-3 w-full rounded-xl px-3 py-2 text-sm transition shadow-sm hover:shadow ${
        active ? "bg-white text-gray-900" : "text-gray-700 hover:bg-white/50"
      }`}
      type="button"
      onClick={onClick}
    >
      <Icon name={icon} className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );
}
