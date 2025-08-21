"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/portal/Icon";
// removed router usage for minimal UI

interface Property {
  id: string;
  name: string;
  address: string;
  status: 'draft' | 'published' | 'archived';
  image_url: string | null;
  unit_count: number;
}

interface PropertySwitcherProps {
  currentPropertyId: string | null;
  onPropertySelect: (id: string) => void;
  className?: string;
  searchQuery?: string; // optional controlled search value
  onSearchChange?: (q: string) => void; // optional controlled change handler
}

export function PropertySwitcher({ 
  currentPropertyId, 
  onPropertySelect,
  className = '',
  searchQuery,
  onSearchChange,
}: PropertySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // compute effective search value (controlled or uncontrolled)
  const effectiveSearch = typeof searchQuery === 'string' ? searchQuery : localSearch;

  // Fetch properties from Supabase
  useEffect(() => {
    async function fetchProperties() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProperties(data || []);
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProperties();
  }, [supabase]);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handlePointer = (e: MouseEvent | TouchEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer, { passive: true });
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer as any);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  // Filter properties based on search query
  const filteredProperties = useMemo(() => {
    if (!effectiveSearch.trim()) return properties;
    
    const query = effectiveSearch.toLowerCase();
    return properties.filter(
      (property) =>
        property.name.toLowerCase().includes(query) ||
        property.address.toLowerCase().includes(query) ||
        property.status.toLowerCase().includes(query)
    );
  }, [properties, effectiveSearch]);

  // Get current property
  const currentProperty = useMemo(() => {
    return properties.find((p) => p.id === currentPropertyId) || null;
  }, [properties, currentPropertyId]);

  const handleSelect = (propertyId: string) => {
    onPropertySelect(propertyId);
    setIsOpen(false);
    if (onSearchChange) onSearchChange(''); else setLocalSearch('');
  };

  // Removed create new action from switcher to avoid duplication with header button

  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center gap-2 px-3 h-9 text-sm bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50">
          <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse" />
          <Icon name="chevron-down" className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 h-9 text-sm text-left bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        aria-haspopup="listbox"
        aria-expanded="true"
        aria-labelledby="property-selector"
      >
        <div className="flex items-center min-w-0">
          {currentProperty ? (
            <>
              <div className="flex-shrink-0 w-6 h-6 overflow-hidden rounded-full bg-gray-100">
                {currentProperty.image_url ? (
                  <img 
                    src={currentProperty.image_url} 
                    alt="" 
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Icon name="home" className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              <span className="ml-2 text-sm font-medium text-gray-900 truncate">
                {currentProperty.name}
              </span>
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800">
                {currentProperty.status}
              </span>
            </>
          ) : (
            <span className="text-sm font-medium text-gray-500">Select a property</span>
          )}
        </div>
        <Icon 
          name={isOpen ? "chevron-up" : "chevron-down"} 
          className="w-4 h-4 text-gray-400" 
          aria-hidden="true"
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Icon name="search" className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full py-2 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-500 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Search properties..."
                value={effectiveSearch}
                onChange={(e) => (onSearchChange ? onSearchChange(e.target.value) : setLocalSearch(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>

          <div className="py-1 max-h-60 overflow-auto">
            {filteredProperties.length > 0 ? (
              filteredProperties.map((property) => (
                <button
                  key={property.id}
                  type="button"
                  className={`flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 ${
                    property.id === currentPropertyId ? 'bg-gray-50 text-emerald-700' : 'text-gray-700'
                  }`}
                  onClick={() => handleSelect(property.id)}
                >
                  <div className="flex-shrink-0 w-6 h-6 overflow-hidden rounded-full bg-gray-100">
                    {property.image_url ? (
                      <img 
                        src={property.image_url} 
                        alt="" 
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 text-gray-400 flex items-center justify-center">
                        <Icon name="home" className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div className="ml-2 min-w-0">
                    <div className="flex items-center">
                      <p className="font-medium truncate">{property.name}</p>
                      <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                        property.status === 'published' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : property.status === 'draft'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {property.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{property.address}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-center text-gray-500">
                No properties found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
