import { useState, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

interface ChatbotState {
  messages: Message[];
  isLoading: boolean;
  error: Error | null;
  sessionId: string | null;
}

interface ChatbotHook extends ChatbotState {
  sendMessage: (message: string) => Promise<void>;
  clearConversation: () => void;
}

export function useChatbot(): ChatbotHook {
  const [state, setState] = useState<ChatbotState>({
    messages: [],
    isLoading: false,
    error: null,
    sessionId: null
  });

  const sendMessage = useCallback(async (content: string) => {
    try {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        messages: [
          ...prev.messages,
          {
            role: 'user',
            content,
            timestamp: new Date().toISOString()
          }
        ]
      }));

      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: content,
          session_id: state.sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from chatbot');
      }

      const data = await response.json();

      setState((prev) => ({
        ...prev,
        isLoading: false,
        sessionId: data.session_id,
        messages: [
          ...prev.messages,
          {
            role: data.message.role,
            content: data.message.content,
            timestamp: new Date().toISOString()
          }
        ]
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error as Error
      }));
    }
  }, [state.sessionId]);

  const clearConversation = useCallback(() => {
    setState({
      messages: [],
      isLoading: false,
      error: null,
      sessionId: null
    });
  }, []);

  return {
    ...state,
    sendMessage,
    clearConversation
  };
}