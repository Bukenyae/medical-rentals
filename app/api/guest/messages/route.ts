import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Expected table schema (example):
// table: guest_messages
// columns: id (uuid, default), room_key text, category text, message text,
//          created_at timestamptz default now(),
//          guest_id uuid (nullable),
//          meta jsonb (nullable)

export async function POST(request: Request) {
  try {
    const { roomKey, category, message, guestId, meta } = await request.json();

    if (!roomKey || !category || !message) {
      return NextResponse.json(
        { error: "Missing required fields: roomKey, category, message" },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Supabase server env vars not configured" },
        { status: 500 }
      );
    }

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("guest_messages")
      .insert({
        room_key: roomKey,
        category,
        message,
        guest_id: guestId ?? null,
        meta: meta ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Unknown error" }, { status: 500 });
  }
}
