import React from "react";
import Card from "./Card";
import Badge from "./Badge";
import Icon from "./Icon";

interface PublishChecklistProps {
  selectedPropertyId: string | null;
  hasMapLink: boolean;
  hasApprovedImage: boolean;
  isPublished: boolean;
  onPublish?: () => void;
}

export default function PublishChecklist({
  selectedPropertyId,
  hasMapLink,
  hasApprovedImage,
  isPublished,
  onPublish,
}: PublishChecklistProps) {
  const items = [
    { label: "Select or create a property", done: !!selectedPropertyId },
    { label: "Save a valid Google Maps link", done: hasMapLink },
    { label: "Approve at least one photo", done: hasApprovedImage },
    { label: "Then publish from the Location card", done: isPublished },
  ];
  const complete = items.filter((i) => i.done).length;
  const readyToPublish = complete >= 3 && !isPublished; // prerequisites complete

  return (
    <Card title="Publish status" right={<Badge tone={complete === 4 ? "success" : "muted"}>{complete}/4 complete</Badge>}>
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              className={`mt-0.5 inline-flex w-5 h-5 items-center justify-center rounded-full border ${
                it.done ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-gray-300 text-gray-400"
              }`}
            >
              <Icon name="check" className="w-3.5 h-3.5" />
            </span>
            <span className="text-sm text-gray-700">{it.label}</span>
          </li>
        ))}
      </ul>
      <button
        disabled={!readyToPublish}
        className={`mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition ${
          readyToPublish ? "bg-gray-900 text-white hover:bg-black" : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
        onClick={onPublish}
        type="button"
      >
        {isPublished ? "Published" : "Publish Property"}
      </button>
      <p className="mt-3 text-xs text-gray-500">Green dots indicate completed items. Complete all items to publish.</p>
    </Card>
  );
}
