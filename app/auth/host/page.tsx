"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function HostAuthPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If already signed in, send to host portal
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        window.location.replace("/portal/host");
      }
    });
  }, [supabase]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          data: { role: "host" },
        },
      });
      if (error) throw error;
      setStatus("Check your email for the sign-in link.");
    } catch (err: any) {
      setStatus(err.message ?? "Failed to start sign-in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Host Sign In</h1>
        <p className="text-sm text-gray-600 mb-6">Enter your email to receive a magic link.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send magic link"}
          </button>
        </form>
        {status && <p className="text-sm text-gray-700 mt-4">{status}</p>}
        <div className="text-xs text-gray-500 mt-6">
          Not a host? <a className="underline" href="/auth/guest">Guest sign-in</a>
        </div>
      </div>
    </div>
  );
}
