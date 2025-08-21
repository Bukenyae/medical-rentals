"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PropertyForm from "@/components/portal/PropertyForm";

export default function NewPropertyPage() {
  const router = useRouter();
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
          <h1 className="text-base sm:text-lg font-semibold text-gray-900">New Property</h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <PropertyForm
          onDirtyChange={setIsDirty}
          onSaved={() => {
            const msg = encodeURIComponent("Property created");
            router.push(`/portal/host?toast=${msg}`);
          }}
        />
      </main>
    </div>
  );
}
