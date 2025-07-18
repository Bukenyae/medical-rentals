import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * POST /api/messages/chat-sessions
 * Create a new chat session
 */
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { context = {} } = body;
    
    // Create a new chat session
    const { data: chatSession, error } = await supabase
      .from('chat_sessions')
      .insert({ context })
      .select('id, context, created_at')
      .single();
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(chatSession);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to create chat session: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/messages/chat-sessions
 * Get chat sessions for the current user
 */
export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userId = session.user.id;
  
  try {
    // Get all chat sessions where the user has participated
    const { data: chatSessions, error } = await supabase
      .from('chat_sessions')
      .select(`
        id,
        context,
        created_at,
        updated_at,
        messages:messages(
          id,
          sender_id,
          content,
          message_type,
          read_at,
          created_at
        )
      `)
      .order('updated_at', { ascending: false })
      .filter('messages.sender_id', 'eq', userId);
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(chatSessions);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to fetch chat sessions: ${error.message}` },
      { status: 500 }
    );
  }
}