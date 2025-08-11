"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function HostAuthPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");

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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const role = data.user?.user_metadata?.role || 'host';
      window.location.replace(role === 'host' || role === 'admin' ? '/portal/host' : '/portal/guest');
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
        <p className="text-sm text-gray-600 mb-6">Choose a sign-in method below.</p>

        <button
          onClick={async () => {
            await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
            });
          }}
          className="w-full mb-4 bg-white border border-gray-300 text-gray-800 rounded-lg py-2.5 font-semibold hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303C33.602,32.91,29.197,36,24,36c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,13,24,13c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.138,0,9.83-1.97,13.409-5.182l-6.191-5.238C29.211,35.091,26.715,36,24,36 c-5.176,0-9.571-3.137-11.292-7.517l-6.536,5.036C8.5,39.556,15.698,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-1.573,4.91-6.147,8-11.303,8c-5.176,0-9.571-3.137-11.292-7.517 l-6.536,5.036C8.5,39.556,15.698,44,24,44c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs text-gray-500">or</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        {status && <p className="text-sm text-gray-700 mt-4">{status}</p>}
        <div className="text-xs text-gray-500 mt-6 space-y-2">
          <div>
            New here? <a className="underline" href="/auth/signup">Create an account</a>
          </div>
          <div>
            Not a host? <a className="underline" href="/auth/guest">Guest sign-in</a>
          </div>
        </div>
      </div>
    </div>
  );
}
