import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * GET /api/chatbot/sessions/[id]
 * Get a chat session and its messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    // Get the session
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (sessionError) {
      return NextResponse.json(
        { error: 'Failed to retrieve chat session', details: sessionError.message },
        { status: 404 }
      );
    }
    
    // Get the messages for this session
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (messagesError) {
      return NextResponse.json(
        { error: 'Failed to retrieve chat messages', details: messagesError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      session,
      messages,
    });
  } catch (error: any) {
    console.error('Error retrieving chat session:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve chat session', details: error.message },
      { status: 500 }
    );
  }
}