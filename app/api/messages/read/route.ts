import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * POST /api/messages/read
 * Mark messages as read
 */
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { message_ids, conversation_type, conversation_id } = body;
    
    // If message_ids is provided, mark specific messages as read
    if (message_ids && Array.isArray(message_ids) && message_ids.length > 0) {
      const { data, error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', message_ids)
        .eq('recipient_id', session.user.id)
        .select('id');
      
      if (error) {
        throw error;
      }
      
      return NextResponse.json({
        success: true,
        marked_messages: data.length,
        message_ids: data.map(msg => msg.id)
      });
    } 
    // If conversation_type and conversation_id are provided, mark all messages in the conversation as read
    else if (conversation_type && conversation_id) {
      let query = supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', session.user.id)
        .is('read_at', null);
      
      if (conversation_type === 'booking') {
        query = query.eq('booking_id', conversation_id.replace('booking_', ''));
      } else if (conversation_type === 'chatbot') {
        query = query.eq('chat_session_id', conversation_id.replace('chatbot_', ''));
      } else if (conversation_type === 'direct') {
        const otherUserId = conversation_id.replace('direct_', '').split('_').find(id => id !== session.user.id);
        if (otherUserId) {
          query = query.eq('sender_id', otherUserId);
        } else {
          return NextResponse.json(
            { error: 'Invalid conversation ID for direct message' },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Invalid conversation type' },
          { status: 400 }
        );
      }
      
      const { data, error } = await query.select('id');
      
      if (error) {
        throw error;
      }
      
      return NextResponse.json({
        success: true,
        marked_messages: data.length,
        message_ids: data.map(msg => msg.id)
      });
    } else {
      return NextResponse.json(
        { error: 'Either message_ids array or conversation_type and conversation_id are required' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to mark messages as read: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/messages/read/count
 * Get count of unread messages
 */
export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', session.user.id)
      .is('read_at', null);
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ count });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to get unread message count: ${error.message}` },
      { status: 500 }
    );
  }
}