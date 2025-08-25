"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthGate from "@/components/portal/AuthGate";
import { useSearchParams } from "next/navigation";

export default function AccountProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const fromHost = (searchParams.get("from") || "") === "host";
  const backHref = fromHost ? "/portal/host" : "/portal/guest";
  const backLabel = fromHost ? "Back to Host Portal" : "Back to Guest Portal";
  const q = fromHost ? "?from=host" : "";
  const AVATARS_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_AVATARS_BUCKET || "avatars";
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [languages, setLanguages] = useState("");
  const [interests, setInterests] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const user = data.user as any;
      setUserId(user?.id || "");
      const meta = user?.user_metadata || {};
      setName((meta.name as string) || "");
      setBio((meta.bio as string) || "");
      setLocation((meta.location as string) || "");
      setLanguages(Array.isArray(meta.languages) ? (meta.languages as string[]).join(", ") : (meta.languages as string) || "");
      setInterests(Array.isArray(meta.interests) ? (meta.interests as string[]).join(", ") : (meta.interests as string) || "");
      setAvatarUrl((meta.avatar_url as string) || "");
      

      // One-time normalization from provider identities into our metadata fields
      // Only run if not previously normalized; do not overwrite non-empty values
      try {
        if (!meta?.normalized_v1 && user) {
          const identities = (user.identities || []) as Array<any>;
          // Fold identity_data to extract candidate fields
          const candidate = identities.reduce(
            (acc, id) => {
              const d = (id?.identity_data || {}) as Record<string, any>;
              // Possible name fields
              const given = (d.given_name as string) || (d.first_name as string) || "";
              const family = (d.family_name as string) || (d.last_name as string) || "";
              const fullFromParts = `${given} ${family}`.trim();
              const candName = (d.full_name as string) || (d.name as string) || fullFromParts;
              // Possible avatar fields
              const candAvatar = (d.avatar_url as string) || (d.picture as string) || (d.avatarUrl as string) || "";
              return {
                name: acc.name || candName,
                avatar_url: acc.avatar_url || candAvatar,
              };
            },
            { name: "", avatar_url: "" }
          );

          const updates: Record<string, any> = { normalized_v1: true };
          if (!meta.name && candidate.name) updates.name = candidate.name;
          if (!meta.avatar_url && candidate.avatar_url) updates.avatar_url = candidate.avatar_url;

          if (Object.keys(updates).length > 1) {
            const { error } = await supabase.auth.updateUser({ data: updates });
            if (!error) {
              // Reflect updates in local state
              if (updates.name) setName(updates.name);
              if (updates.avatar_url) setAvatarUrl(updates.avatar_url);
            }
          } else {
            // Mark normalized even if nothing to update to avoid re-running each mount
            await supabase.auth.updateUser({ data: { normalized_v1: true } });
          }
        }
      } catch {
        // swallow normalization errors silently to not impact UX
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  

  // Auto center square crop using canvas
  const cropToSquare = async (file: File): Promise<Blob> => {
    const bitmap = await createImageBitmap(file);
    const size = Math.min(bitmap.width, bitmap.height);
    const sx = Math.floor((bitmap.width - size) / 2);
    const sy = Math.floor((bitmap.height - size) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Failed to crop image"))), file.type || "image/jpeg", 0.92);
    });
  };

  

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const langs = languages
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const ints = interests
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      // Handle avatar upload if a new file was selected
      let newAvatarUrl = avatarUrl;
      if (avatarFile && userId) {
        if (avatarFile.size > 5 * 1024 * 1024) {
          throw new Error("Image too large. Max size is 5MB.");
        }
        // Crop to square before upload for consistent avatar aspect
        const croppedBlob = await cropToSquare(avatarFile);
        const uploadFile = new File([croppedBlob], avatarFile.name, { type: avatarFile.type });
        const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from(AVATARS_BUCKET)
          .upload(filePath, uploadFile, { upsert: true, contentType: avatarFile.type });
        if (uploadErr) {
          // Surface a helpful message if the bucket is missing
          if (/(bucket|not found)/i.test(uploadErr.message)) {
            throw new Error(`Storage bucket "${AVATARS_BUCKET}" not found. Create it in Supabase Storage and allow public read + authenticated write.`);
          }
          throw uploadErr;
        }
        const { data: pub } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath);
        // Append cache-buster so header/clients immediately pick up the new image
        newAvatarUrl = `${pub.publicUrl}?v=${Date.now()}`;
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          name,
          bio,
          location,
          languages: langs,
          interests: ints,
          avatar_url: newAvatarUrl || null,
        },
      });
      if (error) throw error;
      // Ensure local preview also reflects the cache-busted URL
      setAvatarUrl(newAvatarUrl);
      setMessage("Profile saved.");
    } catch (err: any) {
      setMessage(err?.message || "Failed to save profile.");
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
      <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
      <p className="mt-2 text-gray-600">Edit your public profile information.</p>

      <form onSubmit={onSave} className="mt-6 space-y-4">
        {/* Avatar uploader */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Profile Photo</label>
          <div className="mt-2 flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar preview" className="h-full w-full object-cover" />
              ) : (
                <span className="text-gray-400 text-sm">No photo</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setAvatarFile(f);
                    if (f) {
                      if (f.size > 5 * 1024 * 1024) {
                        setMessage("Image too large. Max size is 5MB.");
                        return;
                      }
                      const url = URL.createObjectURL(f);
                      setAvatarUrl(url);
                    }
                  }}
                />
                Upload new
              </label>
              {avatarUrl && (
                <button type="button" className="text-sm text-gray-600 hover:underline" onClick={() => { setAvatarFile(null); setAvatarUrl(""); }}>
                  Remove
                </button>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">JPG or PNG up to 5MB. Stored securely.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">About / Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tell guests a little about yourself"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="City, State"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Languages (comma separated)</label>
          <input
            type="text"
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="English, Spanish"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Interests (comma separated)</label>
          <input
            type="text"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Hiking, Reading"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save profile"}
          </button>
          <span
            className="text-sm text-gray-700"
            role="status"
            aria-live="polite"
          >
            {message}
          </span>
        </div>
      </form>

      <div className="mt-6">
        <Link href={`/account${q}`} className="text-sm text-blue-600 hover:underline">Back to Account</Link>
      </div>
    </main>
    </AuthGate>
  );
}
