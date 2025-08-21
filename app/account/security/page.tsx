"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthGate from "@/components/portal/AuthGate";

export default function AccountSecurityPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const user = data.user as any;
      if (user) {
        setEmail(user.email ?? "");
        setTwoFactor(Boolean(user.user_metadata?.twoFactorEnabled));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const onSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (newPwd && newPwd !== confirmPwd) {
      setMessage("New passwords do not match.");
      return;
    }
    if (newPwd && newPwd.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      // If changing password, verify current password first
      if (newPwd) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: currentPwd });
        if (signInErr) throw new Error("Current password is incorrect.");
        const { error: updateErr } = await supabase.auth.updateUser({ password: newPwd });
        if (updateErr) throw updateErr;
      }
      // Store 2FA preference in metadata as a placeholder
      const { error: metaErr } = await supabase.auth.updateUser({ data: { twoFactorEnabled: twoFactor } });
      if (metaErr) throw metaErr;
      setMessage("Security settings updated.");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err: any) {
      setMessage(err?.message || "Failed to update security settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGate allowRoles={["guest", "admin"]} showInlineSignOut={false}>
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-4">
        <Link href="/portal/guest" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline" aria-label="Back to Guest Portal">
          <span>{"<--"}</span>
          <span>Back to Guest Portal</span>
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Password & Security</h1>
      <p className="mt-2 text-gray-600">Change your password and manage security preferences.</p>

      <form onSubmit={onSaveSecurity} className="mt-6 space-y-6">
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-gray-900">Change password</legend>
          <div>
            <label className="block text-sm font-medium text-gray-700">Current password</label>
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">New password</label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm new password</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Re-enter new password"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-gray-900">Two-factor authentication</legend>
          <label className="inline-flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={twoFactor}
              onChange={(e) => setTwoFactor(e.target.checked)}
            />
            Enable 2FA (placeholder; stores preference in profile)
          </label>
          <p className="text-xs text-gray-500">Note: Full 2FA setup requires additional Supabase configuration. This toggle saves your preference.</p>
        </fieldset>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save security settings"}
          </button>
          {message && <span className="text-sm text-gray-700">{message}</span>}
        </div>
      </form>

      <div className="mt-6">
        <Link href="/account" className="text-sm text-blue-600 hover:underline">Back to Account</Link>
      </div>
    </main>
    </AuthGate>
  );
}
