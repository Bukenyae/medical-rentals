"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/ui/Avatar";
import { ArrowRightOnRectangleIcon, Cog6ToothIcon, ShieldCheckIcon, UserCircleIcon, UserMinusIcon } from "@heroicons/react/24/outline";
import { User } from "@supabase/supabase-js";

interface AccountMenuProps {
  user: User;
  variant?: "icon" | "button";
  className?: string;
}

export default function AccountMenu({ user, variant = "button", className = "" }: AccountMenuProps) {
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuItemsRef = useRef<(HTMLAnchorElement | HTMLButtonElement)[]>([]);

  const avatarUrl = (user?.user_metadata as any)?.avatar_url as string | undefined;
  const displayName = (user?.user_metadata as any)?.name as string | undefined;
  const userEmail = user?.email || "";

  const handleSignOut = async () => {
    try { await supabase.auth.signOut(); } catch {}
    try { localStorage.removeItem("mr_session"); } catch {}
    if (typeof window !== "undefined") window.location.href = "/";
  };

  // Close on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const triggerBase = variant === "icon"
    ? "p-1.5 rounded-full hover:bg-gray-100"
    : "inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm hover:bg-gray-50";

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        id="account-menu-button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls="account-menu"
        onClick={() => setMenuOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setMenuOpen(true);
            setTimeout(() => menuItemsRef.current[0]?.focus(), 0);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setMenuOpen(true);
            setTimeout(() => {
              const items = menuItemsRef.current;
              items[items.length - 1]?.focus();
            }, 0);
          } else if (e.key === "Escape") {
            setMenuOpen(false);
          }
        }}
        ref={triggerRef}
        className={`${triggerBase} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
        aria-label="User menu"
      >
        {avatarUrl ? (
          <Avatar src={avatarUrl} name={displayName || userEmail} email={userEmail} size={variant === "icon" ? "md" : "md"} alt="Account" />
        ) : (
          <>
            <UserCircleIcon className="h-5 w-5 text-gray-700" />
            {variant !== "icon" && (
              <span className="hidden sm:inline text-sm text-gray-800">Account</span>
            )}
          </>
        )}
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-labelledby="account-menu-button"
          id="account-menu"
          className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg p-1 z-50"
          tabIndex={-1}
          onKeyDown={(e) => {
            const items = menuItemsRef.current;
            const currentIndex = items.findIndex((el) => el === document.activeElement);
            if (e.key === "Escape") {
              e.stopPropagation();
              setMenuOpen(false);
              setTimeout(() => triggerRef.current?.focus(), 0);
            } else if (e.key === "Tab") {
              if (items.length === 0) return;
              if (!e.shiftKey && document.activeElement === items[items.length - 1]) {
                e.preventDefault();
                items[0].focus();
              } else if (e.shiftKey && document.activeElement === items[0]) {
                e.preventDefault();
                items[items.length - 1].focus();
              }
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
              items[next]?.focus();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
              items[prev]?.focus();
            }
          }}
        >
          <div className="px-3 py-2">
            <p className="text-xs text-gray-500">Signed in</p>
            <p className="truncate text-sm font-medium text-gray-900" title={userEmail}>{userEmail}</p>
          </div>
          <div className="my-1 h-px bg-gray-100" />
          <Link href="/account" role="menuitem" tabIndex={0} ref={(el) => { if (el) menuItemsRef.current[0] = el; }} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50">
            <Cog6ToothIcon className="h-4 w-4 text-gray-500" />
            <span>Account settings</span>
          </Link>
          <Link href="/account/profile" role="menuitem" tabIndex={0} ref={(el) => { if (el) menuItemsRef.current[1] = el; }} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50">
            <UserCircleIcon className="h-4 w-4 text-gray-500" />
            <span>Profile</span>
          </Link>
          <Link href="/account/security" role="menuitem" tabIndex={0} ref={(el) => { if (el) menuItemsRef.current[2] = el; }} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50">
            <ShieldCheckIcon className="h-4 w-4 text-gray-500" />
            <span>Password & security</span>
          </Link>
          <Link href="/account/deactivate" role="menuitem" tabIndex={0} ref={(el) => { if (el) menuItemsRef.current[3] = el; }} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-rose-700 hover:bg-rose-50 focus:outline-none focus:bg-rose-50">
            <UserMinusIcon className="h-4 w-4 text-rose-600" />
            <span>Deactivate account</span>
          </Link>
          <div className="my-1 h-px bg-gray-100" />
          <button
            role="menuitem"
            tabIndex={0}
            ref={(el) => { if (el) menuItemsRef.current[4] = el; }}
            onClick={handleSignOut}
            className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4 text-gray-500" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
