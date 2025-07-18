import { useState, useEffect, useCallback } from 'react';
import { messageService } from '../services/message';
import { Message, CreateMessageData } from '../types';
import { useAuth } from './useAuth';

/**
 * Hook for managing messages and real-time messaging
 */
export const useMessages = (
  bookingId?: string, 
  otherUserId?: string, 
  chatSessionId?: string
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messageThreads, setMessageThreads] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch messages for a booking
  const fetchBookingMessages = useCallback(async () => {
    if (!bookingId) return;
    
    try {
      setLoading(true);
      const fetchedMessages = await messageService.getMessagesByBooking(bookingId);
      setMessages(fetchedMessages);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  // Fetch direct messages between users
  const fetchDirectMessages = useCallback(async () => {
    if (!user?.id || !otherUserId) return;
    
    try {
      setLoading(true);
      const fetchedMessages = await messageService.getDirectMessages(user.id, otherUserId);
      setMessages(fetchedMessages);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, otherUserId]);

  // Fetch chat session messages
  const fetchChatSessionMessages = useCallback(async () => {
    if (!chatSessionId) return;
    
    try {
      setLoading(true);
      const fetchedMessages = await messageService.getChatSessionMessages(chatSessionId);
      setMessages(fetchedMessages);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [chatSessionId]);

  // Fetch all user conversations
  const fetchUserConversations = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const fetchedConversations = await messageService.getUserConversations(user.id);
      setConversations(fetchedConversations);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch message threads for a booking
  const fetchMessageThreads = useCallback(async () => {
    if (!bookingId) return;
    
    try {
      setLoading(true);
      const fetchedThreads = await messageService.getMessageThreads(bookingId);
      setMessageThreads(fetchedThreads);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  // Fetch unread message count
  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const count = await messageService.getUnreadMessageCount(user.id);
      setUnreadCount(count);
    } catch (err: any) {
      console.error('Failed to fetch unread count:', err);
    }
  }, [user?.id]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!user?.id) {
      setError('User must be logged in to send messages');
      return null;
    }

    try {
      const messageData: CreateMessageData = {
        content,
        sender_id: user.id
      };

      if (bookingId) {
        messageData.booking_id = bookingId;
      } else if (otherUserId) {
        messageData.recipient_id = otherUserId;
      } else if (chatSessionId) {
        messageData.chat_session_id = chatSessionId;
      } else {
        setError('Either bookingId, otherUserId, or chatSessionId must be provided');
        return null;
      }

      const newMessage = await messageService.createMessage(messageData);
      
      // Optimistically update the UI
      setMessages(prev => [...prev, newMessage]);
      
      return newMessage;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [user?.id, bookingId, otherUserId, chatSessionId]);

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (!messageIds.length) return;
    
    try {
      await messageService.markMessagesAsRead(messageIds);
      
      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          messageIds.includes(msg.id) ? { ...msg, read_at: new Date().toISOString() } : msg
        )
      );
      
      // Refresh unread count
      fetchUnreadCount();
    } catch (err: any) {
      setError(err.message);
    }
  }, [fetchUnreadCount]);

  // Mark all messages in a conversation as read
  const markConversationAsRead = useCallback(async (conversationType: string, conversationId: string) => {
    if (!user?.id) return;
    
    try {
      await messageService.markConversationAsRead(user.id, conversationType, conversationId);
      
      // Update local state for currently loaded messages
      setMessages(prev => 
        prev.map(msg => 
          msg.recipient_id === user.id && !msg.read_at
            ? { ...msg, read_at: new Date().toISOString() }
            : msg
        )
      );
      
      // Refresh conversations to update unread counts
      fetchUserConversations();
      
      // Refresh unread count
      fetchUnreadCount();
    } catch (err: any) {
      setError(err.message);
    }
  }, [user?.id, fetchUserConversations, fetchUnreadCount]);

  // Create a new chat session
  const createChatSession = useCallback(async (context: Record<string, any> = {}) => {
    try {
      const sessionId = await messageService.createChatSession(context);
      return sessionId;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  // Update chat session context
  const updateChatSessionContext = useCallback(async (sessionId: string, context: Record<string, any>) => {
    try {
      await messageService.updateChatSessionContext(sessionId, context);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;
    
    let messageSubscription: any;
    let statusSubscription: any;
    
    if (bookingId) {
      // Subscribe to booking messages
      messageSubscription = messageService.subscribeToBookingMessages(bookingId, (newMessage) => {
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          if (prev.some(msg => msg.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      });
    } else if (otherUserId) {
      // Subscribe to direct messages
      messageSubscription = messageService.subscribeToDirectMessages(user.id, otherUserId, (newMessage) => {
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          if (prev.some(msg => msg.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      });
    } else if (chatSessionId) {
      // Subscribe to chat session messages
      messageSubscription = messageService.subscribeToChatSessionMessages(chatSessionId, (newMessage) => {
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          if (prev.some(msg => msg.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      });
    } else {
      // Subscribe to all user messages
      messageSubscription = messageService.subscribeToUserMessages(user.id, () => {
        // When a new message arrives, refresh conversations
        fetchUserConversations();
        fetchUnreadCount();
      });
    }
    
    // Subscribe to message status changes (read/unread)
    statusSubscription = messageService.subscribeToMessageStatusChanges(user.id, (updatedMessage) => {
      // Update message in the current list if it exists
      setMessages(prev => 
        prev.map(msg => 
          msg.id === updatedMessage.id ? updatedMessage : msg
        )
      );
      
      // If we're showing conversations, refresh them to update unread counts
      if (!bookingId && !otherUserId && !chatSessionId) {
        fetchUserConversations();
      }
      
      // Refresh unread count
      fetchUnreadCount();
    });

    // Clean up subscriptions on unmount
    return () => {
      if (messageSubscription) {
        messageSubscription.unsubscribe();
      }
      if (statusSubscription) {
        statusSubscription.unsubscribe();
      }
    };
  }, [user?.id, bookingId, otherUserId, chatSessionId, fetchUserConversations, fetchUnreadCount]);

  // Initial data loading
  useEffect(() => {
    if (bookingId) {
      fetchBookingMessages();
    } else if (otherUserId && user?.id) {
      fetchDirectMessages();
    } else if (chatSessionId) {
      fetchChatSessionMessages();
    } else if (user?.id) {
      fetchUserConversations();
      fetchUnreadCount();
    }
  }, [
    bookingId, 
    otherUserId, 
    chatSessionId, 
    user?.id, 
    fetchBookingMessages, 
    fetchDirectMessages, 
    fetchChatSessionMessages, 
    fetchUserConversations,
    fetchUnreadCount
  ]);

  return {
    messages,
    conversations,
    messageThreads,
    unreadCount,
    loading,
    error,
    sendMessage,
    markAsRead,
    markConversationAsRead,
    createChatSession,
    updateChatSessionContext,
    refreshMessages: bookingId ? fetchBookingMessages : 
                     otherUserId ? fetchDirectMessages : 
                     chatSessionId ? fetchChatSessionMessages :
                     fetchUserConversations,
    fetchMessageThreads,
    fetchUnreadCount
  };
};