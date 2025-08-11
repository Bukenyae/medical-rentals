"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

interface AuthGateProps {
  allowRoles: ("guest" | "host" | "admin")[];
  children: React.ReactNode;
}

interface SessionLike {
  email: string;
  role: "guest" | "host" | "admin";
}

export default function AuthGate({ allowRoles, children }: AuthGateProps) {
  const [session, setSession] = useState<SessionLike | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<SessionLike["role"]>("guest");

  const isProd = useMemo(() => process.env.NODE_ENV === 'production', []);

  useEffect(() => {
    const supabase = getSupabase();
    // Always try local session first for preview flow
    try {
      // Dev override via query params: ?as=host|admin&email=...
      if (!isProd && typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const asRole = params.get('as');
        const em = params.get('email');
        if ((asRole === 'host' || asRole === 'admin') && em) {
          const next: SessionLike = { email: em, role: asRole as SessionLike['role'] };
          localStorage.setItem('mr_session', JSON.stringify(next));
          console.log('[AuthGate] applied query override mr_session:', next);
          setSession(next);
        }
      }
      if (!isProd) {
        const raw = localStorage.getItem("mr_session");
        if (raw) {
          const parsed = JSON.parse(raw) as SessionLike;
          console.log("[AuthGate] loaded local mr_session:", parsed);
          setSession(parsed);
        }
      }
    } catch {}

    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        const supaUser = data.session?.user;
        if (supaUser?.email) {
          const metaRole = (supaUser.user_metadata?.role as SessionLike['role'] | undefined);
          const role: SessionLike["role"] = metaRole ?? (supaUser.email === "bkanuel@gmail.com" ? "admin" : "guest");
          console.log("[AuthGate] supabase.getSession user:", supaUser.email, role);
          setSession({ email: supaUser.email, role });
        }
        setLoading(false);
      });
      const { data: sub } = supabase.auth.onAuthStateChange((_evt, newSession) => {
        const email = newSession?.user?.email;
        if (email) {
          const metaRole = (newSession?.user?.user_metadata?.role as SessionLike['role'] | undefined);
          const role: SessionLike["role"] = metaRole ?? (email === "bkanuel@gmail.com" ? "admin" : "guest");
          console.log("[AuthGate] onAuthStateChange user:", email, role);
          setSession({ email, role });
        } else {
          // If no Supabase session, prefer existing local preview session if present
          if (!isProd) {
            try {
              const raw = localStorage.getItem("mr_session");
              if (raw) {
                const parsed = JSON.parse(raw) as SessionLike;
                console.log("[AuthGate] onAuthStateChange no user, restoring local:", parsed);
                setSession(parsed);
                return;
              }
            } catch {}
          }
          setSession(null);
        }
        setLoading(false);
      });
      return () => {
        sub.subscription.unsubscribe();
      };
    }
  }, []);

  useEffect(() => {
    if (session && !allowRoles.includes(session.role)) return;
  }, [session, allowRoles]);

  const signIn = () => {
    const resolvedRole: SessionLike["role"] = email === "bkanuel@gmail.com" ? "admin" : role;
    const next: SessionLike = { email, role: resolvedRole };
    try {
      localStorage.setItem("mr_session", JSON.stringify(next));
      console.log("[AuthGate] signIn stored mr_session:", next);
    } catch (e) {
      console.log("[AuthGate] signIn localStorage error:", e);
    }
    setSession(next);
  };

  const signOut = () => {
    try {
      localStorage.removeItem("mr_session");
    } catch {}
    console.log("[AuthGate] signOut cleared session");
    setSession(null);
    setEmail("");
    setRole("guest");
  };

  if (!session || !allowRoles.includes(session.role)) {
    if (isProd) {
      // In production, avoid redirect loops. Wait for session, then show a simple prompt if unauthenticated.
      if (loading) {
        return (
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="text-sm text-gray-600">Checking your session…</div>
          </div>
        );
      }
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Please sign in</h2>
            <p className="text-sm text-gray-600 mb-6">Go back to the homepage and use the header menu to sign in.</p>
            <a href="/" className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2.5 font-semibold hover:bg-blue-700">Go to homepage</a>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to continue</h2>
          <p className="text-sm text-gray-600 mb-6">Use your email to preview the portal. Admin email has access to both views.</p>

          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full mb-4 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as SessionLike["role"])}
            aria-label="Select preview role"
            className="w-full mb-6 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="guest">Guest/Tenant</option>
            <option value="host">Host/Renter</option>
          </select>

          <button onClick={signIn} className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-semibold hover:bg-blue-700 active:bg-blue-800 transition">Continue</button>

          <p className="text-xs text-gray-500 mt-4">Admin email: <span className="font-mono">bkanuel@gmail.com</span></p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute right-4 -top-10 sm:top-0">
        <button onClick={signOut} className="text-xs text-gray-500 hover:text-gray-700 underline">Sign out</button>
      </div>
      {children}
    </div>
  );
}
