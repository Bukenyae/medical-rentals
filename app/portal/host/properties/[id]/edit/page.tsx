"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PropertyForm from "@/components/portal/PropertyForm";

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const propertyId = params?.id as string | undefined;

  const [isDirty, setIsDirty] = useState(false);

  // Warn on browser/tab close if there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const confirmAndBack = useCallback(() => {
    if (isDirty) {
      const ok = window.confirm("You have unsaved changes. Discard and go back?");
      if (!ok) return;
    }
    router.push("/portal/host");
  }, [isDirty, router]);

  if (!propertyId) {
    router.push("/portal/host");
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={confirmAndBack}
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            aria-label="Back to dashboard"
          >
            <span aria-hidden>←</span>
            Back to Dashboard
          </button>
          <h1 className="text-base sm:text-lg font-semibold text-gray-900">Edit Property</h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <PropertyForm
          initialPropertyId={propertyId}
          onDirtyChange={setIsDirty}
          onSaved={() => {
            const msg = encodeURIComponent("Property updated");
            router.push(`/portal/host?toast=${msg}`);
          }}
        />
      </main>
    </div>
  );
}
