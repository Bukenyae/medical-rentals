"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { PropertyCard } from "./PropertyCard";
import Icon from "./Icon";
import {
  fetchHostProperties,
  PROPERTIES_REFRESH_EVENT,
  HostPropertyRecord,
  dispatchPropertiesRefresh,
} from "@/lib/queries/properties";

interface PropertyListViewProps {
  onPropertySelect: (id: string) => void;
  selectedPropertyId: string | null;
  className?: string;
  refreshToken?: number;
  searchQuery?: string;
  userId?: string | null;
  authLoading?: boolean;
}

export function PropertyListView({
  onPropertySelect,
  selectedPropertyId,
  className = '',
  refreshToken,
  searchQuery = '',
  userId,
  authLoading = false,
}: PropertyListViewProps) {
  const [properties, setProperties] = useState<HostPropertyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const supabase = useMemo(() => createClient(), []);
  const [imageCounts, setImageCounts] = useState<Record<string, number>>({});

  // Fetch properties from Supabase
  const fetchProperties = useCallback(async () => {
    if (authLoading) {
      setIsLoading(true);
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[PropertyListView] authLoading guard active');
      }
      return;
    }

    try {
      setIsLoading(true);

      let effectiveUserId = userId;
      if (!effectiveUserId) {
        const { data } = await supabase.auth.getUser();
        effectiveUserId = data.user?.id ?? null;
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[PropertyListView] supabase.auth.getUser() resolved', data.user?.id);
        }
      }

      if (!effectiveUserId) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[PropertyListView] No user id available, skipping fetch');
        }
        setProperties([]);
        setSelectedIds(new Set());
        setImageCounts({});
        return;
      }

      const allRows = await fetchHostProperties(supabase, effectiveUserId);
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[PropertyListView] fetched host properties', {
          effectiveUserId,
          count: allRows.length,
        });
      }
      const normalizedQuery = searchQuery.trim().toLowerCase();
      let rows = normalizedQuery
        ? allRows.filter((row) => {
            const haystack = `${row.title ?? ''} ${row.address ?? ''}`.toLowerCase();
            return haystack.includes(normalizedQuery);
          })
        : allRows;

      if (selectedPropertyId) {
        const selectedMatch = allRows.find((row) => row.id === selectedPropertyId);
        if (selectedMatch && !rows.some((row) => row.id === selectedMatch.id)) {
          rows = [selectedMatch, ...rows];
        }
      }

      setProperties(rows);
      setSelectedIds((prev) => {
        const next = new Set<string>();
        rows.forEach((p) => { if (prev.has(p.id)) next.add(p.id); });
        return next;
      });

      // Ensure the selected property is present even if owner filter excludes it (useful during reconciliation)
      const ids = rows.map(p => p.id);
      if (ids.length > 0) {
        const { data: imgs } = await supabase
          .from('property_images')
          .select('property_id')
          .in('property_id', ids)
          .eq('is_approved', true);
        const counts: Record<string, number> = {};
        (imgs || []).forEach((r: any) => {
          counts[r.property_id] = (counts[r.property_id] || 0) + 1;
        });
        setImageCounts(counts);
      } else {
        setImageCounts({});
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, searchQuery, selectedPropertyId, userId, authLoading]);

  // Initial fetch and external refresh triggers
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties, refreshToken, userId, authLoading]);

  useEffect(() => {
    const handler = () => {
      void fetchProperties();
    };
    window.addEventListener(PROPERTIES_REFRESH_EVENT, handler);
    return () => window.removeEventListener(PROPERTIES_REFRESH_EVENT, handler);
  }, [fetchProperties]);

  // Auto-select the first property after load when none is chosen
  useEffect(() => {
    if (!selectedPropertyId && !isLoading && properties.length > 0) {
      onPropertySelect(properties[0].id);
    }
  }, [properties, selectedPropertyId, onPropertySelect, isLoading]);

  // Bulk actions (publish/archive/restore)
  const handleBulkAction = async (action: 'publish' | 'archive' | 'restore') => {
    try {
      const ids = Array.from(selectedIds);
      let update: Record<string, any> = {};
      if (action === 'publish') update = { is_published: true, published_at: new Date().toISOString() };
      if (action === 'archive') update = { is_published: false };
      if (action === 'restore') update = { is_published: false };

      const { error } = await supabase.from('properties').update(update).in('id', ids);
      if (error) throw error;

      setSelectedIds(new Set());
      await fetchProperties();
      dispatchPropertiesRefresh();
    } catch (err) {
      console.error('Bulk action error:', err);
    }
  };

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isAllSelected = properties.length > 0 && properties.every((p) => selectedIds.has(p.id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (isAllSelected) return new Set();
      const next = new Set<string>();
      properties.forEach((p) => next.add(p.id));
      return next;
    });
  };

  // Handle property actions
  const handlePublish = async (property: HostPropertyRecord) => {
    try {
      const okToPublish = Boolean(property.map_url) && (imageCounts[property.id] || 0) > 0;
      if (!okToPublish) {
        alert('Add a valid Google Maps URL and at least one approved photo before publishing.');
        return;
      }
      const { error } = await supabase
        .from('properties')
        .update({ is_published: true, published_at: new Date().toISOString() })
        .eq('id', property.id);
      if (error) throw error;
      await fetchProperties();
      dispatchPropertiesRefresh();
    } catch (error) {
      console.error('Error publishing property:', error);
    }
  };

  const showSkeleton = isLoading && properties.length === 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filter/Sort/Refresh controls removed for minimal UI */}

      {/* Bulk actions toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              aria-label="Select all properties"
            />
            <span className="text-sm text-gray-700">
              {selectedIds.size} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('publish')}
              className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Publish
            </button>
            <button
              onClick={() => handleBulkAction('archive')}
              className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Archive
            </button>
            <button
              onClick={() => handleBulkAction('restore')}
              className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Restore to Draft
            </button>
          </div>
        </div>
      )}

      {/* Property Grid */}
      {showSkeleton ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
              <div className="aspect-video bg-gray-200"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : properties.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6">
          {properties.map((property, index) => (
            <div key={property.id} className="relative min-w-[260px]">
              {/* Selection checkbox */}
              <label className="absolute top-2 left-2 z-10 inline-flex items-center bg-white/90 backdrop-blur rounded-md px-1.5 py-1 shadow-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  checked={selectedIds.has(property.id)}
                  onChange={() => toggleSelect(property.id)}
                  aria-label={`Select ${property.title}`}
                />
              </label>
              <PropertyCard
                id={property.id}
                name={property.title ?? "Untitled listing"}
                address={property.address ?? "Address pending"}
                status={property.is_published ? 'published' : 'draft'}
                imageUrl={property.cover_image_url}
                imagePriority={index < 2}
                unitCount={0}
                isSelected={selectedPropertyId === property.id}
                onSelect={onPropertySelect}
                onPublish={() => handlePublish(property)}
                publishEnabled={Boolean(property.map_url) && (imageCounts[property.id] || 0) > 0}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Icon name="home" className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No properties found</h3>
          <p className="mt-1 text-sm text-gray-500">Use the “+ Property” button above to create your first property.</p>
        </div>
      )}
    </div>
  );
}
