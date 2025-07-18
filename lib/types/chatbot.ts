import { MessageType } from '../types';

export interface ChatMessage {
  id: string;
  content: string;
  message_type: MessageType;
  sender_id?: string;
  recipient_id?: string;
  booking_id?: string;
  property_id?: string;
  created_at: string;
  read_at?: string;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  context: ChatContext;
  created_at: string;
  updated_at: string;
}

export interface ChatContext {
  userId?: string;
  userRole?: 'guest' | 'owner' | 'admin';
  propertyId?: string;
  bookingId?: string;
  conversationHistory?: string[];
  lastInteractionAt?: string;
  escalated: boolean;
  escalationReason?: string;
}

export interface ChatbotResponse {
  message: string;
  context?: ChatContext;
  suggestedActions?: SuggestedAction[];
  requiresEscalation: boolean;
  escalationReason?: string;
}

export interface SuggestedAction {
  type: 'booking' | 'property' | 'support' | 'link';
  label: string;
  value: string;
}

export interface ChatbotRequest {
  message: string;
  sessionId?: string;
  context?: ChatContext;
}