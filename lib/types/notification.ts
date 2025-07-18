export type NotificationType = 
  | 'booking_request' 
  | 'booking_confirmed' 
  | 'booking_cancelled' 
  | 'message_received' 
  | 'maintenance_alert'
  | 'payment_received'
  | 'system_alert';

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
}

export interface NotificationSettings {
  booking_request: NotificationPreferences;
  booking_confirmed: NotificationPreferences;
  booking_cancelled: NotificationPreferences;
  message_received: NotificationPreferences;
  maintenance_alert: NotificationPreferences;
  payment_received: NotificationPreferences;
  system_alert: NotificationPreferences;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  created_at: string;
  action_url?: string;
}

export interface CreateNotificationInput {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  action_url?: string;
}