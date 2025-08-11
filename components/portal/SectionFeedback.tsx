"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export interface FeedbackItem {
  id: string;
  section: string; // e.g., "Kitchen", "Main Bathroom"
  message: string;
  sentiment?: "positive" | "negative" | "neutral";
  author?: string;
  createdAt?: string;
}

interface SectionFeedbackProps {
  sections: string[];
}

export default function SectionFeedback({ sections }: SectionFeedbackProps) {
  const [active, setActive] = useState(sections[0]);
  const [text, setText] = useState("");
  const [items, setItems] = useState<FeedbackItem[]>([]);

  const submit = () => {
    if (!text.trim()) return;
    const entry: FeedbackItem = {
      id: Math.random().toString(36).slice(2),
      section: active,
      message: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [entry, ...prev]);
    setText("");
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex flex-wrap gap-2 mb-3">
        {sections.map((s) => (
          <button
            key={s}
            onClick={() => setActive(s)}
            className={`px-3 py-1.5 rounded-full border text-sm ${
              active === s ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-700 border-gray-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Leave feedback for ${active}`}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={submit} className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold hover:bg-blue-700">
          <Send className="w-4 h-4" />
          Submit
        </button>
      </div>

      <ul className="mt-4 space-y-3">
        {items
          .filter((i) => i.section === active)
          .map((i) => (
            <li key={i.id} className="border rounded-lg p-3 text-sm text-gray-800">
              {i.message}
              <div className="text-xs text-gray-500 mt-1">{new Date(i.createdAt || "").toLocaleString()}</div>
            </li>
          ))}
      </ul>
    </div>
  );
}
