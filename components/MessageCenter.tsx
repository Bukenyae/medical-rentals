import React, { useState, useEffect, useRef } from 'react';
import { useMessages } from '@/lib/hooks/useMessages';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import ConversationThread from './ConversationThread';

/**
 * MessageCenter component for centralized communication
 * Displays a list of conversations and allows users to view and respond to messages
 */
export default function MessageCenter() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'standard' | 'threaded'>('standard');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversationFilter, setConversationFilter] = useState<'all' | 'booking' | 'direct' | 'chatbot'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get all conversations for the current user
  const { 
    conversations, 
    messageThreads,
    unreadCount,
    loading: conversationsLoading, 
    error: conversationsError,
    fetchMessageThreads,
    fetchUnreadCount,
    markConversationAsRead
  } = useMessages();
  
  // Get messages for the selected conversation
  const { 
    messages, 
    loading: messagesLoading, 
    error: messagesError,
    sendMessage
  } = useMessages(
    selectedConversation?.startsWith('booking_') 
      ? selectedConversation.replace('booking_', '') 
      : undefined,
    selectedConversation?.startsWith('direct_') 
      ? getOtherUserIdFromDirectConversation(selectedConversation, user?.id) 
      : undefined,
    selectedConversation?.startsWith('chatbot_')
      ? selectedConversation.replace('chatbot_', '')
      : undefined
  );

  // Extract other user ID from direct conversation ID
  function getOtherUserIdFromDirectConversation(conversationId: string, currentUserId?: string): string | undefined {
    if (!currentUserId || !conversationId.startsWith('direct_')) return undefined;
    
    const userIds = conversationId.replace('direct_', '').split('_');
    return userIds[0] === currentUserId ? userIds[1] : userIds[0];
  }

  // Mark unread messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversation && user?.id) {
      const conversation = conversations.find(c => c.id === selectedConversation);
      if (conversation && conversation.unread > 0) {
        // Mark all unread messages in this conversation as read
        markConversationAsRead(conversation.type, selectedConversation);
      }
    }
  }, [selectedConversation, conversations, user?.id, markConversationAsRead]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch message threads if in threaded view
  useEffect(() => {
    if (viewMode === 'threaded' && selectedConversation?.startsWith('booking_')) {
      fetchMessageThreads();
    }
  }, [viewMode, selectedConversation, fetchMessageThreads]);

  // Format conversation title
  const getConversationTitle = (conversation: any) => {
    if (conversation.type === 'booking') {
      return `Booking: ${conversation.booking?.property?.title || 'Unknown Property'}`;
    } else if (conversation.type === 'chatbot') {
      return 'AI Concierge';
    } else {
      const firstName = conversation.otherUser?.user_profiles?.[0]?.first_name || '';
      const lastName = conversation.otherUser?.user_profiles?.[0]?.last_name || '';
      return firstName && lastName ? `${firstName} ${lastName}` : 'Unknown User';
    }
  };

  // Format message timestamp
  const formatMessageTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  // Create a new chat session
  const handleCreateChatSession = async () => {
    try {
      const response = await fetch('/api/messages/chat-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context: {} }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create chat session');
      }
      
      const chatSession = await response.json();
      
      // Create initial message to start the conversation
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_session_id: chatSession.id,
          content: 'Hello! How can I assist you today?',
          message_type: 'system',
        }),
      });
      
      // Refresh conversations
      setTimeout(() => {
        fetchUnreadCount();
      }, 500);
    } catch (error) {
      console.error('Error creating chat session:', error);
    }
  };

  // Filter conversations based on search query and type filter
  const filteredConversations = conversations.filter(conversation => {
    // Apply type filter
    if (conversationFilter !== 'all' && conversation.type !== conversationFilter) {
      return false;
    }
    
    // Apply search query
    if (searchQuery) {
      const title = getConversationTitle(conversation).toLowerCase();
      const message = (conversation.lastMessage || '').toLowerCase();
      return title.includes(searchQuery.toLowerCase()) || message.includes(searchQuery.toLowerCase());
    }
    
    return true;
  });

  // Get conversation icon based on type
  const getConversationIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return (
          <div className="bg-green-100 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'chatbot':
        return (
          <div className="bg-purple-100 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="bg-blue-100 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 inline-block">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please sign in to view your messages and conversations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col md:flex-row">
      {/* Conversations sidebar */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r md:border-r border-b md:border-b-0 flex-col`}>
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Conversations</h2>
            <div className="flex space-x-2">
              <button
                onClick={handleCreateChatSession}
                className="text-blue-500 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
                title="Start AI Concierge Chat"
                type="button"
                aria-label="Start new AI chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
              </button>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
          
          {/* Search input */}
          <div className="relative mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full border rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search conversations"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                type="button"
                aria-label="Clear search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Filter tabs */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setConversationFilter('all')}
              className={`flex-1 py-1.5 text-sm font-medium ${conversationFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              type="button"
            >
              All
            </button>
            <button
              onClick={() => setConversationFilter('booking')}
              className={`flex-1 py-1.5 text-sm font-medium ${conversationFilter === 'booking' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              type="button"
            >
              Bookings
            </button>
            <button
              onClick={() => setConversationFilter('direct')}
              className={`flex-1 py-1.5 text-sm font-medium ${conversationFilter === 'direct' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              type="button"
            >
              Direct
            </button>
            <button
              onClick={() => setConversationFilter('chatbot')}
              className={`flex-1 py-1.5 text-sm font-medium ${conversationFilter === 'chatbot' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              type="button"
            >
              AI
            </button>
          </div>
        </div>
        
        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            <div className="p-8 text-center">
              <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-500">Loading conversations...</p>
            </div>
          ) : conversationsError ? (
            <div className="p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-500">Error loading conversations</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 text-blue-500 hover:text-blue-700 underline"
                type="button"
              >
                Try again
              </button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {searchQuery ? (
                <>
                  <p className="text-gray-600 font-medium">No matching conversations</p>
                  <p className="text-gray-500 text-sm mt-1">Try a different search term</p>
                </>
              ) : (
                <>
                  <p className="text-gray-600 font-medium">No conversations yet</p>
                  <p className="text-gray-500 text-sm mt-1">Start a new conversation using the + button</p>
                </>
              )}
            </div>
          ) : (
            <ul>
              {filteredConversations.map((conversation) => (
                <li 
                  key={conversation.id}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation === conversation.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedConversation(conversation.id)}
                >
                  <div className="flex gap-3">
                    {/* Conversation icon */}
                    {getConversationIcon(conversation.type)}
                    
                    {/* Conversation content */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-gray-900">{getConversationTitle(conversation)}</h3>
                        <span className="text-xs text-gray-500">
                          {formatMessageTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-1">{conversation.lastMessage}</p>
                      {conversation.unread > 0 && (
                        <div className="flex justify-end mt-1">
                          <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                            {conversation.unread} new
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      {/* Message thread */}
      <div className="w-full md:w-2/3 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Conversation header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div className="flex items-center">
                <button 
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden mr-2 text-gray-500 hover:text-gray-700"
                  type="button"
                  aria-label="Back to conversations"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                {selectedConversation && (
                  getConversationIcon(selectedConversation.split('_')[0])
                )}
                <h2 className="text-lg font-semibold ml-2">
                  {conversations.find(c => c.id === selectedConversation) 
                    ? getConversationTitle(conversations.find(c => c.id === selectedConversation))
                    : 'Loading...'}
                </h2>
              </div>
              
              {/* View mode toggle (only for booking conversations) */}
              {selectedConversation?.startsWith('booking_') && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode('standard')}
                    className={`px-3 py-1 rounded ${
                      viewMode === 'standard' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                    type="button"
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setViewMode('threaded')}
                    className={`px-3 py-1 rounded ${
                      viewMode === 'threaded' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                    type="button"
                  >
                    Threaded
                  </button>
                </div>
              )}
            </div>
            
            {/* Use ConversationThread component */}
            <ConversationThread
              bookingId={selectedConversation?.startsWith('booking_') 
                ? selectedConversation.replace('booking_', '') 
                : undefined}
              otherUserId={selectedConversation?.startsWith('direct_') 
                ? getOtherUserIdFromDirectConversation(selectedConversation, user?.id) 
                : undefined}
              chatSessionId={selectedConversation?.startsWith('chatbot_')
                ? selectedConversation.replace('chatbot_', '')
                : undefined}
              viewMode={viewMode}
              onNewMessage={fetchUnreadCount}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-700 mb-2">No Conversation Selected</h3>
              <p className="text-gray-500 max-w-sm">
                Select a conversation from the sidebar to view messages or start a new conversation.
              </p>
              <button
                onClick={handleCreateChatSession}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Start AI Concierge Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}