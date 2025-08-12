"use client";

import { useEffect } from "react";
import type {
  SupabaseClient,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

interface Options<T extends Record<string, any>> {
  table: string;
  filter?: string;
  onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void;
}

export default function useSupabaseRealtime<T extends Record<string, any>>(
  client: SupabaseClient | null,
  { table, filter, onInsert, onUpdate, onDelete }: Options<T>
) {
  useEffect(() => {
    if (!client) return;
    const channel = client
      .channel(`${table}-realtime`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter },
        (payload: RealtimePostgresChangesPayload<T>) => {
          if (payload.eventType === "INSERT") onInsert?.(payload);
          else if (payload.eventType === "UPDATE") onUpdate?.(payload);
          else if (payload.eventType === "DELETE") onDelete?.(payload);
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [client, table, filter, onInsert, onUpdate, onDelete]);
}

