import { createClient } from '../supabase-server';
import { ChatbotRequest, ChatbotResponse, ChatContext, ChatMessage, ChatSession } from '../types/chatbot';

/**
 * Service for handling chatbot interactions using OpenAI API
 */
export class ChatbotService {
  private static instance: ChatbotService;
  private openAiApiKey: string;
  
  private constructor() {
    this.openAiApiKey = process.env.OPENAI_API_KEY || '';
    if (!this.openAiApiKey) {
      console.warn('OpenAI API key is not set. Chatbot functionality will be limited.');
    }
  }
  
  public static getInstance(): ChatbotService {
    if (!ChatbotService.instance) {
      ChatbotService.instance = new ChatbotService();
    }
    return ChatbotService.instance;
  }
  
  /**
   * Process a message from the user and generate a chatbot response
   */
  public async processMessage(request: ChatbotRequest): Promise<ChatbotResponse> {
    try {
      // Get or create a chat session
      const session = await this.getOrCreateSession(request.sessionId, request.context);
      
      // Add the user message to the session
      await this.saveMessage({
        content: request.message,
        message_type: 'user',
        sender_id: request.context?.userId,
        booking_id: request.context?.bookingId,
        property_id: request.context?.propertyId,
      }, session.id);
      
      // Process the message with OpenAI
      const response = await this.generateAIResponse(request.message, session);
      
      // Save the chatbot response to the database
      await this.saveMessage({
        content: response.message,
        message_type: 'chatbot',
        recipient_id: request.context?.userId,
        booking_id: request.context?.bookingId,
        property_id: request.context?.propertyId,
      }, session.id);
      
      // Update session context
      await this.updateSessionContext(session.id, {
        ...session.context,
        lastInteractionAt: new Date().toISOString(),
        escalated: response.requiresEscalation,
        escalationReason: response.escalationReason,
      });
      
      return response;
    } catch (error) {
      console.error('Error processing chatbot message:', error);
      return {
        message: "I'm sorry, I'm having trouble processing your request right now. Please try again later or contact support for assistance.",
        requiresEscalation: true,
        escalationReason: 'Error processing message',
      };
    }
  }
  
