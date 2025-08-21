import React, { useEffect, useMemo, useState } from "react";
import Card from "./Card";
import Badge from "./Badge";
import Icon from "./Icon";
import { createClient } from "@/lib/supabase/client";

interface PublishChecklistProps {
  selectedPropertyId: string | null;
  onPublish?: () => void;
}

export default function PublishChecklist({ selectedPropertyId, onPublish }: PublishChecklistProps) {
  const supabase = useMemo(() => createClient(), []);
  const [hasMapLink, setHasMapLink] = useState(false);
  const [hasApprovedImage, setHasApprovedImage] = useState(false);
  const [hasCoverImage, setHasCoverImage] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function fetchStatus(pid: string) {
      setLoading(true);
      const { data: prop } = await supabase
        .from("properties")
        .select("map_url,is_published,cover_image_url")
        .eq("id", pid)
        .maybeSingle();
      if (!ignore) {
        setHasMapLink(!!prop?.map_url);
        setHasCoverImage(!!prop?.cover_image_url);
        setIsPublished(!!prop?.is_published);
      }
      const { count } = await supabase
        .from("property_images")
        .select("id", { count: "exact", head: true })
        .eq("property_id", pid)
        .eq("is_approved", true);
      if (!ignore) setHasApprovedImage((count ?? 0) > 0);
      if (!ignore) setLoading(false);
    }
    if (selectedPropertyId) void fetchStatus(selectedPropertyId);
    else {
      setHasMapLink(false);
      setHasApprovedImage(false);
      setHasCoverImage(false);
      setIsPublished(false);
    }
    return () => {
      ignore = true;
    };
  }, [selectedPropertyId, supabase]);

  const prereqs = [
    { label: "Select or create a property", done: !!selectedPropertyId },
    { label: "Save a valid Google Maps link", done: hasMapLink },
    { label: "Approve at least one photo", done: hasApprovedImage },
    { label: "Set a cover image (used on homepage & hero)", done: hasCoverImage },
  ];
  const complete = prereqs.filter((i) => i.done).length;
  const readyToPublish = complete === 4 && !isPublished;

  return (
    <Card title="Publish status" right={<Badge tone={complete === 4 ? "success" : "muted"}>{complete}/4 complete</Badge>}>
      <ul className="space-y-3">
        {prereqs.map((it, i) => (
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
        disabled={!readyToPublish || loading}
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
