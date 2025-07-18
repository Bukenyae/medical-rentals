import { renderHook, act } from '@testing-library/react';
import { useChatbot } from '../../lib/hooks/useChatbot';

// Mock fetch for OpenAI API calls
global.fetch = jest.fn();

describe('useChatbot Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: 'This is a test response from the chatbot.',
          role: 'assistant'
        },
        session_id: 'test-session-123'
      })
    });
  });
  
  test('should initialize with empty messages', () => {
    const { result } = renderHook(() => useChatbot());
    
    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
  
  test('should send message and receive response', async () => {
    const { result } = renderHook(() => useChatbot());
    
    await act(async () => {
      await result.current.sendMessage('Hello, I need help with booking');
    });
    
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].content).toBe('Hello, I need help with booking');
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[1].content).toBe('This is a test response from the chatbot.');
    expect(result.current.messages[1].role).toBe('assistant');
  });
  
  test('should handle API errors gracefully', async () => {
    // Mock API error
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
    
    const { result } = renderHook(() => useChatbot());
    
    await act(async () => {
      await result.current.sendMessage('This will cause an error');
    });
    
    expect(result.current.error).toBeTruthy();
    expect(result.current.isLoading).toBe(false);
  });
  
  test('should clear conversation history', async () => {
    const { result } = renderHook(() => useChatbot());
    
    await act(async () => {
      await result.current.sendMessage('Hello');
    });
    
    expect(result.current.messages).toHaveLength(2);
    
    act(() => {
      result.current.clearConversation();
    });
    
    expect(result.current.messages).toHaveLength(0);
  });
});