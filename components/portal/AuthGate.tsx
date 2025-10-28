"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "@/components/AuthModal";
import { useRouter } from "next/navigation";
import useAuthUser from "@/hooks/useAuthUser";

interface AuthGateProps {
  allowRoles: ("guest" | "host" | "admin")[];
  children: React.ReactNode;
  /**
   * When true (default), shows a small inline sign-out button positioned in the top-right.
   * Set to false on pages that provide their own header/account menu.
   */
  showInlineSignOut?: boolean;
}

interface SessionLike {
  email: string;
  role: "guest" | "host" | "admin";
}

export default function AuthGate({ allowRoles, children, showInlineSignOut = true }: AuthGateProps) {
  const [session, setSession] = useState<SessionLike | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<SessionLike["role"]>("guest");
  const [mounted, setMounted] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const router = useRouter();

  const isProd = useMemo(() => process.env.NODE_ENV === 'production', []);
  const supabase = useMemo(() => createClient(), []);
  const { user: supaUser, loading: authLoading } = useAuthUser();

  const normalizeRole = useCallback((value: string | null | undefined, email?: string | null): SessionLike['role'] => {
    const lowered = value?.toLowerCase();
    if (lowered === 'admin' || lowered === 'host' || lowered === 'guest') {
      return lowered;
    }
    if (email === 'bkanuel@gmail.com') {
      return 'admin';
    }
    return 'guest';
  }, []);

  useEffect(() => {
    setMounted(true);
    if (isProd) {
      return;
    }
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const asRole = params.get('as');
        const em = params.get('email');
        if ((asRole === 'host' || asRole === 'admin') && em) {
          const next: SessionLike = { email: em, role: asRole as SessionLike['role'] };
          localStorage.setItem('mr_session', JSON.stringify(next));
          console.log('[AuthGate] applied query override mr_session:', next);
          setSession(next);
        }
        const raw = localStorage.getItem('mr_session');
        if (raw) {
          const parsed = JSON.parse(raw) as SessionLike;
          console.log('[AuthGate] loaded local mr_session:', parsed);
          setSession(parsed);
        }
      }
    } catch {}
    setLoading(false);
  }, [isProd]);

  const resolveRole = useCallback(async (uid: string, email: string): Promise<SessionLike['role']> => {
    if (!supabase) {
      return normalizeRole(null, email);
    }
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', uid);
      const roleSet = new Set<string>((roles ?? []).map(r => String((r as any).role).toLowerCase()));
      if (roleSet.has('admin')) return 'admin';
      if (roleSet.has('host')) return 'host';
      if (roleSet.has('guest')) return 'guest';

      const { data: prof } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', uid)
        .maybeSingle();
      const profRole = normalizeRole(prof?.role as string | undefined, email);
      if (profRole) {
        return profRole;
      }
    } catch (error) {
      console.warn('[AuthGate] resolveRole fallback due to error', error);
    }
    return normalizeRole(null, email);
  }, [supabase, normalizeRole]);

  useEffect(() => {
    if (!isProd) {
      return;
    }
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!supaUser || !supaUser.email || !supaUser.id) {
      setSession(null);
      setLoading(false);
      return;
    }

    let active = true;
    const email = supaUser.email;
    const uid = supaUser.id;
    const metadata = supaUser.user_metadata;
    setLoading(true);
    (async () => {
      const metaRole = normalizeRole(metadata?.role as string | undefined, email);
      const dbRole = await resolveRole(uid, email);
      const role: SessionLike['role'] = metaRole ?? dbRole;
      if (!active) return;
      setSession({ email, role });
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [isProd, authLoading, supaUser, normalizeRole, resolveRole]);

  // Open auth modal for dev preview when unauthenticated
  useEffect(() => {
    if (!mounted) return;
    if (loading) return;
    const needsAuth = !session || !allowRoles.includes(session.role);
    if (!isProd && needsAuth && !showAuthModal) {
      setShowAuthModal(true);
    }
  }, [mounted, loading, session, allowRoles, showAuthModal, isProd]);

  // Auto-redirect unauthenticated users in production (no CTA)
  useEffect(() => {
    if (!isProd) return;
    if (loading) return;
    const needsAuth = !session || !allowRoles.includes(session.role);
    if (needsAuth) {
      router.replace("/");
    }
  }, [isProd, loading, session, allowRoles, router]);

  useEffect(() => {
    if (session && !allowRoles.includes(session.role)) return;
  }, [session, allowRoles]);

  useEffect(() => {
    if (!loading) return;
    if (isProd) return;
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('[AuthGate] Supabase session timeout, falling back to preview flow');
        setLoading(false);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [loading, isProd]);

  if (!isProd) {
    return <>{children}</>;
  }

  const isAllowed = session ? allowRoles.includes(session.role) : false;

  if (!isAllowed) {
    if (loading) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-sm text-gray-500">Checking your session…</div>
        </div>
      );
    }
    if (isProd) {
      // In production, avoid showing an intermediate CTA; perform a silent redirect handled by the effect above.
      // Render nothing to minimize flicker while redirecting.
      return null;
    }
    // In development, only show the preview sign-in UI when there is truly no Supabase session.
    if (session) return null;
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

          <button onClick={() => {
            const resolvedRole: SessionLike["role"] = email === "bkanuel@gmail.com" ? "admin" : role;
            const next: SessionLike = { email, role: resolvedRole };
            try {
              localStorage.setItem("mr_session", JSON.stringify(next));
              console.log("[AuthGate] signIn stored mr_session:", next);
            } catch (e) {
              console.log("[AuthGate] signIn localStorage error:", e);
            }
            setSession(next);
          }} className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-semibold hover:bg-blue-700 active:bg-blue-800 transition">Continue</button>

          <p className="text-xs text-gray-500 mt-4">Admin email: <span className="font-mono">bkanuel@gmail.com</span></p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {showInlineSignOut && (
        <div className="absolute right-4 -top-10 sm:top-0">
          <button onClick={() => {
            try {
              localStorage.removeItem("mr_session");
            } catch {}
            console.log("[AuthGate] signOut cleared session");
            setSession(null);
            setEmail("");
            setRole("guest");
          }} className="text-xs text-gray-500 hover:text-gray-700 underline">Sign out</button>
        </div>
      )}
      {children}
    </div>
  );
}
