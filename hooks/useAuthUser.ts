"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";
import { AppAuthUser, AppRole, normalizeRole } from "@/lib/auth/app-user";

export interface UseAuthUser {
  user: AppAuthUser | null;
  loading: boolean;
}

export default function useAuthUser(): UseAuthUser {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const supabase = createClient();
  const [user, setUser] = useState<AppAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadSupabaseFallback = async () => {
      const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      if (!data.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/session-user').catch(() => null);
      if (!active) return;

      if (response?.ok) {
        const payload = (await response.json()) as { user?: AppAuthUser | null };
        setUser(payload.user ?? null);
      } else {
        const email = data.user.email ?? '';
        setUser({
          id: data.user.id,
          clerk_user_id: data.user.id,
          legacy_supabase_user_id: data.user.id,
          email,
          user_metadata: {
            name:
              typeof data.user.user_metadata?.name === 'string'
                ? data.user.user_metadata.name
                : undefined,
            avatar_url:
              typeof data.user.user_metadata?.avatar_url === 'string'
                ? data.user.user_metadata.avatar_url
                : undefined,
            role: normalizeRole(data.user.user_metadata?.role, email) ?? 'guest',
          },
        });
      }

      setLoading(false);
    };

    if (!isLoaded) {
      setLoading(true);
      return () => {
        active = false;
      };
    }

    if (!isSignedIn || !clerkUser) {
      void loadSupabaseFallback();
      return () => {
        active = false;
      };
    }

    const email = clerkUser.primaryEmailAddress?.emailAddress ?? '';
    const fallbackRole =
      normalizeRole(clerkUser.publicMetadata?.role, email) ??
      normalizeRole(clerkUser.unsafeMetadata?.role, email) ??
      'guest';

    const legacySupabaseUserId =
      typeof clerkUser.publicMetadata?.legacy_supabase_user_id === 'string'
        ? clerkUser.publicMetadata.legacy_supabase_user_id
        : typeof clerkUser.unsafeMetadata?.legacy_supabase_user_id === 'string'
          ? clerkUser.unsafeMetadata.legacy_supabase_user_id
          : null;

    const nextUser: AppAuthUser = {
      id: legacySupabaseUserId || clerkUser.id,
      clerk_user_id: clerkUser.id,
      legacy_supabase_user_id: legacySupabaseUserId,
      email,
      user_metadata: {
        name: clerkUser.fullName ?? clerkUser.firstName ?? undefined,
        avatar_url: clerkUser.imageUrl,
        role: fallbackRole,
      },
    };

    setUser(nextUser);
    setLoading(false);

    void (async () => {
      try {
        const response = await fetch('/api/clerk/identity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: fallbackRole,
            name: nextUser.user_metadata.name,
            avatarUrl: nextUser.user_metadata.avatar_url,
          }),
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          role?: AppRole
          legacySupabaseUserId?: string | null
        };
        if (!active) {
          return;
        }

        setUser((current) => {
          if (!current) return current;
          return {
            ...current,
            id: payload.legacySupabaseUserId || current.id,
            legacy_supabase_user_id: payload.legacySupabaseUserId || current.legacy_supabase_user_id || null,
            user_metadata: {
              ...current.user_metadata,
              role: payload.role || current.user_metadata.role,
            },
          };
        });
      } catch {}
    })();

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, clerkUser, supabase]);

  return { user, loading };
}
