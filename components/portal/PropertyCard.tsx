"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/portal/Icon";
import { useRouter } from "next/navigation";

export interface PropertyCardProps {
  id: string;
  name: string;
  address: string;
  status: 'draft' | 'published' | 'archived' | undefined;
  imageUrl?: string | null;
  unitCount?: number;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  className?: string;
}

export function PropertyCard({
  id,
  name,
  address,
  status,
  imageUrl,
  unitCount = 0,
  isSelected = false,
  onSelect,
  className = '',
}: PropertyCardProps) {
  const router = useRouter();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [metrics, setMetrics] = useState({
    activeBookings: 0,
    monthlyRevenue: 0,
    occupancyRate: 0,
    repeatBookings: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Fetch property metrics
  useEffect(() => {
    async function fetchMetrics() {
      try {
        setIsLoading(true);
        // Current month range
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1); // exclusive
        // Current year range
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearEnd = new Date(now.getFullYear() + 1, 0, 1); // exclusive

        // Fetch bookings overlapping current month, excluding cancelled
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('id, guest_id, check_in, check_out, total_amount, status')
          .eq('property_id', id)
          .neq('status', 'cancelled')
          .lte('check_in', end.toISOString().slice(0, 10))
          .gte('check_out', start.toISOString().slice(0, 10));

        if (error) throw error;

        const activeStatuses = new Set(['pending', 'confirmed', 'checked_in']);
        const activeBookings = (bookings ?? []).filter(b => activeStatuses.has(b.status as string)).length;

        // Revenue: sum total_amount for bookings with check_in in current month and completed/active
        const revenueStatuses = new Set(['confirmed', 'checked_in', 'checked_out']);
        const monthStartISO = start.toISOString().slice(0, 10);
        const monthEndISO = end.toISOString().slice(0, 10);
        const monthlyRevenue = (bookings ?? []).reduce((sum, b: any) => {
          const ci = b.check_in as string;
          if (revenueStatuses.has(b.status as string) && ci >= monthStartISO && ci < monthEndISO) {
            return sum + Number(b.total_amount || 0);
          }
          return sum;
        }, 0);

        // Occupancy: booked nights overlapping current month / total nights in month
        const daysInMonth = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const monthDates: [Date, Date] = [start, end];
        const bookedNights = (bookings ?? []).reduce((acc, b: any) => {
          const bi = new Date(b.check_in);
          const bo = new Date(b.check_out);
          const overlapStart = bi > monthDates[0] ? bi : monthDates[0];
          const overlapEnd = bo < monthDates[1] ? bo : monthDates[1];
          const diff = Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
          return acc + diff;
        }, 0);
        const occupancyRate = daysInMonth > 0 ? Math.round((bookedNights / daysInMonth) * 100) : 0;

        // Repeat Bookings (current year): count bookings in current year where guest had a prior stay at same property before year start
        const yearStartISO = yearStart.toISOString().slice(0, 10);
        const yearEndISO = yearEnd.toISOString().slice(0, 10);
        const currentYearBookings = (bookings ?? []).filter((b: any) => {
          const ci = (b.check_in as string) ?? '';
          return ci >= yearStartISO && ci < yearEndISO;
        });
        const guestIds = Array.from(new Set(currentYearBookings.map((b: any) => b.guest_id).filter(Boolean)));
        let repeatGuestIds = new Set<string>();
        if (guestIds.length > 0) {
          const { data: prior } = await supabase
            .from('bookings')
            .select('guest_id')
            .eq('property_id', id)
            .neq('status', 'cancelled')
            .lt('check_in', yearStartISO)
            .in('guest_id', guestIds as string[]);
          repeatGuestIds = new Set<string>((prior ?? []).map((p: any) => p.guest_id).filter(Boolean));
        }
        const repeatBookings = currentYearBookings.filter((b: any) => repeatGuestIds.has(b.guest_id)).length;

        setMetrics({ activeBookings, monthlyRevenue, occupancyRate, repeatBookings });
      } catch (error) {
        console.error('Error fetching property metrics:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetrics();
  }, [id, supabase]);

  const statusColors = {
    published: 'bg-emerald-100 text-emerald-800',
    draft: 'bg-amber-100 text-amber-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  const displayStatus: 'draft' | 'published' | 'archived' = (status ?? 'draft');

  const handleQuickAction = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Handle quick actions (publish, archive, etc.)
    console.log(`Action: ${action} for property ${id}`);
  };

  return (
    <div 
      className={`relative bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer ${isSelected ? 'ring-2 ring-emerald-500' : 'border-gray-200'} ${className}`}
      onClick={() => onSelect && onSelect(id)}
    >
      {/* Property Image */}
      <div className="aspect-video bg-gray-100 relative">
        {imageUrl ? (
          <>
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className={`object-cover transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              unoptimized
              priority={false}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                <Icon name="home" className="w-8 h-8 text-gray-300" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
            <Icon name="home" className="w-8 h-8 text-emerald-400" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[displayStatus]}`}>
          {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
        </div>
      </div>

      {/* Property Info */}
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-gray-900 truncate">{name}</h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{address}</p>
          </div>
          {/* Removed top-right pencil to let the title line breathe */}
        </div>

        {/* Metrics */}
        {!isLoading && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-900">{metrics.activeBookings}</div>
              <div className="text-xs text-gray-500">Bookings</div>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-900">{metrics.repeatBookings}</div>
              <div className="text-xs text-gray-500">Repeat Bookings</div>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-900">{metrics.occupancyRate}%</div>
              <div className="text-xs text-gray-500">Occupancy</div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="flex space-x-1">
            <button 
              onClick={(e) => handleQuickAction('calendar', e)}
              className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-md hover:bg-gray-50"
              aria-label="View calendar"
            >
              <Icon name="calendar" className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => handleQuickAction('messages', e)}
              className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-md hover:bg-gray-50"
              aria-label="Message"
            >
              <Icon name="messages" className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Consolidated: icon-only pencil opens full-screen editor */}
            <button
              onClick={(e) => { e.stopPropagation(); router.push(`/portal/host/properties/${id}/edit`); }}
              className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-md hover:bg-gray-50"
              aria-label="Edit property"
              title="Edit property"
            >
              <Icon name="pencil" className="w-4 h-4" />
            </button>
            {displayStatus === 'draft' && (
              <button
                onClick={(e) => handleQuickAction('publish', e)}
                className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
              >
                Publish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
