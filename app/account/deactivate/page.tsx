"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthGate from "@/components/portal/AuthGate";
import { useSearchParams } from "next/navigation";

export default function AccountDeactivatePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromHost = (searchParams.get("from") || "") === "host";
  const backHref = fromHost ? "/portal/host" : "/portal/guest";
  const backLabel = fromHost ? "Back to Host Portal" : "Back to Guest Portal";
  const q = fromHost ? "?from=host" : "";
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm) {
      setMessage("Please confirm you understand the consequences.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          deactivated: true,
          deactivatedAt: new Date().toISOString(),
          deactivatedReason: reason || null,
        },
      });
      if (error) throw error;
      await supabase.auth.signOut();
      try {
        localStorage.removeItem("mr_session");
      } catch {}
      router.replace("/");
    } catch (err: any) {
      setMessage(err?.message || "Failed to deactivate account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGate allowRoles={["guest", "admin"]} showInlineSignOut={false}>
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-4">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline" aria-label={backLabel}>
          <span>{"<--"}</span>
          <span>{backLabel}</span>
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Deactivate Account</h1>
      <p className="mt-2 text-gray-700">Temporarily deactivate your account. You can request reactivation later by contacting support.</p>

      <form onSubmit={onDeactivate} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tell us why you’re deactivating"
          />
        </div>
        <label className="inline-flex items-start gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-gray-300"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
          />
          <span>I understand my listings and reservations may be paused while my account is deactivated.</span>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!confirm || loading}
            className="inline-flex items-center rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {loading ? "Deactivating..." : "Deactivate account"}
          </button>
          {message && <span className="text-sm text-gray-700">{message}</span>}
        </div>
      </form>

      <div className="mt-6">
        <Link href={`/account${q}`} className="text-sm text-blue-600 hover:underline">Back to Account</Link>
      </div>
    </main>
    </AuthGate>
  );
}
