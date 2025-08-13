import React from "react";
import Icon from "./Icon";

interface SidebarItemProps {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  active?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}

export default function SidebarItem({ icon, label, active, onClick, collapsed }: SidebarItemProps) {
  return (
    <button
      className={`group flex items-center w-full rounded-xl py-2 text-sm transition shadow-sm hover:shadow ${
        active ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-white/50"
      } ${collapsed ? "justify-center px-2" : "gap-3 px-3"}`}
      type="button"
      onClick={onClick}
    >
      <Icon name={icon} className="w-5 h-5" />
      {!collapsed && <span className="font-medium">{label}</span>}
    </button>
  );
}
