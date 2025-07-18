import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ChatbotService } from '@/lib/services/chatbot';
import { ChatbotRequest } from '@/lib/types/chatbot';

/**
 * POST /api/chatbot
 * Process a chatbot message and return a response
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    // Parse request body
    const body = await request.json();
    const { message, sessionId, context } = body as ChatbotRequest;
    
    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    // Enhance context with user information if authenticated
    const enhancedContext = {
      ...context,
      userId: session?.user?.id,
      userRole: session?.user?.user_metadata?.role || 'guest',
    };
    
    // Process the message
    const chatbotService = ChatbotService.getInstance();
    const response = await chatbotService.processMessage({
      message,
      sessionId,
      context: enhancedContext,
    });
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in chatbot API:', error);
    return NextResponse.json(
      { error: 'Failed to process chatbot request', details: error.message },
      { status: 500 }
    );
  }
}