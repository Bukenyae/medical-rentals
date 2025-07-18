import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMessages } from '@/lib/hooks/useMessages';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatDistanceToNow, format } from 'date-fns';
import { Message } from '@/lib/types';
import MessageComposer from './MessageComposer';

interface ConversationThreadProps {
  bookingId?: string;
  otherUserId?: string;
  chatSessionId?: string;
  viewMode?: 'standard' | 'threaded';
  onNewMessage?: () => void;
}

/**
 * ConversationThread component for displaying and interacting with a single conversation
 */
export default function ConversationThread({ 
  bookingId, 
  otherUserId,
  chatSessionId,
  viewMode = 'standard',
  onNewMessage 
}: ConversationThreadProps) {
  const { user } = useAuth();
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const { 
    messages, 
    messageThreads,
    loading, 
    error, 
    sendMessage,
    markAsRead,
    markConversationAsRead,
    fetchMessageThreads,
    refreshMessages
  } = useMessages(bookingId, otherUserId, chatSessionId);

  // Check if user is scrolled to bottom
  const checkScrollPosition = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const atBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50;
    
    setIsScrolledToBottom(atBottom);
    setShowScrollToBottom(!atBottom && scrollHeight > clientHeight);
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollToBottom(false);
  }, []);

  // Scroll to bottom when new messages arrive if already at bottom
  useEffect(() => {
    if (isScrolledToBottom) {
      scrollToBottom();
    } else if (messages.length > 0) {
      setShowScrollToBottom(true);
    }
  }, [messages, isScrolledToBottom, scrollToBottom]);

  // Set up scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', checkScrollPosition);
    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
    };
  }, [checkScrollPosition]);

  // Mark unread messages as read
  useEffect(() => {
    if (messages.length > 0 && user) {
      // Determine conversation type and ID
      let conversationType: string;
      let conversationId: string;
      
      if (bookingId) {
        conversationType = 'booking';
        conversationId = `booking_${bookingId}`;
      } else if (chatSessionId) {
        conversationType = 'chatbot';
        conversationId = `chatbot_${chatSessionId}`;
      } else if (otherUserId) {
        conversationType = 'direct';
        conversationId = `direct_${[user.id, otherUserId].sort().join('_')}`;
      } else {
        return;
      }
      
      // Mark all unread messages in this conversation as read
      markConversationAsRead(conversationType, conversationId);
    }
  }, [messages, user, bookingId, otherUserId, chatSessionId, markConversationAsRead]);

  // Fetch message threads if in threaded view
  useEffect(() => {
    if (viewMode === 'threaded' && bookingId) {
      fetchMessageThreads();
    }
  }, [viewMode, bookingId, fetchMessageThreads]);

  // Format message timestamp
  const formatMessageTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  // Format date for thread headers
  const formatThreadDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return format(date, 'MMMM d, yyyy');
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [date: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  // Handle message send
  const handleSendMessage = async (content: string, attachmentUrl?: string) => {
    const newMessage = await sendMessage(content);
    
    if (newMessage && onNewMessage) {
      onNewMessage();
    }
    
    // Simulate typing indicator for chatbot
    if (chatSessionId) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
      }, 2000);
    }
    
    return newMessage;
  };

  // Render message content with support for attachments and markdown
  const renderMessageContent = (content: string) => {
    // Check for image attachments
    if (content.includes('![Image](')) {
      const imgRegex = /!\[Image\]\((https?:\/\/[^\s)]+)\)/g;
      const parts = content.split(imgRegex);
      const matches = content.match(imgRegex);
      
      if (!matches) return <p>{content}</p>;
      
      return (
        <div>
          {parts.map((part, index) => {
            // Text part
            if (index === 0 && part) {
              return <p key={`text-${index}`}>{part}</p>;
            }
            
            // Image part
            if (index < matches.length) {
              const imgUrl = matches[index].match(/\((https?:\/\/[^\s)]+)\)/)?.[1];
              return (
                <React.Fragment key={`img-${index}`}>
                  <div className="mt-2 mb-2">
                    <img 
                      src={imgUrl} 
                      alt="Attachment" 
                      className="max-w-full rounded-lg max-h-60 object-contain"
                      loading="lazy"
                    />
                  </div>
                  {parts[index + 1] && <p>{parts[index + 1]}</p>}
                </React.Fragment>
              );
            }
            
            return null;
          })}
        </div>
      );
    }
    
    // Check for other attachments
    if (content.includes('Attachment:')) {
      const parts = content.split(/\n\nAttachment: (https?:\/\/[^\s]+)/);
      
      if (parts.length >= 3) {
        const messageText = parts[0];
        const attachmentUrl = parts[1];
        const fileExtension = attachmentUrl.split('.').pop()?.toLowerCase();
        
        return (
          <div>
            <p>{messageText}</p>
            <div className="mt-2 p-2 bg-gray-50 rounded-md border flex items-center">
              {/* File icon based on extension */}
              {['pdf'].includes(fileExtension || '') ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              ) : ['doc', 'docx'].includes(fileExtension || '') ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                </svg>
              )}
              <a 
                href={attachmentUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline text-sm truncate"
              >
                Download attachment
              </a>
            </div>
          </div>
        );
      }
    }
    
    // Regular text message
    return <p>{content}</p>;
  };

  if (!user) {
    return <div className="p-4">Please sign in to view messages</div>;
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 relative"
        aria-live="polite"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-500">Loading messages...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-500 mb-2">Error loading messages</p>
              <button 
                onClick={() => refreshMessages()}
                className="text-blue-500 hover:text-blue-700 underline"
                type="button"
              >
                Try again
              </button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-700 mb-2">No messages yet</h3>
              <p className="text-gray-500">
                {chatSessionId ? 
                  "Start a conversation with our AI concierge by sending a message below." :
                  "Send a message to start the conversation."}
              </p>
            </div>
          </div>
        ) : viewMode === 'threaded' && messageThreads.length > 0 ? (
          // Threaded view
          <div className="space-y-8">
            {messageThreads.map((thread, index) => (
              <div key={index} className="space-y-4">
                <div className="flex justify-center">
                  <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                    {formatThreadDate(thread.date)}
                  </span>
                </div>
                
                {thread.messages.map((message: Message) => {
                  const isCurrentUser = message.sender_id === user.id;
                  const messageType = message.message_type;
                  const senderName = isCurrentUser ? 'You' : 
                    messageType === 'system' ? 'System' : 
                    messageType === 'chatbot' ? 'AI Concierge' : 'Guest';
                  
                  return (
                    <div 
                      key={message.id} 
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[70%] rounded-lg p-3 shadow-sm ${
                          messageType === 'system' 
                            ? 'bg-gray-100 text-gray-700' 
                            : messageType === 'chatbot'
                              ? 'bg-purple-100 text-purple-800'
                              : isCurrentUser
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        <div className="text-xs font-medium mb-1 opacity-80">
                          {senderName}
                        </div>
                        {renderMessageContent(message.content)}
                        <div className="text-xs mt-2 opacity-70 flex justify-between items-center">
                          <span>{formatMessageTime(message.created_at)}</span>
                          {message.read_at && isCurrentUser && (
                            <span className="ml-2">✓ Read</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          // Standard view
          <div className="space-y-6">
            {Object.entries(messageGroups).map(([date, dateMessages]) => (
              <div key={date} className="space-y-4">
                <div className="flex justify-center">
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                    {formatThreadDate(date)}
                  </span>
                </div>
                
                {dateMessages.map((message) => {
                  const isCurrentUser = message.sender_id === user.id;
                  const messageType = message.message_type;
                  const senderName = isCurrentUser ? 'You' : 
                    messageType === 'system' ? 'System' : 
                    messageType === 'chatbot' ? 'AI Concierge' : 'Guest';
                  
                  return (
                    <div 
                      key={message.id} 
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[70%] rounded-lg p-3 shadow-sm ${
                          messageType === 'system' 
                            ? 'bg-gray-100 text-gray-700' 
                            : messageType === 'chatbot'
                              ? 'bg-purple-100 text-purple-800'
                              : isCurrentUser
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        <div className="text-xs font-medium mb-1 opacity-80">
                          {senderName}
                        </div>
                        {renderMessageContent(message.content)}
                        <div className="text-xs mt-2 opacity-70 flex justify-between items-center">
                          <span>{formatMessageTime(message.created_at)}</span>
                          {message.read_at && isCurrentUser && (
                            <span className="ml-2">✓ Read</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start mt-4">
            <div className="bg-gray-100 rounded-lg p-3 flex items-center">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="ml-2 text-sm text-gray-500">AI is typing...</span>
            </div>
          </div>
        )}
        
        {/* Scroll to bottom button */}
        {showScrollToBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 bg-blue-500 text-white rounded-full p-2 shadow-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Scroll to bottom"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Message composer */}
      <MessageComposer
        bookingId={bookingId}
        otherUserId={otherUserId}
        chatSessionId={chatSessionId}
        onSend={handleSendMessage}
        placeholder={chatSessionId ? "Ask the AI concierge a question..." : "Type a message..."}
      />
    </div>
  );
}