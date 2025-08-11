"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const supabase = createClient();
  const [message, setMessage] = useState("Finishing sign-in...");

  useEffect(() => {
    const run = async () => {
      try {
        // First, exchange code present in URL for a session
        const url = typeof window !== 'undefined' ? window.location.href : '';
        if (url.includes("code=")) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(url);
          if (exchangeError) {
            throw exchangeError;
          }
        }
        // Now we should have a session
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No active session");
        const role = (user.user_metadata?.role as string) || "guest";
        setMessage(`Signed in as ${user?.email ?? "user"}. Redirecting...`);
        if (role === "host" || role === "admin") {
          window.location.replace("/portal/host");
        } else {
          window.location.replace("/portal/guest");
        }
      } catch (e: any) {
        console.error('[Auth Callback] error:', e);
        // Send to a dedicated error page
        window.location.replace('/auth/auth-code-error');
      }
    };
    run();
  }, [supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-6 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Auth Callback</h1>
        <p className="text-sm text-gray-600 mt-2">{message}</p>
      </div>
    </div>
  );
}
