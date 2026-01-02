"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  dispatchPropertiesRefresh,
  fetchHostProperties,
  PROPERTIES_REFRESH_EVENT,
  HostPropertyRecord,
} from "@/lib/queries/properties";

interface PropertyFormProps {
  onPropertySelected?: (propertyId: string | null) => void;
  initialPropertyId?: string | null;
  onSaved?: (id: string, mode: 'create' | 'edit') => void;
  onDirtyChange?: (dirty: boolean) => void;
}

type PropertyRow = HostPropertyRecord & {
  published_at?: string | null;
};

interface ApprovedImageRow {
  id: string;
  url: string;
  is_approved: boolean;
  sort_order: number;
  // optional metadata
  created_at?: string | null;
  updated_at?: string | null;
}

export default function PropertyForm({
  onPropertySelected,
  initialPropertyId,
  onSaved,
  onDirtyChange,
}: PropertyFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const BUCKET = (process.env.NEXT_PUBLIC_PROPERTY_IMAGES_BUCKET || 'property-images').trim();

  const [loading, setLoading] = useState(false);
  // lightweight toast for UX feedback
  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null);
  const [myProps, setMyProps] = useState<PropertyRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [nightlyPrice, setNightlyPrice] = useState<number>(150);
  const [minimumNights, setMinimumNights] = useState<number>(1);
  const [bedrooms, setBedrooms] = useState<number>(3);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [sqft, setSqft] = useState<number | "">(1100);
  const [weeklyDiscountPct, setWeeklyDiscountPct] = useState<number>(20);
  const [weeklyPrice, setWeeklyPrice] = useState<number>(120);
  const [monthlyDiscountPct, setMonthlyDiscountPct] = useState<number>(40);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(90);
  const [proximityBadge1, setProximityBadge1] = useState<string>("");
  const [proximityBadge2, setProximityBadge2] = useState<string>("");
  // Google Maps URL (Step 1)
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string>("");
  const [mapSaving, setMapSaving] = useState<boolean>(false);
  const [mapSavedAt, setMapSavedAt] = useState<number | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Auto-calculate weekly and monthly prices based on nightly and discount %
  useEffect(() => {
    const nightly = Number.isFinite(nightlyPrice) ? nightlyPrice : 0;
    const weekly = Math.max(0, Math.round(nightly * (1 - (weeklyDiscountPct || 0) / 100)));
    const monthly = Math.max(0, Math.round(nightly * (1 - (monthlyDiscountPct || 0) / 100)));
    if (weekly !== weeklyPrice) setWeeklyPrice(weekly);
    if (monthly !== monthlyPrice) setMonthlyPrice(monthly);
  }, [nightlyPrice, weeklyDiscountPct, monthlyDiscountPct, weeklyPrice, monthlyPrice]);

  // wizard state
  const [step, setStep] = useState<1 | 2>(1);

  // Step 2 preview-only fields
  const [hostName, setHostName] = useState<string>("");
  const [hostAvatarUrl, setHostAvatarUrl] = useState<string>("");
  const [aboutSpace, setAboutSpace] = useState<string>("");
  const [professionalsDesc, setProfessionalsDesc] = useState<string>("");
  const [amenitiesCsv, setAmenitiesCsv] = useState<string>("");
  const AMENITY_OPTIONS = useMemo(
    () => [
      "Free WiFi",
      "Free parking",
      "55\" HDTV",
      "Full kitchen",
      "Fully furnished house",
      "In-unit washer and dryer",
      "Flexible lease terms (days/weeks/months)",
      "Self check-in",
    ],
    []
  );
  const PLACEHOLDER_AVATAR = "/images/placeholder/avatar.png";
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(new Set());
  const [cleaningFeePct, setCleaningFeePct] = useState<number>(0);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set()); // ISO date strings

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      }),
    []
  );
  const resolvedMinimumNights = Number.isFinite(minimumNights) ? Math.max(1, minimumNights) : 1;
  const previewNightlyRate = Number.isFinite(nightlyPrice) && nightlyPrice > 0 ? nightlyPrice : 150;
  const previewMinimumSubtotal = Math.max(0, Math.round(previewNightlyRate * resolvedMinimumNights));
  const previewMinimumSubtotalLabel = currencyFormatter.format(previewMinimumSubtotal);
  const previewNightlyRateLabel = currencyFormatter.format(previewNightlyRate);

  // Host profile (derived)
  const [hostNameDerived, setHostNameDerived] = useState<string>("");
  const [hostAvatarDerived, setHostAvatarDerived] = useState<string>("");
  const [hostBioDerived, setHostBioDerived] = useState<string>("");
  const [hostJoinedYear, setHostJoinedYear] = useState<string>("");

  // approved images for preview/cover selection
  const [approvedImages, setApprovedImages] = useState<ApprovedImageRow[]>([]);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<ApprovedImageRow | null>(null);
  const displayImageUrl = useMemo(() => {
    const current = myProps.find((p) => p.id === selectedId);
    return (
      current?.cover_image_url ||
      approvedImages[0]?.url ||
      "/images/placeholder/house.jpg"
    );
  }, [approvedImages, myProps, selectedId]);

  const isEdit = useMemo(() => Boolean(selectedId), [selectedId]);

  const [isDirty, setIsDirty] = useState(false);
  const hasMarkedDirty = useRef(false);
  const [drafting, setDrafting] = useState(false);
  const draftCreatedRef = useRef(false);

  // Fetch and refresh the owner's properties list
  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) {
      setLoading(false);
      return;
    }
    try {
      const rows = await fetchHostProperties(supabase, session.user.id);
      setMyProps(rows as PropertyRow[]);
    } catch (error) {
      console.error('Failed to load properties', error);
      setMyProps([]);
    }
    setLoading(false);
  }, [supabase]);

  // Delete property and related rows, and attempt to remove storage objects under userId/propertyId
  async function deletePropertyAndAssets(p: PropertyRow) {
    const yes = confirm('Delete this property and all related photos? This cannot be undone.');
    if (!yes) return;
    setLoading(true);
    try {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id || p.created_by;
        if (uid) {
          const listAll = async (prefix: string): Promise<string[]> => {
            const keys: string[] = [];
            const { data } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
            for (const ent of data || []) {
              const full = prefix ? `${prefix}/${ent.name}` : ent.name;
              if ((ent as any).metadata?.mimetype) keys.push(full);
              else keys.push(...(await listAll(full)));
            }
            return keys;
          };
          const keys = await listAll(`${uid}/${p.id}`);
          if (keys.length) await supabase.storage.from(BUCKET).remove(keys);
        }
      } catch { /* ignore storage errors */ }

      await supabase.from('property_images').delete().eq('property_id', p.id);
      await supabase.from('property_unavailable_dates').delete().eq('property_id', p.id);
      await supabase.from('properties').delete().eq('id', p.id);
      await refresh();
      dispatchPropertiesRefresh();
      if (selectedId === p.id) loadIntoForm(undefined);
      setToast({ msg: 'Property deleted', kind: 'success' });
      setTimeout(() => setToast(null), 2000);
    } catch (e: any) {
      alert(e?.message || 'Failed to delete property');
    } finally {
      setLoading(false);
    }
  }

  // Derived completion states
  const basicsValid = useMemo(() => {
    const hasTitle = Boolean(title && title.trim().length > 5);
    return hasTitle;
  }, [title]);

  const hasPhotos = useMemo(() => approvedImages.length > 0, [approvedImages.length]);
  const step1Ready = useMemo(() => basicsValid && hasPhotos, [basicsValid, hasPhotos]);
  const step2Ready = useMemo(
    () => basicsValid && hasPhotos,
    [basicsValid, hasPhotos]
  );

  // Ensure a draft record exists once basics are valid so uploads (photos) are enabled
  const ensureDraft = useCallback(async () => {
    if (selectedId || drafting || !basicsValid || draftCreatedRef.current) {
      return selectedId;
    }
    try {
      setDrafting(true);
      draftCreatedRef.current = true;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }
      // Insert only columns that exist in the database
      const insertBody: Record<string, unknown> = {
        owner_id: user.id,
        created_by: user.id,
        title,
        address,
        base_price: 150, // satisfy NOT NULL default if present
        is_published: false,
        max_guests: Math.max(1, (Number.isFinite(bedrooms) ? (bedrooms as number) : 2) * 2),
        sqft: typeof sqft === 'number' ? sqft : null,
        minimum_nights: resolvedMinimumNights,
      };
      const { data, error } = await supabase
        .from('properties')
        .insert([insertBody])
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id) {
        setSelectedId(data.id);
        onPropertySelected?.(data.id);
        await refresh();
      }
    } catch (error) {
      draftCreatedRef.current = false;
      throw error;
    } finally {
      setDrafting(false);
    }
  }, [address, basicsValid, bedrooms, drafting, onPropertySelected, refresh, selectedId, sqft, supabase, title]);

  // Click helpers to enable uploads earlier
  const handleCoverClick = useCallback(async () => {
    if (selectedId) {
      coverInputRef.current?.click();
      return;
    }
    if (basicsValid) {
      await ensureDraft();
      // Wait for selectedId to be set
      setTimeout(() => {
        if (coverInputRef.current) coverInputRef.current.click();
      }, 200);
    }
  }, [basicsValid, ensureDraft, selectedId]);

  const handleGalleryClick = useCallback(async () => {
    if (selectedId) {
      galleryInputRef.current?.click();
      return;
    }
    if (basicsValid) {
      await ensureDraft();
      setTimeout(() => {
        if (galleryInputRef.current) galleryInputRef.current.click();
      }, 200);
    }
  }, [basicsValid, ensureDraft, selectedId]);

  // Removed auto-draft effect to avoid repeated attempts; draft is created when user clicks an upload action.

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => {
      void refresh();
    };
    window.addEventListener(PROPERTIES_REFRESH_EVENT, handler);
    return () => window.removeEventListener(PROPERTIES_REFRESH_EVENT, handler);
  }, [refresh]);

  // derive host info from profile
  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return;

      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('first_name,last_name,avatar_url,created_at')
          .eq('id', uid)
          .maybeSingle();
        if (data) {
          const name = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
          if (name) setHostNameDerived(name);
          if (data.avatar_url?.trim()) setHostAvatarDerived(data.avatar_url.trim());
          if (data.created_at) setHostJoinedYear(String(new Date(data.created_at).getFullYear()));
          return true;
        }
        if (error && error.code !== 'PGRST116') {
          console.warn('[PropertyForm] user_profiles lookup failed', error);
        }
        const { data: legacy } = await supabase
          .from('profiles')
          .select('full_name,name,avatar_url,created_at')
          .eq('id', uid)
          .maybeSingle();
        if (legacy) {
          const legacyName = ((legacy.full_name as string) || (legacy.name as string) || '').trim();
          if (legacyName) setHostNameDerived(legacyName);
          if ((legacy.avatar_url as string)?.trim()) setHostAvatarDerived((legacy.avatar_url as string).trim());
          if (legacy.created_at) setHostJoinedYear(String(new Date(legacy.created_at).getFullYear()));
          return true;
        }
        return false;
      };

      const user = userRes.user;
      if (user) {
        const meta = (user.user_metadata || {}) as Record<string, any>;
        if (typeof meta.name === 'string' && meta.name.trim()) setHostNameDerived(meta.name.trim());
        if (typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) setHostAvatarDerived(meta.avatar_url.trim());
        if (typeof meta.bio === 'string' && meta.bio.trim()) setHostBioDerived(meta.bio.trim());
        if (user.created_at) setHostJoinedYear(String(new Date(user.created_at).getFullYear()));
      }

      await fetchProfile();
    })();
  }, [supabase]);

  useEffect(() => {
    if (!selectedId) return;
    try {
      const payload = {
        aboutSpace,
        professionalsDesc,
        amenities: Array.from(selectedAmenities),
        cleaningFeePct,
      };
      localStorage.setItem(`property:step2:${selectedId}`, JSON.stringify(payload));
    } catch {}
  }, [aboutSpace, professionalsDesc, selectedAmenities, cleaningFeePct, selectedId]);

  // --- Map URL handling ---
  function isValidMapsUrl(url: string): boolean {
    try {
      const trimmed = url.trim();
      if (!trimmed) return false;
      const u = new URL(trimmed);
      if (!(u.protocol === 'http:' || u.protocol === 'https:')) return false;
      const host = u.hostname.toLowerCase();

      if (host === 'goo.gl' || host.endsWith('.goo.gl')) return true;
      if (host.endsWith('.googleusercontent.com')) return true;
      if (host === 'google.com' || host === 'www.google.com') {
        return u.pathname.startsWith('/maps');
      }
      if (host.endsWith('.google.com')) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  const saveMapUrl = async (value: string) => {
    setMapError(null);
    setMapSavedAt(null);
    if (!selectedId) return; // gated until saved
    const sanitized = value.trim();
    if (!sanitized) {
      // allow clearing link
      setMapSaving(true);
      const { error } = await supabase.from('properties').update({ map_url: null }).eq('id', selectedId);
      setMapSaving(false);
      if (error) {
        setMapError(error.message || 'Failed to save');
      } else {
        setMapSavedAt(Date.now());
        setGoogleMapsUrl('');
      }
      return;
    }
    if (!isValidMapsUrl(sanitized)) {
      setMapError('Enter a valid Google Maps URL');
      return;
    }
    setMapSaving(true);
    const { error } = await supabase.from('properties').update({ map_url: sanitized }).eq('id', selectedId);
    setMapSaving(false);
    if (error) {
      setMapError(error.message || 'Failed to save');
    } else {
      setMapSavedAt(Date.now());
      setGoogleMapsUrl(sanitized);
    }
  };

  useEffect(() => {
    if (selectedId) onPropertySelected?.(selectedId);
  }, [selectedId, onPropertySelected]);

  // Fetch approved images when a property is selected to power previews/cover selection
  useEffect(() => {
    async function fetchImages(pid: string) {
      // try selecting metadata columns; fallback if schema lacks them
      let { data, error } = await supabase
        .from("property_images")
        .select("id,url,is_approved,sort_order,created_at,updated_at")
        .eq("property_id", pid)
        .eq("is_approved", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) {
        const fb = await supabase
          .from("property_images")
          .select("id,url,is_approved,sort_order")
          .eq("property_id", pid)
          .eq("is_approved", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });
        data = fb.data as any;
      }
      if (data) setApprovedImages(data as unknown as ApprovedImageRow[]); else setApprovedImages([]);
    }
    if (selectedId) void fetchImages(selectedId);
    else setApprovedImages([]);
  }, [selectedId, supabase]);

  // Load existing unavailable dates for the selected property
  useEffect(() => {
    (async () => {
      if (!selectedId) {
        setBlockedDates(new Set());
        return;
      }
      const { data, error } = await supabase
        .from('property_unavailable_dates')
        .select('date')
        .eq('property_id', selectedId);
      if (!error && data) {
        const set = new Set<string>(
          data.map((r: { date: string }) => new Date(r.date).toISOString().slice(0, 10))
        );
        setBlockedDates(set);
      }
    })();
  }, [selectedId, supabase]);

  // Toggle handler with optimistic updates and Supabase persistence
  const onToggleBlocked = async (iso: string, nextActive: boolean) => {
    const previous = new Set(blockedDates);
    const optimistic = new Set(blockedDates);
    if (nextActive) optimistic.add(iso); else optimistic.delete(iso);
    setBlockedDates(optimistic);
    if (!selectedId) return;
    if (nextActive) {
      const { error } = await supabase
        .from('property_unavailable_dates')
        .insert([{ property_id: selectedId, date: iso }]);
      if (error) {
        setBlockedDates(previous);
        alert(error.message || 'Failed to block date');
      }
    } else {
      const { error } = await supabase
        .from('property_unavailable_dates')
        .delete()
        .eq('property_id', selectedId)
        .eq('date', iso);
      if (error) {
        setBlockedDates(previous);
        alert(error.message || 'Failed to unblock date');
      }
    }
  };

  // When opening in edit mode, set selectedId immediately so UI reflects edit state,
  // then load full fields once the list is available
  useEffect(() => {
    if (!initialPropertyId) return;
    if (selectedId !== initialPropertyId) setSelectedId(initialPropertyId);
    const existing = myProps.find((p) => p.id === initialPropertyId);
    if (existing) loadIntoForm(existing);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPropertyId, myProps.length]);

  async function handleSave() {
    let savedId: string | null = null;
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      if (!title || !address) {
        alert("Title and address are required.");
        setLoading(false);
        return;
      }

      // Primary payload with only known-safe columns (avoid schema-missing errors)
      const primary: Record<string, unknown> = {
        title,
        address,
        description,
        base_price: Number.isFinite(nightlyPrice) ? nightlyPrice : 150,
        minimum_nights: resolvedMinimumNights,
        max_guests: Math.max(1, (Number.isFinite(bedrooms) ? (bedrooms as number) : 2) * 2),
        proximity_badge_1: proximityBadge1 || null,
        proximity_badge_2: proximityBadge2 || null,
        bedrooms,
        bathrooms,
        sqft: typeof sqft === 'number' ? sqft : null,
        cover_image_url: displayImageUrl || null,
        about_space: aboutSpace || null,
        indoor_outdoor_experiences: professionalsDesc || null,
        host_bio: hostBioDerived || null,
        host_avatar_url: hostAvatarDerived || null,
        cleaning_fee_pct: Number.isFinite(cleaningFeePct) ? cleaningFeePct : null,
      };

      const trySave = async (body: Record<string, unknown>): Promise<string> => {
        if (selectedId) {
          const { error } = await supabase
            .from('properties')
            .update(body)
            .eq('id', selectedId);
          if (error) throw error;
          return selectedId;
        } else {
          // ensure owner_id and created_by are set for new records (RLS requires created_by = auth.uid())
          const insertBody = { ...body, owner_id: user.id, created_by: user.id } as Record<string, unknown>;
          const { data, error } = await supabase
            .from('properties')
            .insert([insertBody])
            .select('id')
            .single();
          if (error) throw error;
          setSelectedId(data.id);
          return data.id;
        }
      };

      try {
        savedId = await trySave(primary);
        if (savedId) {
          await refresh();
          dispatchPropertiesRefresh();
          onPropertySelected?.(savedId);
          setStep(1);
          setLoading(false);
          const successMsg = selectedId ? 'Property updated' : 'Property created';
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem('host:last-toast', successMsg);
            } catch {
              /* ignore */
            }
          }
          if (onSaved) {
            onSaved(savedId, selectedId ? 'edit' : 'create');
          } else {
            setToast({ msg: successMsg, kind: 'success' });
            setTimeout(() => setToast(null), 2500);
          }
          return;
        }
      } catch (e: any) {
        const msg: string = e?.message || '';
        // If discount columns are missing in the DB, retry with a minimal payload
        if (
          typeof e?.message === 'string' &&
          (e.message as string).toLowerCase().includes('schema cache') &&
          (e.message as string).toLowerCase().includes('could not find') &&
          (e.message as string).toLowerCase().includes('column')
        ) {
          // Fallback with minimal columns
          const fallback: Record<string, unknown> = {
            title,
            address,
            description,
            base_price: Number.isFinite(nightlyPrice) ? nightlyPrice : 150,
            minimum_nights: resolvedMinimumNights,
            max_guests: Math.max(1, (Number.isFinite(bedrooms) ? (bedrooms as number) : 2) * 2),
            proximity_badge_1: proximityBadge1 || null,
            proximity_badge_2: proximityBadge2 || null,
            bedrooms,
            bathrooms,
            sqft: typeof sqft === 'number' ? sqft : null,
            about_space: aboutSpace || null,
            indoor_outdoor_experiences: professionalsDesc || null,
            host_bio: hostBioDerived || null,
            host_avatar_url: hostAvatarDerived || null,
            cleaning_fee_pct: Number.isFinite(cleaningFeePct) ? cleaningFeePct : null,
          };
          const fbId = await trySave(fallback);
          // notify parent with the created/updated id
          await refresh();
          dispatchPropertiesRefresh();
          onPropertySelected?.(fbId);
          setStep(1);
          setLoading(false);
          const successMsg = selectedId ? 'Property updated' : 'Property created';
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem('host:last-toast', successMsg);
            } catch {
              /* ignore */
            }
          }
          if (onSaved) {
            onSaved(fbId, selectedId ? 'edit' : 'create');
          } else {
            setToast({ msg: successMsg, kind: 'success' });
            setTimeout(() => setToast(null), 2500);
          }
          return;
        } else {
          alert(msg || 'Failed to save property');
          setLoading(false);
          return;
        }
      }
    } finally {
      // In case we did not early-return above, ensure loading is unset
      setLoading(false);
    }
    // reset dirty after successful save
    if (isDirty) {
      setIsDirty(false);
      onDirtyChange?.(false);
    }
  }

  // Reorder helpers
  function arrayMove<T>(arr: T[], from: number, to: number): T[] {
    const copy = arr.slice();
    if (from === to || from < 0 || to < 0 || from >= copy.length || to >= copy.length) return copy;
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  }

  async function persistSortOrderLocal(images: ApprovedImageRow[]) {
    if (!selectedId) return;
    try {
      await Promise.all(
        images.map((img, idx) =>
          supabase
            .from('property_images')
            .update({ sort_order: idx })
            .eq('id', img.id)
        )
      );
      // Set cover to first image
      await supabase.from('properties').update({ cover_image_url: images[0].url }).eq('id', selectedId);
    } catch (e: any) {
      console.error('Failed to persist sort order', e?.message || e);
    }
  }

  // Reload approved images helper
  async function reloadApproved() {
    if (!selectedId) return;
    let { data, error } = await supabase
      .from('property_images')
      .select('id,url,is_approved,sort_order,created_at,updated_at')
      .eq('property_id', selectedId)
      .eq('is_approved', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      const fb = await supabase
        .from('property_images')
        .select('id,url,is_approved,sort_order')
        .eq('property_id', selectedId)
        .eq('is_approved', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      data = fb.data as any;
    }
    setApprovedImages((data ?? []) as unknown as ApprovedImageRow[]);
  }

  // Delete an image (DB row, and attempt storage object removal if path can be derived)
  async function deleteImage(img: ApprovedImageRow) {
    if (!selectedId) return;
    const proceed = confirm('Delete this photo from the album? This cannot be undone.');
    if (!proceed) return;
    // optimistic update
    setApprovedImages((prev) => prev.filter((i) => i.id !== img.id));
    const wasCover = displayImageUrl === img.url;
    try {
      const { error } = await supabase.from('property_images').delete().eq('id', img.id);
      if (error) throw error;
      // Try to remove storage object if URL maps to bucket path
      try {
        const m = img.url.match(new RegExp(`/object/public/${BUCKET.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}/(.+)$`));
        if (m && m[1]) {
          await supabase.storage.from(BUCKET).remove([m[1]]);
        }
      } catch (e) {
        // non-fatal
      }
      // If was cover, set next cover or clear
      if (wasCover) {
        await reloadApproved();
        const next = approvedImages.filter((i) => i.id !== img.id);
        const nextCover = next[0]?.url ?? null;
        await supabase.from('properties').update({ cover_image_url: nextCover }).eq('id', selectedId);
        await refresh();
      }
      setToast({ msg: 'Image deleted', kind: 'success' });
      setTimeout(() => setToast(null), 2000);
    } catch (e: any) {
      alert(e?.message || 'Failed to delete image');
      // rollback by reloading
      await reloadApproved();
    }
  }

  // Replace flow
  function startReplace(img: ApprovedImageRow) {
    setReplaceTarget(img);
    replaceInputRef.current?.click();
  }

  async function handleReplaceFile(files: FileList) {
    if (!selectedId || !replaceTarget || files.length === 0) return;
    setLoading(true);
    try {
      const file = files[0];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const path = `${user.id}/${selectedId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = await supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await supabase
        .from('property_images')
        .update({ url, alt: file.name })
        .eq('id', replaceTarget.id);
      if (updErr) throw updErr;
      // If it was cover, update cover url too
      if (displayImageUrl === replaceTarget.url) {
        await supabase.from('properties').update({ cover_image_url: url }).eq('id', selectedId);
      }
      await reloadApproved();
      await refresh();
      setToast({ msg: 'Image replaced', kind: 'success' });
      setTimeout(() => setToast(null), 2000);
    } catch (e: any) {
      alert(e?.message || 'Failed to replace image');
    } finally {
      setLoading(false);
      setReplaceTarget(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  }

  function loadIntoForm(p?: PropertyRow) {
    if (!p) {
      setSelectedId(null);
      setTitle("");
      setDescription("");
      setAddress("");
      setBedrooms(3);
      setBathrooms(2);
      setSqft(1100);
      setGoogleMapsUrl("");
      setMinimumNights(1);
      setAboutSpace("");
      setProfessionalsDesc("");
      setSelectedAmenities(new Set());
      setCleaningFeePct(0);
      onPropertySelected?.(null);
      return;
    }
    let draft: {
      aboutSpace?: string;
      professionalsDesc?: string;
      amenities?: string[];
      cleaningFeePct?: number;
    } | null = null;
    try {
      const raw = localStorage.getItem(`property:step2:${p.id}`);
      if (raw) {
        draft = JSON.parse(raw);
      }
    } catch {}
    setSelectedId(p.id);
    onPropertySelected?.(p.id);
    setTitle(p.title ?? "");
    setDescription(p.description ?? "");
    setAddress(p.address ?? "");
    setNightlyPrice(p.nightly_price ?? 150);
    setMinimumNights(p.minimum_nights && p.minimum_nights > 1 ? p.minimum_nights : 1);
    setWeeklyDiscountPct(p.weekly_discount_pct ?? 20);
    setWeeklyPrice(p.weekly_price ?? Math.round((p.nightly_price ?? 150) * 0.8));
    setMonthlyDiscountPct(p.monthly_discount_pct ?? 40);
    setMonthlyPrice(p.monthly_price ?? Math.round((p.nightly_price ?? 150) * 0.6));
    setProximityBadge1(p.proximity_badge_1 ?? "");
    setProximityBadge2(p.proximity_badge_2 ?? "");
    setBedrooms(p.bedrooms ?? 3);
    setBathrooms(p.bathrooms ?? 2);
    setSqft(typeof p.sqft === 'number' ? p.sqft : 1100);
    setCleaningFeePct(typeof p.cleaning_fee_pct === 'number' ? p.cleaning_fee_pct : (draft?.cleaningFeePct ?? 0));
    setGoogleMapsUrl(p.map_url ?? "");
    setAboutSpace(p.about_space ?? draft?.aboutSpace ?? "");
    setProfessionalsDesc(p.indoor_outdoor_experiences ?? draft?.professionalsDesc ?? "");
    if (Array.isArray(draft?.amenities) && draft?.amenities.length) {
      setSelectedAmenities(new Set(draft.amenities));
    }
    setStep(1);
  }

  async function applyCoverImage(url: string) {
    if (!selectedId) return;
    const { error } = await supabase
      .from("properties")
      .update({ cover_image_url: url })
      .eq("id", selectedId);
    if (!error) {
      setToast({ msg: 'Cover image updated', kind: 'success' });
      setTimeout(() => setToast(null), 2500);
    }
  }

  // Compress image helper
  function compressImage(file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      // Use the DOM Image constructor explicitly to avoid clashing with Next.js's Image component import
      const img = new window.Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // fallback to original
          }
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  // Upload helpers (auto-approve)
  async function uploadImages(files: FileList, setAsCover: boolean) {
    if (files.length === 0) return;
    
    let propertyId = selectedId;
    
    // If no selectedId, create a draft first
    if (!propertyId) {
      if (!title || title.trim().length < 5) {
        alert('Please enter a title first');
        return;
      }
      try {
        const draftId = await ensureDraft();
        if (!draftId) {
          alert('Failed to create property draft');
          return;
        }
        propertyId = draftId;
      } catch (error) {
        alert('Failed to create property draft');
        return;
      }
    }
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const uploadedUrls: string[] = [];
      
      for (const originalFile of Array.from(files)) {
        // Check file size and compress if needed
        let fileToUpload = originalFile;
        if (originalFile.size > 1024 * 1024) { // > 1MB
          fileToUpload = await compressImage(originalFile);
        }
        
        const path = `${user.id}/${propertyId}/${Date.now()}-${fileToUpload.name}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, fileToUpload, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = await supabase.storage
          .from(BUCKET)
          .getPublicUrl(path);
        const url = pub.publicUrl;
        uploadedUrls.push(url);
        // insert into property_images table (surface any RLS/validation errors)
        const { error: insertErr } = await supabase
          .from('property_images')
          .insert({ property_id: propertyId, url, alt: fileToUpload.name, is_approved: true });
        if (insertErr) {
          // Stop early and let the user know exactly what failed
          alert(`Album insert failed: ${insertErr.message}`);
          // Attempt to continue uploading remaining files but do not assume DB row exists
        }
      }
      // refresh approved images
      let { data, error } = await supabase
        .from('property_images')
        .select('id,url,is_approved,sort_order,created_at,updated_at')
        .eq('property_id', propertyId)
        .eq('is_approved', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) {
        const fb = await supabase
          .from('property_images')
          .select('id,url,is_approved,sort_order')
          .eq('property_id', propertyId)
          .eq('is_approved', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });
        data = fb.data as any;
      }
      setApprovedImages((data ?? []) as unknown as ApprovedImageRow[]);
      // Auto-set cover if requested or if property currently has no cover
      if (uploadedUrls[0]) {
        if (setAsCover) {
          await applyCoverImage(uploadedUrls[0]);
        } else {
          // Check if the property has a cover set; if not, set first uploaded
          const { data: propRow } = await supabase
            .from('properties')
            .select('cover_image_url')
            .eq('id', propertyId)
            .single();
          if (!propRow?.cover_image_url) {
            await applyCoverImage(uploadedUrls[0]);
          }
        }
      }
      // Ensure UI reflects updates
      await refresh();
      // Success toast for upload flow
      setToast({ msg: uploadedUrls.length > 1 ? 'Images uploaded' : 'Image uploaded', kind: 'success' });
      setTimeout(() => setToast(null), 2500);
    } finally {
      setLoading(false);
    }
  }

  // Publish badges (computed from real data when available)
  const publishChips = useMemo(() => {
    const fmt = (dateStr?: string | null) => {
      if (!dateStr) return '—';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString();
    };
    const current = myProps.find((p) => p.id === selectedId);
    const googleSet = googleMapsUrl ? "Set" : "Missing";
    // latest photo updated/created
    let latestPhotoDate: string | null = null;
    for (const img of approvedImages) {
      const cand = img.updated_at || img.created_at || null;
      if (!cand) continue;
      if (!latestPhotoDate || new Date(cand) > new Date(latestPhotoDate)) latestPhotoDate = cand;
    }
    const createdAt = fmt(current?.created_at ?? null);
    const updatedAt = fmt(current?.updated_at ?? null);
    const photoUpdated = fmt(latestPhotoDate);
    const published = current?.is_published ? 'Yes' : '—';
    return [
      `Created ${createdAt} • Edited ${updatedAt}`,
      `Published ${published} • URL ${googleSet}`,
      `Photos ${photoUpdated}`,
    ];
  }, [approvedImages, googleMapsUrl, myProps, selectedId]);

  // Publish controls
  const canPublish = useMemo(() => {
    // Google Maps URL NOT required. Require a selected property and at least one approved image.
    return Boolean(selectedId && approvedImages.length > 0);
  }, [selectedId, approvedImages]);

  const togglePublish = async (next: boolean) => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        is_published: next,
      };
      const { error } = await supabase
        .from('properties')
        .update(payload)
        .eq('id', selectedId);
      if (error) throw error;
      await refresh();
      dispatchPropertiesRefresh();
      setToast({ msg: next ? 'Property published' : 'Property unpublished', kind: 'success' });
      setTimeout(() => setToast(null), 2000);
    } catch (e: any) {
      alert(e?.message || (next ? 'Failed to publish property' : 'Failed to unpublish property'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="bg-white rounded-2xl border border-gray-200/50 p-4 space-y-4 pointer-events-auto relative z-0"
      role="region"
      onInput={() => {
        if (!hasMarkedDirty.current) {
          hasMarkedDirty.current = true;
          setIsDirty(true);
          onDirtyChange?.(true);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          // Submit on Enter; in step 1 go to step 2 for create, save for edit
          e.preventDefault();
          if (loading) return;
          if (step === 2) {
            void handleSave();
          } else if (step === 1) {
            if (isEdit) void handleSave();
            else setStep(2);
          }
        }
      }}
    >
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 left-4 z-[70] px-3 py-2 rounded-md shadow-md text-sm border ${toast.kind === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`} role="status" aria-live="polite">
          {toast.msg}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Create or Edit Property</h3>
        <button
          className="text-xs px-2 py-1 rounded border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition"
          onClick={() => loadIntoForm(undefined)}
        >New</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: wizard content */}
        <div className="space-y-3 relative z-50">
          {/* Step header */}
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-1 rounded ${step === 1 ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-600'}`}>Step 1</span>
            <span className={`px-2 py-1 rounded ${step === 2 ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-600'}`}>Step 2</span>
          </div>

          {step === 1 ? (
            <>
              <label className="text-sm">Title
                <input
                  className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., 995 N Leighton Dr, Baton Rouge, LA 70806"
                  aria-describedby="title-hint"
                  autoFocus
                />
                <div id="title-hint" className="mt-1 text-xs text-gray-500">Use the full address as the public title. This helps match bookings and display on the homepage.</div>
              </label>
              <label className="text-sm">Description
                <textarea className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
              </label>
              <label className="text-sm">Address
                <input className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" value={address} onChange={e => setAddress(e.target.value)} />
              </label>
              <label className="text-sm">Nightly Price ($)
                <input
                  type="number"
                  className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2"
                  value={nightlyPrice}
                  onChange={e => setNightlyPrice(Number(e.target.value))}
                  min={0}
                  aria-describedby="price-hint"
                />
                <div id="price-hint" className="mt-1 text-xs text-gray-500">If left blank, we default to $150/night.</div>
              </label>
              <label className="text-sm">Minimum nights per booking
                <input
                  type="number"
                  className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2"
                  value={resolvedMinimumNights}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setMinimumNights(Number.isFinite(next) && next > 0 ? next : 1);
                  }}
                  min={1}
                  aria-describedby="minimum-nights-hint"
                />
                <div id="minimum-nights-hint" className="mt-1 text-xs text-gray-500">Leave at 1 to allow single-night stays. Higher values update the displayed stay price automatically.</div>
              </label>
              <label className="text-sm">Bedrooms
                <input
                  type="number"
                  className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2"
                  value={bedrooms}
                  onChange={e => setBedrooms(Number(e.target.value))}
                  min={0}
                  aria-describedby="max-guests-hint"
                />
                <div id="max-guests-hint" className="mt-1 text-xs text-gray-500">Max guests auto-calculated as bedrooms × 2 for booking limit.</div>
              </label>
              <label className="text-sm">Bathrooms
                <input type="number" className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" value={bathrooms} onChange={e => setBathrooms(Number(e.target.value))} />
              </label>
              <label className="text-sm">Square Feet
                <input type="number" className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" value={sqft as number} onChange={e => setSqft(e.target.value === "" ? "" : Number(e.target.value))} />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm">Weekly discount (%)
                  <input type="number" className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" value={weeklyDiscountPct} onChange={e => setWeeklyDiscountPct(Number(e.target.value))} />
                </label>
                <label className="text-sm">Weekly price ($/night)
                  <input type="number" className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" value={weeklyPrice} onChange={e => setWeeklyPrice(Number(e.target.value))} />
                </label>
                <label className="text-sm">Monthly discount (%)
                  <input type="number" className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" value={monthlyDiscountPct} onChange={e => setMonthlyDiscountPct(Number(e.target.value))} />
                </label>
                <label className="text-sm">Monthly price ($/night)
                  <input type="number" className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" value={monthlyPrice} onChange={e => setMonthlyPrice(Number(e.target.value))} />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm">Proximity badge 1
                  <input className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" placeholder="e.g., 5 min to General Hospital" maxLength={60} value={proximityBadge1} onChange={e => setProximityBadge1(e.target.value)} />
                </label>
                <label className="text-sm">Proximity badge 2
                  <input className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" placeholder="e.g., 10 min to LSU" maxLength={60} value={proximityBadge2} onChange={e => setProximityBadge2(e.target.value)} />
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!step1Ready || loading}
                  className={`px-4 py-2 rounded-md text-white ${step1Ready ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 disabled:opacity-50'} `}
                  title={step1Ready ? 'Proceed to Step 2' : 'Complete basics and add at least one photo to continue'}
                >Next</button>
                {selectedId && (
                  <button type="button" onClick={handleSave} disabled={loading} className="px-4 py-2 rounded-md border disabled:opacity-60 flex items-center gap-2">
                    {loading && (
                      <svg className="h-4 w-4 animate-spin text-gray-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                    )}
                    {loading ? 'Saving…' : 'Save'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Host derived */}
              <div className="flex items-center gap-3 p-2 border border-gray-200/50 rounded-md bg-gray-50">
                <Image src={hostAvatarDerived || "/images/placeholder/avatar.png"} alt="host avatar" width={40} height={40} className="w-10 h-10 rounded-full object-cover" unoptimized />
                <div className="text-sm">
                  <div className="font-medium">{hostNameDerived || hostName || "Host"}</div>
                  {hostJoinedYear && <div className="text-xs text-gray-600">Host since {hostJoinedYear}</div>}
                </div>
              </div>

              <label className="text-sm">About the space
                <textarea className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" rows={3} value={aboutSpace} onChange={e => setAboutSpace(e.target.value)} />
              </label>
              <label className="text-sm">The indoor & outdoor experiences
                <textarea className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2" rows={3} value={professionalsDesc} onChange={e => setProfessionalsDesc(e.target.value)} />
              </label>

              {/* Amenity badges */}
              <div>
                <div className="text-sm font-medium mb-1">What this place offers</div>
                <div className="flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map((label) => {
                    const active = selectedAmenities.has(label);
                    return (
                      <button
                        type="button"
                        key={label}
                        onClick={() => {
                          const next = new Set(selectedAmenities);
                          if (next.has(label)) next.delete(label); else next.add(label);
                          setSelectedAmenities(next);
                        }}
                        className={`px-3 py-1 rounded-full text-xs border ${active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                        title={label}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cleaning fee */}
              <div className="mt-2">
                <label className="text-sm">Cleaning fee (% of subtotal)</label>
                <div className="mt-1 flex items-center gap-2">
                  <button type="button" className="px-2 py-1 border border-gray-300/50 rounded" onClick={() => setCleaningFeePct(Math.max(0, cleaningFeePct - 1))}>-</button>
                  <input
                    type="number"
                    className="w-24 border border-gray-300/50 rounded-md px-3 py-2"
                    value={cleaningFeePct}
                    onChange={e => setCleaningFeePct(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    title="Cleaning fee percentage"
                    aria-label="Cleaning fee percentage"
                  />
                  <button type="button" className="px-2 py-1 border border-gray-300/50 rounded" onClick={() => setCleaningFeePct(cleaningFeePct + 1)}>+</button>
                </div>
              </div>

              {/* Google Maps URL input */}
              <div className="mt-3">
                <label className="text-sm block">Google Maps URL
                  <input
                    className="mt-1 w-full border border-gray-300/50 rounded-md px-3 py-2"
                    placeholder="https://maps.google.com/..."
                    value={googleMapsUrl}
                    onChange={(e) => {
                      setGoogleMapsUrl(e.target.value);
                      setMapError(null);
                    }}
                    onBlur={() => {
                      if (selectedId) void saveMapUrl(googleMapsUrl.trim());
                    }}
                    disabled={!selectedId}
                  />
                </label>
                <p className="mt-1 text-xs text-gray-500">Paste a Google Maps share link for this property. Optional but recommended.</p>
                {!selectedId && (
                  <p className="mt-1 text-xs text-amber-600">Save the property first to enable the map link.</p>
                )}
                {mapError && (
                  <p className="mt-1 text-xs text-red-600">{mapError}</p>
                )}
                {!mapError && mapSaving && (
                  <p className="mt-1 text-xs text-gray-500">Saving…</p>
                )}
                {!mapError && !mapSaving && mapSavedAt && (
                  <p className="mt-1 text-xs text-emerald-700">Saved.</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <a
                    className={`text-xs underline ${isValidMapsUrl(googleMapsUrl) ? 'text-blue-600' : 'text-gray-400 pointer-events-none'}`}
                    href={isValidMapsUrl(googleMapsUrl) ? googleMapsUrl : undefined}
                    target="_blank"
                    rel="noreferrer"
                  >Test Link</a>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button type="button" onClick={() => setStep(1)} disabled={loading} className="px-4 py-2 rounded-md border disabled:opacity-60">Back</button>
                <button
                  onClick={handleSave}
                  disabled={!step2Ready || loading}
                  className={`px-4 py-2 rounded-md text-white flex items-center gap-2 ${step2Ready ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 disabled:opacity-50'}`}
                  title={step2Ready ? 'Create Property' : 'Add a valid Google Maps URL and at least one photo to enable'}
                >
                  {loading && (
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                  )}
                  {loading ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Property')}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: previews & media depending on step */}
        <div className="space-y-4">
          {step === 1 && (
            <div className="space-y-2">
              <h4 className="font-medium">Homepage card preview</h4>
              <div className="border border-gray-200/50 rounded-xl overflow-hidden bg-white shadow-sm relative z-0">
                <div className="aspect-video bg-gray-100 pointer-events-none relative">
                  {displayImageUrl ? (
                    <img src={displayImageUrl} alt="preview" className="absolute inset-0 w-full h-full object-cover" decoding="async" loading="eager" />
                  ) : (
                    <span className="sr-only">No preview</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900 truncate">{title || 'Untitled'}</div>
                  </div>
                  {address && address.trim() !== (title || '').trim() && (
                    <div className="text-xs text-gray-600 mt-1 truncate">{address}</div>
                  )}
                  {description && (<div className="text-xs text-gray-700 mt-1 line-clamp-2">{description}</div>)}
                  {(proximityBadge1 || proximityBadge2) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {proximityBadge1 && <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200">{proximityBadge1}</span>}
                      {proximityBadge2 && <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200">{proximityBadge2}</span>}
                    </div>
                  )}
                  <div className="text-sm text-gray-900 mt-1">
                    From {previewMinimumSubtotalLabel} for {resolvedMinimumNights}{' '}
                    {resolvedMinimumNights === 1 ? 'night' : 'nights'}
                  </div>
                  <div className="text-xs text-gray-500">Base rate {previewNightlyRateLabel} / night</div>
                  <div className="text-xs text-emerald-700 mt-1">{`7+ nights: ${weeklyDiscountPct}% off - $${weeklyPrice}/night`}</div>
                  <div className="text-xs text-emerald-700">{`Monthly: ${monthlyDiscountPct}% off - $${monthlyPrice}/night`}</div>
                  <div className="text-xs text-gray-500 mt-1">{bedrooms} bd • {bathrooms} ba • {sqft || 0} sqft</div>
                </div>
              </div>

              {/* Media controls (Step 1) */}
              <div className="flex items-center gap-2 relative z-50">
                <input
                  id="cover-upload-input"
                  ref={coverInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  title="Upload or replace cover image"
                  aria-label="Upload or replace cover image"
                  onChange={(e) => e.target.files && uploadImages(e.target.files, true)}
                />
                <input
                  id="gallery-upload-input"
                  ref={galleryInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  title="Upload gallery images"
                  aria-label="Upload gallery images"
                  onChange={(e) => e.target.files && uploadImages(e.target.files, false)}
                />
                <label
                  htmlFor="cover-upload-input"
                  className="px-3 py-2 rounded-md border text-sm cursor-pointer select-none relative z-50"
                >Add/Replace cover</label>
                <label
                  htmlFor="gallery-upload-input"
                  className="px-3 py-2 rounded-md border text-sm cursor-pointer select-none relative z-50"
                >Add images</label>
              </div>
              {!selectedId && (
                <p className="text-xs text-amber-600">Tip: enter a Title to auto-create a draft and unlock uploads.</p>
              )}

              {/* Photo album grid (2 x 5) with drag & drop */}
              <div className="mt-3">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-medium">Photo album</h4>
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
                    onClick={() => setAlbumModalOpen(true)}
                  >View all</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {Array.from({ length: 10 }).map((_, idx) => {
                    const img = approvedImages[idx];
                    return (
                      <div
                        key={idx}
                        className="relative"
                        draggable={!!img}
                        onDragStart={() => setDraggingIndex(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggingIndex === null || draggingIndex === idx) return;
                          const next = arrayMove(approvedImages, draggingIndex, idx);
                          setApprovedImages(next);
                          setDraggingIndex(null);
                          void persistSortOrderLocal(next);
                          // Set cover to the first image after reorder
                          if (next[0]) void applyCoverImage(next[0].url);
                        }}
                      >
                        {img ? (
                          <button
                            type="button"
                            onClick={() => applyCoverImage(img.url)}
                            className={`relative block w-full aspect-[4/3] overflow-hidden rounded-md border ${displayImageUrl === img.url ? 'border-blue-500' : 'border-gray-200'}`}
                            title={displayImageUrl === img.url ? 'Current cover' : 'Click to set as cover'}
                            aria-label={displayImageUrl === img.url ? 'Current cover image' : 'Set as cover image'}
                          >
                            <img src={img.url} alt={`album ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover" decoding="async" loading="lazy" />
                            {displayImageUrl === img.url && (
                              <span className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded">Cover</span>
                            )}
                          </button>
                        ) : (
                          <label
                            htmlFor="gallery-upload-input"
                            className="flex items-center justify-center w-full aspect-[4/3] rounded-md border border-dashed border-gray-300 text-xs text-gray-500 hover:border-gray-400 cursor-pointer select-none"
                          >
                            + Add photo
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-gray-500">Add interior and exterior photos. These appear in the property details carousel after publishing.</p>
              </div>

              {/* View all modal */}
              {albumModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setAlbumModalOpen(false)} />
                  <div className="relative bg-white rounded-lg shadow-xl w-[95vw] max-w-5xl max-h-[85vh] flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b">
                      <h3 className="font-semibold">All photos</h3>
                      <button
                        type="button"
                        className="px-2 py-1 text-sm rounded border hover:bg-gray-50"
                        onClick={() => setAlbumModalOpen(false)}
                        aria-label="Close"
                      >Close</button>
                    </div>
                    <div className="p-4 overflow-auto">
                      {approvedImages.length === 0 ? (
                        <p className="text-sm text-gray-500">No photos yet. Upload images to build your album.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {approvedImages.map((img, idx) => (
                            <div
                              key={img.id}
                              className="relative group"
                              draggable
                              onDragStart={() => setDraggingIndex(idx)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggingIndex === null || draggingIndex === idx) return;
                                const next = arrayMove(approvedImages, draggingIndex, idx);
                                setApprovedImages(next);
                                setDraggingIndex(null);
                                void persistSortOrderLocal(next);
                                if (next[0]) void applyCoverImage(next[0].url);
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => applyCoverImage(img.url)}
                                className={`relative block w-full aspect-[4/3] overflow-hidden rounded-md border ${displayImageUrl === img.url ? 'border-blue-500' : 'border-gray-200'}`}
                                title={displayImageUrl === img.url ? 'Current cover' : 'Click to set as cover'}
                                aria-label={displayImageUrl === img.url ? 'Current cover image' : 'Set as cover image'}
                              >
                                <Image src={img.url} alt={`album all ${idx + 1}`} fill className="w-full h-full object-cover" unoptimized />
                                {displayImageUrl === img.url && (
                                  <span className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded">Cover</span>
                                )}
                              </button>
                              <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1 flex gap-1">
                                <button
                                  type="button"
                                  className="pointer-events-auto text-[11px] px-2 py-1 rounded bg-white/90 border hover:bg-white"
                                  onClick={() => startReplace(img)}
                                  aria-label="Replace image"
                                >Replace</button>
                                <button
                                  type="button"
                                  className="pointer-events-auto text-[11px] px-2 py-1 rounded bg-white/90 border text-red-600 hover:bg-white"
                                  onClick={() => deleteImage(img)}
                                  aria-label="Delete image"
                                >Delete</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="p-3 border-t text-right">
                      <button
                        type="button"
                        className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
                        onClick={() => setAlbumModalOpen(false)}
                      >Done</button>
                    </div>
                  </div>
                </div>
              )}
              {/* Hidden input for replace action */}
              <input
                ref={replaceInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                title="Replace selected image"
                onChange={(e) => e.target.files && handleReplaceFile(e.target.files)}
              />
            </div>
          )}

          {step === 2 && (
            <>
              {/* Publish status badges */}
              <div>
                <ul className="grid grid-cols-2 gap-2">
                  {publishChips.map((text) => (
                    <li key={text} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs border border-gray-200 text-gray-600 bg-transparent">
                      {text}
                    </li>
                  ))}
                </ul>
                {/* Publish/Unpublish control */}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className={`px-3 py-2 rounded-md text-sm border ${canPublish ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'}`}
                    onClick={() => togglePublish(true)}
                    disabled={!canPublish || loading}
                    title={!canPublish ? 'Add at least one approved photo to publish' : 'Publish property'}
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 rounded-md text-sm border bg-white hover:bg-gray-50"
                    onClick={() => togglePublish(false)}
                    disabled={!selectedId || loading}
                    title="Unpublish property"
                  >
                    Unpublish
                  </button>
                </div>
              </div>

              {/* Hero Preview */}
              <div className="space-y-2">
                <h4 className="font-medium">Property details hero preview</h4>
                <div className="rounded-xl overflow-hidden border border-gray-200/50 bg-white">
                  <div className="aspect-[16/9] bg-gray-100 relative">
                    {displayImageUrl ? (
                      <img src={displayImageUrl} alt="hero preview" className="absolute inset-0 w-full h-full object-cover" decoding="async" loading="eager" />
                    ) : (
                      <span className="sr-only">No hero preview</span>
                    )}
                  </div>
                  <div className="p-4">
                  <div className="text-sm text-gray-600">{address || (title ? 'Address to be added' : 'Title & address to be added')}</div>
                </div>
                </div>

              {/* Step 2 media controls & thumbnails (mirror step 1) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!selectedId || loading}
                  onClick={() => coverInputRef.current?.click()}
                  className="px-3 py-2 rounded-md border text-sm disabled:opacity-50"
                >{selectedId ? 'Add/Replace cover' : 'Add/Replace cover (save first)'}</button>
                <button
                  type="button"
                  disabled={!selectedId || loading}
                  onClick={() => galleryInputRef.current?.click()}
                  className="px-3 py-2 rounded-md border text-sm disabled:opacity-50"
                >{selectedId ? 'Add images' : 'Add images (save first)'}</button>
              </div>
              {approvedImages.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                    {approvedImages.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => applyCoverImage(img.url)}
                        className={`relative flex-shrink-0 w-28 h-20 rounded-md overflow-hidden border ${displayImageUrl === img.url ? 'border-blue-500' : 'border-gray-200'}`}
                      >
                        <img src={img.url} alt="thumb" className="absolute inset-0 w-full h-full object-cover" decoding="async" loading="lazy" />
                        {displayImageUrl === img.url && (
                          <span className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded">Cover</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              </div>

              {/* Availability calendar (block dates) */}
              <CalendarBlocker blockedDates={blockedDates} onToggle={onToggleBlocked} />
            </>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">My Properties</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {loading && <div className="text-sm text-gray-500">Loading...</div>}
          {!loading && myProps.length === 0 && (
            <div className="text-sm text-gray-500">No properties yet. Create your first above.</div>
          )}
          {myProps.map((p) => (
            <div
              key={p.id}
              className={`group relative flex items-center gap-3 rounded-lg border p-3 hover:bg-gray-50 ${selectedId === p.id ? 'border-blue-500' : 'border-gray-200'}`}
            >
              {/* Cover thumbnail */}
              <div className="relative w-16 h-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                {p.cover_image_url ? (
                  <img src={p.cover_image_url} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <span className="sr-only">No cover</span>
                )}
              </div>
              {/* Text content */}
              <button onClick={() => loadIntoForm(p)} className="flex-1 text-left">
                <div className="text-sm font-medium line-clamp-1">{p.title}</div>
                <div className="text-xs text-gray-600 line-clamp-1">{p.address}</div>
                <div className="text-xs text-gray-500 mt-1">{p.bedrooms} bd • {p.bathrooms} ba</div>
                <div className={`text-[11px] mt-1 ${p.is_published ? 'text-green-600' : 'text-amber-600'}`}>{p.is_published ? 'Published' : 'Unpublished'}</div>
              </button>
              {/* Trash icon */}
              <button
                type="button"
                onClick={() => deletePropertyAndAssets(p)}
                title="Delete property"
                aria-label="Delete property"
                className="opacity-70 hover:opacity-100 text-red-600 p-1 rounded-md hover:bg-red-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-1 1v1H5.5a1 1 0 100 2H6v13a3 3 0 003 3h6a3 3 0 003-3V6h.5a1 1 0 100-2H16V3a1 1 0 00-1-1H9zm7 4H8v13a1 1 0 001 1h6a1 1 0 001-1V6zM9 9a1 1 0 012 0v8a1 1 0 11-2 0V9zm5-1a1 1 0 00-1 1v8a1 1 0 102 0V9a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>

  );
}

// Lightweight calendar blocker for Step 2
function CalendarBlocker({
  blockedDates,
  onToggle,
}: {
  blockedDates: Set<string>;
  onToggle: (iso: string, nextActive: boolean) => void | Promise<void>;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthStartWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks: Array<Array<number | null>> = [];
  let currentWeek: Array<number | null> = new Array(monthStartWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const fmt = (y: number, m: number, d: number) =>
    new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);

  const toggle = (d: number) => {
    const iso = fmt(year, month, d);
    const nextActive = !blockedDates.has(iso);
    void onToggle(iso, nextActive);
  };

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-2">
      <h4 className="font-medium">Availability calendar</h4>
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          className="px-2 py-1 border border-gray-300/50 rounded"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          aria-label="Previous month"
          title="Previous month"
        >
          ←
        </button>
        <div className="text-sm text-gray-700 min-w-[140px] text-center">{monthLabel}</div>
        <button
          type="button"
          className="px-2 py-1 border border-gray-300/50 rounded"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label="Next month"
          title="Next month"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[11px] text-gray-600">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
          <div key={d} className="px-1 py-1 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flatMap((w, wi) =>
          w.map((d, di) => {
            if (!d) return <div key={`${wi}-${di}`} className="h-8" />;
            const iso = fmt(year, month, d);
            const active = blockedDates.has(iso);
            if (active) {
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => toggle(d)}
                  className="h-8 text-sm rounded border bg-rose-50 text-rose-700 border-rose-200/60"
                  aria-pressed="true"
                  aria-label={`Toggle ${iso}`}
                  title={`Unavailable: ${iso}`}
                >
                  {d}
                </button>
              );
            }
            return (
              <button
                key={iso}
                type="button"
                onClick={() => toggle(d)}
                className="h-8 text-sm rounded border bg-white text-gray-800 border-gray-200/50"
                aria-pressed="false"
                aria-label={`Toggle ${iso}`}
                title={`Available: ${iso}`}
              >
                {d}
              </button>
            );
          })
        )}
      </div>
      <div className="text-xs text-gray-600">Click dates to toggle unavailable. These dates will disable booking for guests on those days.</div>
      <div className="text-xs text-gray-500">Changes save instantly.</div>
    </div>
  );
}
