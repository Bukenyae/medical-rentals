import React, { useState } from "react";

export default function BottomBar() {
  const [tab, setTab] = useState("Bedroom A");
  const tabs = ["Bedroom A", "Bathroom A", "Kitchen", "Living Room", "Laundry"] as const;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="text-2xl font-semibold">72%</div>
        <div className="text-sm text-gray-600">
          <div className="font-medium text-gray-900">Occupancy Rate</div>
          <div>3 months</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1.5 text-sm border transition ${
              tab === t ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
            type="button"
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm text-gray-700">
        <div>
          <div className="text-gray-500">Pending Payments</div>
          <div className="font-medium">3</div>
        </div>
        <div>
          <div className="text-gray-500">Stays</div>
          <div className="font-medium">12</div>
        </div>
        <div>
          <div className="text-gray-500">Upcoming Stays</div>
          <div className="font-medium">4</div>
        </div>
      </div>
    </div>
  );
}
