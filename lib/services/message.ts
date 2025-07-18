import { createClient } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { CreateMessageData, Message, Booking, Property } from '../types';

/**
 * Service for handling message operations
 */
export const messageService = {
  /**
   * Create a new message
   * @param data Message data to create
   * @returns The created message
   */
  async createMessage(data: CreateMessageData): Promise<Message> {
    const { booking_id, sender_id, recipient_id, content, message_type = 'user', chat_session_id } = data;
    
    // Validate that either booking_id, chat_session_id, or both sender_id and recipient_id are provided
    if (!booking_id && !chat_session_id && (!sender_id || !recipient_id)) {
      throw new Error('Either booking_id, chat_session_id, or both sender_id and recipient_id must be provided');
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        booking_id,
        sender_id,
        recipient_id,
        content,
        message_type,
        chat_session_id
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create message: ${error.message}`);
    }

    return message as Message;
  },

  /**
   * Get messages for a specific booking
   * @param bookingId The booking ID
   * @returns Array of messages
   */
  async getMessagesByBooking(bookingId: string): Promise<Message[]> {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    return messages as Message[];
  },

  /**
   * Get direct messages between two users
   * @param userId1 First user ID
   * @param userId2 Second user ID
   * @returns Array of messages
   */
  async getDirectMessages(userId1: string, userId2: string): Promise<Message[]> {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId1},recipient_id.eq.${userId2}),and(sender_id.eq.${userId2},recipient_id.eq.${userId1})`)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch direct messages: ${error.message}`);
    }

    return messages as Message[];
  },

  /**
   * Get all conversations for a user
   * @param userId User ID
   * @returns Array of unique conversation partners with latest message
   */
  async getUserConversations(userId: string): Promise<any[]> {
    // Get all messages where the user is sender or recipient
    const { data: messages, error } = await supabase
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
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user conversations: ${error.message}`);
    }

    // Group messages by conversation
    const conversations = new Map();
    
    messages?.forEach((message: any) => {
      let conversationId;
      let otherUser;
      let conversationType;
      
      if (message.booking_id) {
        // For booking-related messages, use booking_id as conversation ID
        conversationId = `booking_${message.booking_id}`;
        conversationType = 'booking';
        otherUser = message.sender_id === userId ? message.recipient : message.sender;
      } else if (message.chat_session_id) {
        // For chatbot messages, use chat_session_id as conversation ID
        conversationId = `chatbot_${message.chat_session_id}`;
        conversationType = 'chatbot';
        // No other user for chatbot conversations
      } else {
        // For direct messages, create a composite ID of both user IDs
        const otherUserId = message.sender_id === userId ? message.recipient_id : message.sender_id;
        conversationId = `direct_${[userId, otherUserId].sort().join('_')}`;
        conversationType = 'direct';
        otherUser = message.sender_id === userId ? message.recipient : message.sender;
      }
      
      if (!conversations.has(conversationId) || 
          new Date(message.created_at) > new Date(conversations.get(conversationId).lastMessageAt)) {
        conversations.set(conversationId, {
          id: conversationId,
          type: conversationType,
          booking: message.booking,
          otherUser,
          chatSession: message.chat_session,
          lastMessage: message.content,
          lastMessageAt: message.created_at,
          unread: message.recipient_id === userId && !message.read_at ? 1 : 0
        });
      } else if (message.recipient_id === userId && !message.read_at) {
        // Count unread messages
        const conversation = conversations.get(conversationId);
        conversation.unread += 1;
        conversations.set(conversationId, conversation);
      }
    });
    
    return Array.from(conversations.values());
  },

  /**
   * Mark messages as read
   * @param messageIds Array of message IDs to mark as read
   * @returns Success status
   */
  async markMessagesAsRead(messageIds: string[]): Promise<boolean> {
    if (!messageIds.length) return true;
    
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', messageIds);

    if (error) {
      throw new Error(`Failed to mark messages as read: ${error.message}`);
    }

    return true;
  },

  /**
   * Mark all messages in a conversation as read
   * @param userId User ID of the recipient
   * @param conversationType Type of conversation ('booking', 'direct', 'chatbot')
   * @param conversationId ID of the conversation (booking_id, chat_session_id, or composite user IDs)
   * @returns Success status
   */
  async markConversationAsRead(userId: string, conversationType: string, conversationId: string): Promise<boolean> {
    let query = supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', userId)
      .is('read_at', null);
    
    if (conversationType === 'booking') {
      query = query.eq('booking_id', conversationId.replace('booking_', ''));
    } else if (conversationType === 'chatbot') {
      query = query.eq('chat_session_id', conversationId.replace('chatbot_', ''));
    } else if (conversationType === 'direct') {
      const otherUserId = conversationId.replace('direct_', '').split('_').find(id => id !== userId);
      if (otherUserId) {
        query = query.eq('sender_id', otherUserId);
      }
    }
    
    const { error } = await query;

    if (error) {
      throw new Error(`Failed to mark conversation as read: ${error.message}`);
    }

    return true;
  },

  /**
   * Delete a message
   * @param messageId Message ID to delete
   * @returns Success status
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }

    return true;
  },

  /**
   * Subscribe to new messages for a booking
   * @param bookingId Booking ID to subscribe to
   * @param callback Function to call when new messages arrive
   * @returns Subscription object that can be used to unsubscribe
   */
  subscribeToBookingMessages(bookingId: string, callback: (message: Message) => void) {
    return supabase
      .channel(`booking_messages:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`
        },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .subscribe();
  },

  /**
   * Subscribe to direct messages between users
   * @param userId1 First user ID
   * @param userId2 Second user ID
   * @param callback Function to call when new messages arrive
   * @returns Subscription object that can be used to unsubscribe
   */
  subscribeToDirectMessages(userId1: string, userId2: string, callback: (message: Message) => void) {
    return supabase
      .channel(`direct_messages:${[userId1, userId2].sort().join('_')}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${userId1} AND recipient_id=eq.${userId2}`
        },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${userId2} AND recipient_id=eq.${userId1}`
        },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .subscribe();
  },

  /**
   * Subscribe to all user conversations
   * @param userId User ID
   * @param callback Function to call when new messages arrive
   * @returns Subscription object that can be used to unsubscribe
   */
  subscribeToUserMessages(userId: string, callback: (message: Message) => void) {
    return supabase
      .channel(`user_messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .subscribe();
  },

  /**
   * Subscribe to message status changes (read/unread)
   * @param userId User ID
   * @param callback Function to call when message status changes
   * @returns Subscription object that can be used to unsubscribe
   */
  subscribeToMessageStatusChanges(userId: string, callback: (message: Message) => void) {
    return supabase
      .channel(`message_status:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .subscribe();
  },

  /**
   * Create an automated system message for a booking
   * @param bookingId Booking ID
   * @param content Message content
   * @returns The created message
   */
  async createSystemMessage(bookingId: string, content: string): Promise<Message> {
    return this.createMessage({
      booking_id: bookingId,
      content,
      message_type: 'system'
    });
  },

  /**
   * Send automated booking confirmation message
   * @param bookingId Booking ID
   * @param propertyTitle Property title
   * @param checkIn Check-in date
   * @param checkOut Check-out date
   * @returns The created message
   */
  async sendBookingConfirmationMessage(
    bookingId: string, 
    propertyTitle: string, 
    checkIn: string, 
    checkOut: string
  ): Promise<Message> {
    const content = `Your booking for "${propertyTitle}" has been confirmed! Check-in: ${checkIn}, Check-out: ${checkOut}. We're looking forward to hosting you!`;
    return this.createSystemMessage(bookingId, content);
  },

  /**
   * Send automated check-in instructions message
   * @param bookingId Booking ID
   * @param propertyTitle Property title
   * @param checkIn Check-in date
   * @returns The created message
   */
  async sendCheckInInstructionsMessage(
    bookingId: string, 
    propertyTitle: string, 
    checkIn: string
  ): Promise<Message> {
    const content = `Your stay at "${propertyTitle}" is coming up soon! Check-in is on ${checkIn}. Here are your check-in instructions: [Instructions will be customized for each property]`;
    return this.createSystemMessage(bookingId, content);
  },

  /**
   * Send automated check-out reminder message
   * @param bookingId Booking ID
   * @param propertyTitle Property title
   * @param checkOut Check-out date
   * @returns The created message
   */
  async sendCheckOutReminderMessage(
    bookingId: string, 
    propertyTitle: string, 
    checkOut: string
  ): Promise<Message> {
    const content = `Your stay at "${propertyTitle}" is coming to an end. Check-out is on ${checkOut}. Here are your check-out instructions: [Instructions will be customized for each property]`;
    return this.createSystemMessage(bookingId, content);
  },

  /**
   * Send automated thank you message after check-out
   * @param bookingId Booking ID
   * @param propertyTitle Property title
   * @returns The created message
   */
  async sendThankYouMessage(
    bookingId: string, 
    propertyTitle: string
  ): Promise<Message> {
    const content = `Thank you for staying at "${propertyTitle}"! We hope you enjoyed your stay. We'd appreciate if you could leave a review of your experience. Safe travels!`;
    return this.createSystemMessage(bookingId, content);
  },

  /**
   * Get unread message count for a user
   * @param userId User ID
   * @returns Number of unread messages
   */
  async getUnreadMessageCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .is('read_at', null);

    if (error) {
      throw new Error(`Failed to get unread message count: ${error.message}`);
    }

    return count || 0;
  },

  /**
   * Create a new chat session
   * @param context Initial context for the chat session
   * @returns The created chat session ID
   */
  async createChatSession(context: Record<string, any> = {}): Promise<string> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ context })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create chat session: ${error.message}`);
    }

    return data.id;
  },

  /**
   * Update chat session context
   * @param sessionId Chat session ID
   * @param context Updated context
   * @returns Success status
   */
  async updateChatSessionContext(sessionId: string, context: Record<string, any>): Promise<boolean> {
    const { error } = await supabase
      .from('chat_sessions')
      .update({ context, updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      throw new Error(`Failed to update chat session context: ${error.message}`);
    }

    return true;
  },

  /**
   * Get messages for a chat session
   * @param sessionId Chat session ID
   * @returns Array of messages
   */
  async getChatSessionMessages(sessionId: string): Promise<Message[]> {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch chat session messages: ${error.message}`);
    }

    return messages as Message[];
  },

  /**
   * Subscribe to chat session messages
   * @param sessionId Chat session ID
   * @param callback Function to call when new messages arrive
   * @returns Subscription object that can be used to unsubscribe
   */
  subscribeToChatSessionMessages(sessionId: string, callback: (message: Message) => void) {
    return supabase
      .channel(`chat_session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_session_id=eq.${sessionId}`
        },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .subscribe();
  },

  /**
   * Get conversation threads for a booking
   * @param bookingId Booking ID
   * @returns Array of messages grouped by thread
   */
  async getMessageThreads(bookingId: string): Promise<any[]> {
    const messages = await this.getMessagesByBooking(bookingId);
    
    // Group messages by thread (using created_at date as a simple grouping mechanism)
    const threads = messages.reduce((acc: any[], message: Message) => {
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
      thread.messages.sort((a: Message, b: Message) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
    
    return threads;
  }
};