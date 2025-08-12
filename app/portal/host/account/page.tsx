"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/portal/AuthGate";
import UserMenu from "@/components/portal/UserMenu";
import { createClient } from "@/lib/supabase/client";

export default function HostAccountPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [governmentId, setGovernmentId] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [hometown, setHometown] = useState("");
  const [decade, setDecade] = useState("");
  const [languages, setLanguages] = useState("");
  const [bio, setBio] = useState("");
  const [years, setYears] = useState("");
  const [rating, setRating] = useState("");
  const [reviews, setReviews] = useState("");
  const [interests, setInterests] = useState("");
  const [funFacts, setFunFacts] = useState("");
  const [socialLinks, setSocialLinks] = useState("");
  const [badges, setBadges] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("user_profiles")
        .select("first_name, avatar_url, preferences")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setFirstName(data.first_name || "");
        setAvatarUrl(data.avatar_url || "");
        const prefs = (data.preferences as any) || {};
        setGovernmentId(prefs?.verified_identity?.government_id || false);
        setEmailVerified(prefs?.verified_identity?.email_verified || false);
        setHometown(prefs.hometown || "");
        setDecade(prefs.decade_of_birth || "");
        setLanguages(prefs.languages || "");
        setBio(prefs.bio || "");
        setYears(prefs.hosting_experience?.years || "");
        setRating(prefs.hosting_experience?.rating || "");
        setReviews(prefs.hosting_experience?.reviews || "");
        setInterests(prefs.interests || "");
        setFunFacts(prefs.fun_facts || "");
        setSocialLinks(prefs.social_links || "");
        setBadges(prefs.badges || "");
      }
      setLoading(false);
    };
    load();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const prefs = {
      verified_identity: { government_id: governmentId, email_verified: emailVerified },
      hometown,
      decade_of_birth: decade,
      languages,
      bio,
      hosting_experience: { years, rating, reviews },
      interests,
      fun_facts: funFacts,
      social_links: socialLinks,
      badges,
    };
    const { error } = await supabase
      .from("user_profiles")
      .upsert({ id: user.id, first_name: firstName, avatar_url: avatarUrl, preferences: prefs });
    if (error) alert(error.message); else alert("Profile updated");
  };

  return (
    <AuthGate allowRoles={["host", "admin"]}>
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <h1 className="text-lg font-semibold">Account</h1>
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">
          {loading ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">Verified Identity</h2>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={governmentId} onChange={(e) => setGovernmentId(e.target.checked)} />
                  Government-issued ID
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={emailVerified} onChange={(e) => setEmailVerified(e.target.checked)} />
                  Verified email address
                </label>
              </section>

              <section className="space-y-2">
                <h2 className="text-xl font-semibold">Basic Information</h2>
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Hometown"
                  value={hometown}
                  onChange={(e) => setHometown(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Decade of birth (e.g., 1990s)"
                  value={decade}
                  onChange={(e) => setDecade(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </section>

              <section className="space-y-2">
                <h2 className="text-xl font-semibold">Languages Spoken</h2>
                <input
                  type="text"
                  placeholder="e.g., English, Spanish"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </section>

              <section className="space-y-2">
                <h2 className="text-xl font-semibold">Profile Bio</h2>
                <textarea
                  placeholder="Tell guests about yourself…"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={4}
                />
              </section>

              <section className="space-y-2">
                <h2 className="text-xl font-semibold">Hosting Experience</h2>
                <input
                  type="text"
                  placeholder="Years hosting"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Average star rating"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Reviews received"
                  value={reviews}
                  onChange={(e) => setReviews(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </section>

              <section className="space-y-2">
                <h2 className="text-xl font-semibold">Optional Personal Details</h2>
                <input
                  type="text"
                  placeholder="Interests"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Fun facts"
                  value={funFacts}
                  onChange={(e) => setFunFacts(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Social media links"
                  value={socialLinks}
                  onChange={(e) => setSocialLinks(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </section>

              <section className="space-y-2">
                <h2 className="text-xl font-semibold">Photo</h2>
                <input
                  type="text"
                  placeholder="Photo URL"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </section>

              <section className="space-y-2">
                <h2 className="text-xl font-semibold">Additional Badges or Status</h2>
                <input
                  type="text"
                  placeholder="e.g., Superhost"
                  value={badges}
                  onChange={(e) => setBadges(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </section>

              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </form>
          )}
        </main>
      </div>
    </AuthGate>
  );
}

