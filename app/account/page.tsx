"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthGate from "@/components/portal/AuthGate";
import { useSearchParams } from "next/navigation";

export default function AccountPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const fromHost = (searchParams.get("from") || "") === "host";
  const backHref = fromHost ? "/portal/host" : "/portal/guest";
  const backLabel = fromHost ? "Back to Host Portal" : "Back to Guest Portal";
  const q = fromHost ? "?from=host" : "";
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const user = data.user;
      if (user) {
        setEmail(user.email ?? "");
        const meta = (user as any).user_metadata as Record<string, unknown> | undefined;
        const metaPhone = typeof meta?.phone === "string" ? (meta.phone as string) : "";
        setPhone(metaPhone);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      // Update email (may send confirmation email depending on Supabase settings)
      const { error: emailErr } = await supabase.auth.updateUser({ email });
      if (emailErr) throw emailErr;
      // Store phone in user_metadata for now
      const { error: metaErr } = await supabase.auth.updateUser({ data: { phone } });
      if (metaErr) throw metaErr;
      setMessage("Account updated successfully.");
    } catch (err: any) {
      setMessage(err?.message || "Failed to update account.");
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
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="mt-2 text-gray-600">Manage your account preferences and profile information.</p>

        <form onSubmit={onSave} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Updating your email may require confirmation via a link sent to the new address.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(555) 000-0000"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save changes"}
            </button>
            {message && <span className="text-sm text-gray-700">{message}</span>}
          </div>
        </form>

        <nav className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href={`/account/profile${q}`} className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
            <div className="text-sm font-medium text-gray-900">Profile</div>
            <div className="text-sm text-gray-600">View and edit your personal details</div>
          </Link>
          <Link href={`/account/security${q}`} className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
            <div className="text-sm font-medium text-gray-900">Password & Security</div>
            <div className="text-sm text-gray-600">Update your password and security settings</div>
          </Link>
          <Link href={`/account/deactivate${q}`} className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
            <div className="text-sm font-medium text-rose-700">Deactivate Account</div>
            <div className="text-sm text-rose-600">Temporarily deactivate or request deletion</div>
          </Link>
        </nav>
      </main>
    </AuthGate>
  );
}
