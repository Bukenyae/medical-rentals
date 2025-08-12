"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UserMenu() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_profiles")
        .select("first_name, avatar_url, preferences")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setFirstName(data.first_name || "");
        setAvatarUrl(data.avatar_url || "");
      }
    };
    load();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    try {
      localStorage.removeItem("mr_session");
    } catch {}
    router.push("/");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 focus:outline-none"
        aria-label="User menu"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="User avatar" className="w-8 h-8 object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white border border-gray-200 z-50">
          <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
            {firstName || "Account"}
          </div>
          <a
            href="/portal/host"
            className={`block px-4 py-2 text-sm hover:bg-gray-50 ${pathname === "/portal/host" ? "bg-blue-50 text-gray-900" : "text-gray-700"}`}
          >
            Account
          </a>
          <a
            href="/portal/host/account"
            className={`block px-4 py-2 text-sm hover:bg-gray-50 ${pathname === "/portal/host/account" ? "bg-blue-50 text-gray-900" : "text-gray-700"}`}
          >
            Account settings
          </a>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

