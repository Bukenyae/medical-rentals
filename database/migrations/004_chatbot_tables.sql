-- Migration for chatbot functionality

-- Create chat_sessions table
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  context JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add chat_session_id column to messages table
ALTER TABLE messages ADD COLUMN chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_messages_chat_session_id ON messages(chat_session_id);

-- Update messages table constraints to allow either booking_id or chat_session_id
ALTER TABLE messages DROP CONSTRAINT message_context;
ALTER TABLE messages ADD CONSTRAINT message_context CHECK (
  booking_id IS NOT NULL OR 
  chat_session_id IS NOT NULL OR 
  (sender_id IS NOT NULL AND recipient_id IS NOT NULL)
);

-- Enable RLS on chat_sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_sessions
CREATE POLICY "Anyone can create chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own chat sessions" ON chat_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages 
      WHERE messages.chat_session_id = chat_sessions.id 
      AND (messages.sender_id = auth.uid() OR messages.recipient_id = auth.uid())
    )
  );

-- Update messages RLS policies to include chat_session_id
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = messages.booking_id 
      AND (bookings.guest_id = auth.uid() OR 
           EXISTS (
             SELECT 1 FROM properties 
             WHERE properties.id = bookings.property_id 
             AND properties.owner_id = auth.uid()
           ))
    ) OR
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = messages.chat_session_id
      AND EXISTS (
        SELECT 1 FROM messages m2
        WHERE m2.chat_session_id = chat_sessions.id
        AND (m2.sender_id = auth.uid() OR m2.recipient_id = auth.uid())
      )
    )
  );

-- Add trigger to update updated_at column
CREATE TRIGGER update_chat_sessions_updated_at 
  BEFORE UPDATE ON chat_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();