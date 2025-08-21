"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PropertyCard } from "./PropertyCard";
import Icon from "./Icon";

interface PropertyListViewProps {
  onPropertySelect: (id: string) => void;
  selectedPropertyId: string | null;
  className?: string;
  refreshToken?: number;
  searchQuery?: string;
}

interface Property {
  id: string;
  name: string;
  address: string;
  status: 'draft' | 'published' | 'archived';
  image_url: string | null;
  unit_count: number;
  created_at: string;
}

export function PropertyListView({
  onPropertySelect,
  selectedPropertyId,
  className = '',
  refreshToken,
  searchQuery = '',
}: PropertyListViewProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const supabase = createClient();

  // Fetch properties from Supabase
  const fetchProperties = useCallback(async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('properties')
        .select('*');

      // Apply search
      if (searchQuery.trim()) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      // Default ordering
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setProperties(data || []);
      // Prune selections that no longer exist
      setSelectedIds((prev) => {
        const next = new Set<string>();
        (data || []).forEach((p) => { if (prev.has(p.id)) next.add(p.id); });
        return next;
      });
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setIsLoading(false);
      // no-op
    }
  }, [searchQuery, supabase]);

  // Initial fetch and external refresh triggers
  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProperties, refreshToken]);

  // (Removed manual refresh UI) Fetch is triggered by search/refreshToken

  // Bulk actions (publish/archive/restore)
  const handleBulkAction = async (action: 'publish' | 'archive' | 'restore') => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      let update: Record<string, any> = {};
      if (action === 'publish') update = { status: 'published' };
      if (action === 'archive') update = { status: 'archived' };
      if (action === 'restore') update = { status: 'draft' };

      const { error } = await supabase.from('properties').update(update).in('id', ids);
      if (error) throw error;

      setSelectedIds(new Set());
      fetchProperties();
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
  const handlePropertyAction = async (action: string, propertyId: string) => {
    try {
      if (action === 'publish') {
        await supabase
          .from('properties')
          .update({ status: 'published' })
          .eq('id', propertyId);
      } else if (action === 'archive') {
        await supabase
          .from('properties')
          .update({ status: 'archived' })
          .eq('id', propertyId);
      } else if (action === 'restore') {
        await supabase
          .from('properties')
          .update({ status: 'draft' })
          .eq('id', propertyId);
      }
      
      // Refresh the list
      fetchProperties();
    } catch (error) {
      console.error(`Error ${action} property:`, error);
    }
  };

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
      {isLoading ? (
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
          {properties.map((property) => (
            <div key={property.id} className="relative min-w-[260px]">
              {/* Selection checkbox */}
              <label className="absolute top-2 left-2 z-10 inline-flex items-center bg-white/90 backdrop-blur rounded-md px-1.5 py-1 shadow-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  checked={selectedIds.has(property.id)}
                  onChange={() => toggleSelect(property.id)}
                  aria-label={`Select ${property.name}`}
                />
              </label>
              <PropertyCard
                id={property.id}
                name={property.name}
                address={property.address}
                status={property.status}
                imageUrl={property.image_url}
                unitCount={property.unit_count}
                isSelected={selectedPropertyId === property.id}
                onSelect={onPropertySelect}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Icon name="home" className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No properties found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new property.</p>
          <div className="mt-6">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              onClick={() => {}}
            >
              <Icon name="plus" className="-ml-1 mr-2 h-5 w-5" />
              New Property
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
