"use client";

import { useState } from "react";
import { CreditCard, CalendarClock, ListChecks, BarChart3, MessageSquare, History } from "lucide-react";

export interface TabItem {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface SidebarTabsProps {
  tabs: TabItem[];
  initial?: string;
  onChange?: (key: string) => void;
}

export default function SidebarTabs({ tabs, initial, onChange }: SidebarTabsProps) {
  const [active, setActive] = useState(initial ?? tabs[0]?.key);

  const handle = (key: string) => {
    setActive(key);
    onChange?.(key);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
      <aside className="bg-white rounded-2xl border border-gray-200 p-4 h-fit">
        <ul className="space-y-2">
          {tabs.map((t) => (
            <li key={t.key}>
              <button
                onClick={() => handle(t.key)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition border ${
                  active === t.key
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "hover:bg-gray-50 text-gray-700 border-transparent"
                }`}
              >
                {t.icon ? <t.icon className="w-5 h-5" /> : null}
                <span className="font-medium">{t.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div id="portal-tab-content" className="min-h-[320px]">
        {/* Consumers render their content keyed by active */}
      </div>
    </div>
  );
}
