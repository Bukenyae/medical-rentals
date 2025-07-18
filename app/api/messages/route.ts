import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { CreateMessageData } from '@/lib/types';

/**
 * GET /api/messages
 * Get messages for a user, optionally filtered by booking, conversation, or chat session
 */
export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userId = session.user.id;
  const searchParams = request.nextUrl.searchParams;
  const bookingId = searchParams.get('booking_id');
  const otherUserId = searchParams.get('other_user_id');
  const chatSessionId = searchParams.get('chat_session_id');
  const threaded = searchParams.get('threaded') === 'true';
  const unreadOnly = searchParams.get('unread_only') === 'true';
  
  try {
    let query = supabase
      .from('messages')
      .select(`
        *,
        booking:booking_id(
          id,
          property:property_id(
            id,
            title,
            images
          ),
          guest:guest_id(
            id
          )
        ),
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
        ),
        chat_session:chat_session_id(
          id,
          context
        )
      `)
      .order('created_at', { ascending: true });
    
    if (bookingId) {
      // Get messages for a specific booking
      query = query.eq('booking_id', bookingId);
    } else if (otherUserId) {
      // Get direct messages between the current user and another user
      query = query.or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`);
    } else if (chatSessionId) {
      // Get messages for a specific chat session
      query = query.eq('chat_session_id', chatSessionId);
    } else {
      // Get all messages where the user is sender or recipient
      query = query.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
    }
    
    // Filter for unread messages only if requested
    if (unreadOnly) {
      query = query.eq('recipient_id', userId).is('read_at', null);
    }
    
    const { data: messages, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // If threaded view is requested, group messages by date
    if (threaded && messages) {
      const threads = messages.reduce((acc: any[], message: any) => {
        const messageDate = new Date(message.created_at).toDateString();
        const existingThread = acc.find(thread => thread.date === messageDate);
        
        if (existingThread) {
          existingThread.messages.push(message);
        } else {
          acc.push({
            date: messageDate,
            messages: [message]
          });
        }
        
        return acc;
      }, []);
      
      // Sort threads by date (newest first) and messages within threads by created_at (oldest first)
      threads.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      threads.forEach(thread => {
        thread.messages.sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      
      return NextResponse.json(threads);
    }
    
    return NextResponse.json(messages);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to fetch messages: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages
 * Create a new message
 */
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { 
      booking_id, 
      recipient_id, 
      content, 
      message_type = 'user',
      chat_session_id 
    } = body as CreateMessageData;
    
    // Validate required fields
    if (!content) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }
    
    // Either booking_id, chat_session_id, or recipient_id must be provided
    if (!booking_id && !recipient_id && !chat_session_id) {
      return NextResponse.json(
        { error: 'Either booking_id, chat_session_id, or recipient_id must be provided' },
        { status: 400 }
      );
    }
    
    // Create the message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        booking_id,
        sender_id: session.user.id,
        recipient_id,
        content,
        message_type,
        chat_session_id
      })
      .select('*')
      .single();
    
    if (error) {
      throw error;
    }
    
    // If this is a booking-related message, check if we need to send automated responses
    if (booking_id && message_type === 'user') {
      // Get booking details to determine if automated responses are needed
      const { data: booking } = await supabase
        .from('bookings')
        .select(`
          id,
          property:property_id(
            id,
            title
          ),
          check_in,
          check_out,
          status
        `)
        .eq('id', booking_id)
        .single();
      
      // Here we could add logic to send automated responses based on message content
      // For example, if the message contains keywords like "check-in" or "instructions"
      // This would be implemented in a more sophisticated way in a real system
    }
    
    return NextResponse.json(message);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to create message: ${error.message}` },
      { status: 500 }
    );
  }
}