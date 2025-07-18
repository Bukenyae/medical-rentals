import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * GET /api/messages/chat-sessions/[id]
 * Get a specific chat session with its messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const chatSessionId = params.id;
  
  try {
    // Get the chat session
    const { data: chatSession, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id, context, created_at, updated_at')
      .eq('id', chatSessionId)
      .single();
    
    if (sessionError) {
      throw sessionError;
    }
    
    // Get messages for this chat session
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        recipient_id,
        content,
        message_type,
        read_at,
        created_at,
        sender:sender_id(
          id,
          user_profiles(
            first_name,
            last_name,
            avatar_url
          )
        ),
        recipient:recipient_id(
          id,
          user_profiles(
            first_name,
            last_name,
            avatar_url
          )
        )
      `)
      .eq('chat_session_id', chatSessionId)
      .order('created_at', { ascending: true });
    
    if (messagesError) {
      throw messagesError;
    }
    
    return NextResponse.json({
      ...chatSession,
      messages
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to fetch chat session: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/messages/chat-sessions/[id]
 * Update a chat session's context
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const chatSessionId = params.id;
  
  try {
    const body = await request.json();
    const { context } = body;
    
    if (!context || typeof context !== 'object') {
      return NextResponse.json(
        { error: 'Valid context object is required' },
        { status: 400 }
      );
    }
    
    // Update the chat session context
    const { data: chatSession, error } = await supabase
      .from('chat_sessions')
      .update({ 
        context,
        updated_at: new Date().toISOString()
      })
      .eq('id', chatSessionId)
      .select('id, context, created_at, updated_at')
      .single();
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(chatSession);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to update chat session: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messages/chat-sessions/[id]
 * Delete a chat session and all its messages
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const chatSessionId = params.id;
  
  try {
    // Delete the chat session (messages will be deleted via cascade)
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', chatSessionId);
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to delete chat session: ${error.message}` },
      { status: 500 }
    );
  }
}