  /**
   * Generate a response using OpenAI API
   */
  private async generateAIResponse(message: string, session: ChatSession): Promise<ChatbotResponse> {
    if (!this.openAiApiKey) {
      return this.getFallbackResponse(message);
    }
    
    try {
      // Prepare conversation history for context
      const conversationHistory = await this.getConversationHistory(session.id);
      
      // Get property and booking details if available
      const propertyDetails = session.context.propertyId ? 
        await this.getPropertyDetails(session.context.propertyId) : null;
      
      const bookingDetails = session.context.bookingId ?
        await this.getBookingDetails(session.context.bookingId) : null;
      
      // Construct the prompt with context
      const systemPrompt = this.constructSystemPrompt(propertyDetails, bookingDetails);
      
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openAiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.map(msg => ({
              role: msg.message_type === 'user' ? 'user' : 'assistant',
              content: msg.content
            })),
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      const aiMessage = data.choices[0].message.content;
      
      // Check if escalation is needed
      const requiresEscalation = this.checkIfEscalationNeeded(message, aiMessage);
      
      return {
        message: aiMessage,
        requiresEscalation,
        escalationReason: requiresEscalation ? 'Complex issue requiring human assistance' : undefined,
        suggestedActions: this.generateSuggestedActions(message, aiMessage, session.context)
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      return this.getFallbackResponse(message);
    }
  }
  
  /**
   * Construct the system prompt with property and booking details
   */
  private constructSystemPrompt(propertyDetails: any, bookingDetails: any): string {
    let prompt = `You are an AI concierge for a medical rental property platform. 
Your role is to assist guests with booking inquiries, answer questions about properties, 
and provide support during their stay. Be helpful, friendly, and concise.

If you don't know the answer to a question, don't make up information. Instead, offer to connect 
the user with a human representative who can help them further.`;
    
    if (propertyDetails) {
      prompt += `\n\nProperty Information:
- Name: ${propertyDetails.title}
- Description: ${propertyDetails.description}
- Address: ${JSON.stringify(propertyDetails.address)}
- Amenities: ${propertyDetails.amenities.join(', ')}
- Max Guests: ${propertyDetails.max_guests}
- Bedrooms: ${propertyDetails.bedrooms}
- Bathrooms: ${propertyDetails.bathrooms}
- Base Price: $${propertyDetails.base_price} per night`;
    }
    
    if (bookingDetails) {
      prompt += `\n\nBooking Information:
- Check-in: ${bookingDetails.check_in}
- Check-out: ${bookingDetails.check_out}
- Guest Count: ${bookingDetails.guest_count}
- Status: ${bookingDetails.status}
- Special Requests: ${bookingDetails.special_requests || 'None'}`;
    }
    
    prompt += `\n\nCommon questions you should be able to answer:
1. Property amenities and features
2. Check-in and check-out procedures
3. Nearby hospitals and medical facilities
4. Booking availability and pricing
5. Wi-Fi passwords and property access information
6. Local recommendations for restaurants and services

If a user asks about payment issues, technical problems with the platform, or complex booking changes, 
offer to escalate the issue to a human support representative.`;
    
    return prompt;
  }
  
  /**
   * Check if the conversation needs to be escalated to a human
   */
  private checkIfEscalationNeeded(userMessage: string, aiResponse: string): boolean {
    const escalationKeywords = [
      'refund', 'cancel', 'compensation', 'broken', 'not working', 'emergency',
      'urgent', 'immediately', 'complaint', 'unhappy', 'disappointed', 'angry',
      'technical issue', 'payment problem', 'credit card', 'overcharged'
    ];
    
    const userMessageLower = userMessage.toLowerCase();
    const aiResponseLower = aiResponse.toLowerCase();
    
    // Check if user message contains escalation keywords
    const containsEscalationKeyword = escalationKeywords.some(keyword => 
      userMessageLower.includes(keyword)
    );
    
    // Check if AI response indicates it cannot help
    const aiIndicatesEscalation = 
      aiResponseLower.includes('human') && 
      (aiResponseLower.includes('representative') || 
       aiResponseLower.includes('support') || 
       aiResponseLower.includes('assist'));
    
    return containsEscalationKeyword || aiIndicatesEscalation;
  }
  
  /**
   * Generate suggested actions based on the conversation
   */
  private generateSuggestedActions(userMessage: string, aiResponse: string, context: ChatContext): any[] {
    const actions = [];
    
    // If conversation mentions booking
    if (userMessage.toLowerCase().includes('book') || 
        userMessage.toLowerCase().includes('reservation') ||
        aiResponse.toLowerCase().includes('book') ||
        aiResponse.toLowerCase().includes('reservation')) {
      actions.push({
        type: 'booking',
        label: 'Make a Booking',
        value: '/booking'
      });
    }
    
    // If conversation mentions properties
    if (userMessage.toLowerCase().includes('property') || 
        userMessage.toLowerCase().includes('house') ||
        userMessage.toLowerCase().includes('apartment') ||
        aiResponse.toLowerCase().includes('property')) {
      actions.push({
        type: 'property',
        label: 'View Properties',
        value: '/properties'
      });
    }
    
    // If escalation is likely needed
    if (this.checkIfEscalationNeeded(userMessage, aiResponse)) {
      actions.push({
        type: 'support',
        label: 'Contact Support',
        value: '/support'
      });
    }
    
    return actions;
  }
  
  /**
   * Get a fallback response when OpenAI API is not available
   */
  private getFallbackResponse(message: string): ChatbotResponse {
    return {
      message: "I'm here to help with your rental property questions. However, I'm currently operating in a limited capacity. For specific information about properties, bookings, or other assistance, please contact our support team.",
      requiresEscalation: true,
      escalationReason: 'OpenAI API not available',
      suggestedActions: [
        {
          type: 'support',
          label: 'Contact Support',
          value: '/support'
        }
      ]
    };
  }
  
  /**
   * Get or create a chat session
   */
  private async getOrCreateSession(sessionId?: string, context?: ChatContext): Promise<ChatSession> {
    const supabase = createClient();
    
    if (sessionId) {
      // Try to get existing session
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (!error && session) {
        return session as ChatSession;
      }
    }
    
    // Create new session
    const { data: newSession, error } = await supabase
      .from('chat_sessions')
      .insert([
        {
          context: context || { escalated: false },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create chat session: ${error.message}`);
    }
    
    return newSession as ChatSession;
  }
  
  /**
   * Save a message to the database
   */
  private async saveMessage(message: Partial<ChatMessage>, sessionId: string): Promise<ChatMessage> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          ...message,
          chat_session_id: sessionId,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save message: ${error.message}`);
    }
    
    return data as ChatMessage;
  }
  
  /**
   * Update the session context
   */
  private async updateSessionContext(sessionId: string, context: ChatContext): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('chat_sessions')
      .update({
        context,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
    
    if (error) {
      throw new Error(`Failed to update session context: ${error.message}`);
    }
  }
  
  /**
   * Get conversation history for a session
   */
  private async getConversationHistory(sessionId: string): Promise<ChatMessage[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10); // Limit to last 10 messages for context
    
    if (error) {
      throw new Error(`Failed to get conversation history: ${error.message}`);
    }
    
    return data as ChatMessage[];
  }
  
  /**
   * Get property details
   */
  private async getPropertyDetails(propertyId: string): Promise<any> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();
    
    if (error) {
      console.error(`Failed to get property details: ${error.message}`);
      return null;
    }
    
    return data;
  }
  
  /**
   * Get booking details
   */
  private async getBookingDetails(bookingId: string): Promise<any> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();
    
    if (error) {
      console.error(`Failed to get booking details: ${error.message}`);
      return null;
    }
    
    return data;
  }
}