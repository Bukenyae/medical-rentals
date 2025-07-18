import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface MessageComposerProps {
  bookingId?: string;
  otherUserId?: string;
  chatSessionId?: string;
  onSend: (content: string, attachmentUrl?: string) => Promise<any>;
  placeholder?: string;
}

/**
 * MessageComposer component for composing and sending messages with attachments
 */
export default function MessageComposer({
  bookingId,
  otherUserId,
  chatSessionId,
  onSend,
  placeholder = 'Type a message...'
}: MessageComposerProps) {
  const { user } = useAuth();
  const [messageInput, setMessageInput] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit');
        return;
      }
      setAttachment(file);
    }
  };

  // Clear selected attachment
  const clearAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle typing indicator
  useEffect(() => {
    if (messageInput.trim()) {
      setIsTyping(true);
      // In a real app, you would send a typing indicator to the server here
    } else {
      setIsTyping(false);
    }
  }, [messageInput]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Insert emoji at cursor position
  const insertEmoji = (emoji: string) => {
    const input = messageInputRef.current;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const text = messageInput;
    const newText = text.substring(0, start) + emoji + text.substring(end);
    
    setMessageInput(newText);
    
    // Focus back on input and set cursor position after the inserted emoji
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 10);
  };

  // Upload attachment to Supabase Storage
  const uploadAttachment = async (): Promise<string | undefined> => {
    if (!attachment || !user) return undefined;

    try {
      setIsUploading(true);
      
      // Determine storage path based on conversation type
      let storagePath = 'message-attachments';
      if (bookingId) {
        storagePath += `/bookings/${bookingId}`;
      } else if (chatSessionId) {
        storagePath += `/chat-sessions/${chatSessionId}`;
      } else if (otherUserId) {
        storagePath += `/direct/${[user.id, otherUserId].sort().join('_')}`;
      }
      
      // Generate unique filename
      const timestamp = new Date().getTime();
      const fileExt = attachment.name.split('.').pop();
      const fileName = `${timestamp}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${storagePath}/${fileName}`;
      
      // Upload file with progress tracking
      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(filePath, attachment, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          }
        });
      
      if (error) {
        throw error;
      }
      
      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(data.path);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      return undefined;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Get file type icon based on extension
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    } else if (['pdf'].includes(extension || '')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    } else if (['doc', 'docx'].includes(extension || '')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!messageInput.trim() && !attachment) || !user) return;
    
    try {
      let attachmentUrl: string | undefined;
      
      // Upload attachment if present
      if (attachment) {
        attachmentUrl = await uploadAttachment();
      }
      
      // Prepare message content
      let content = messageInput.trim();
      
      // If there's an attachment but no text, use the file name as content
      if (!content && attachment) {
        content = `Sent an attachment: ${attachment.name}`;
      }
      
      // If there's an attachment URL, append it to the content
      if (attachmentUrl) {
        // For images, include a preview tag
        const fileExt = attachment?.name.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt || '')) {
          content += `\n\n![Image](${attachmentUrl})`;
        } else {
          content += `\n\nAttachment: ${attachmentUrl}`;
        }
      }
      
      // Send the message
      await onSend(content, attachmentUrl);
      
      // Clear input and attachment
      setMessageInput('');
      clearAttachment();
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send message on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSendMessage(e);
    }
  };

  return (
    <form onSubmit={handleSendMessage} className="p-4 border-t">
      {/* Attachment preview */}
      {attachment && (
        <div className="mb-2 p-2 bg-gray-100 rounded-md flex justify-between items-center">
          <div className="flex items-center">
            {getFileIcon(attachment.name)}
            <span className="text-sm truncate max-w-xs ml-2">{attachment.name}</span>
            <span className="text-xs text-gray-500 ml-2">
              ({(attachment.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <button
            type="button"
            onClick={clearAttachment}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Remove attachment"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Upload progress */}
      {isUploading && (
        <div className="mb-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-500 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Uploading: {uploadProgress}%</p>
        </div>
      )}
      
      {/* Message input and controls */}
      <div className="flex items-center">
        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
          disabled={isUploading}
          aria-label="Attach file"
          title="Attach file"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
          </svg>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
          aria-label="File attachment"
        />
        
        {/* Emoji button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
            aria-label="Insert emoji"
            title="Insert emoji"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z" clipRule="evenodd" />
            </svg>
          </button>
          
          {/* Emoji picker */}
          {showEmojiPicker && (
            <div 
              ref={emojiPickerRef}
              className="absolute bottom-12 left-0 bg-white border rounded-lg shadow-lg p-2 z-10 grid grid-cols-8 gap-1 w-64"
            >
              {['😀', '😂', '😊', '😍', '🤔', '😎', '😢', '😡', 
                '👍', '👎', '❤️', '🙏', '👋', '🎉', '🔥', '✅',
                '⭐', '💯', '🤝', '👏', '💪', '🚀', '💼', '📝'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="text-2xl hover:bg-gray-100 rounded p-1 focus:outline-none"
                  aria-label={`Emoji ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Text input */}
        <input
          type="text"
          ref={messageInputRef}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 border rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ml-2"
          disabled={isUploading}
          aria-label="Message text"
        />
        
        {/* Send button */}
        <button
          type="submit"
          disabled={(!messageInput.trim() && !attachment) || isUploading}
          className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 disabled:bg-blue-300 flex items-center"
          aria-label="Send message"
        >
          <span className="mr-1">Send</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
      
      {/* Typing indicator and keyboard shortcuts hint */}
      <div className="flex justify-between mt-1">
        <div className="text-xs text-gray-500">
          {isTyping && <span>Typing...</span>}
        </div>
        <div className="text-xs text-gray-500">
          Press Ctrl+Enter to send
        </div>
      </div>
    </form>
  );
}