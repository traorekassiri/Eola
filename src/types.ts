export type AppRoute =
  | 'landing'
  | 'register'
  | 'login'
  | 'forgot-password'
  | 'discover'
  | 'favorites'
  | 'messages'
  | 'notifications'
  | 'profile'
  | 'member-profile'
  | 'edit-profile'
  | 'premium'
  | 'settings'
  | 'admin'
  | 'legal';

export interface Interest {
  id: number;
  name: string;
  category: string;
}

export interface ProfilePhoto {
  id: number;
  user_id: number;
  photo_url: string;
  is_primary: number;
  created_at: string;
}

export interface UserProfile {
  id: number;
  email?: string;
  role: 'user' | 'moderator' | 'admin' | 'super_admin';
  status: 'active' | 'suspended';
  is_verified: boolean;
  is_online: boolean;
  last_seen_at: string;
  notify_messages: boolean;
  notify_matches: boolean;
  profile_visible: boolean;
  is_premium: boolean;
  premium_expires_at: string | null;
  is_boosted?: boolean;
  two_factor_enabled?: boolean;
  full_name: string;
  first_name: string;
  birth_date: string;
  age: number;
  gender: 'Femme' | 'Homme';
  seeking_gender: 'Homme' | 'Femme' | 'Tous';
  country: string;
  country_code: string;
  city: string;
  profession: string;
  height_cm: number | null;
  zodiac_sign: string;
  bio: string;
  avatar_url: string;
  interests: Interest[];
  photos: ProfilePhoto[];
  liked_by_me?: boolean;
  is_super_liked?: boolean;
  is_match?: boolean;
  is_favorite?: boolean;
  favorited_at?: string;
  shared_interests_count?: number;
  compatibility_score?: number;
}

export interface ConversationSummary {
  id: number;
  match_id: number;
  partner: {
    id: number;
    full_name: string;
    first_name: string;
    avatar_url: string;
    is_online: boolean;
    is_verified: boolean;
    city: string;
    country_code: string;
  };
  last_message: string | null;
  last_message_image: string | null;
  last_message_audio: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
}

export interface MessageItem {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  image_url: string | null;
  audio_url: string | null;
  is_read: boolean;
  created_at: string;
  reactions?: MessageReaction[];
}

export interface NotificationItem {
  id: number;
  type: 'match' | 'like' | 'message' | 'system';
  title: string;
  body: string;
  related_user_id: number | null;
  related_user_name?: string;
  related_user_avatar?: string;
  is_read: boolean;
  created_at: string;
}

export interface SubscriptionPlan {
  id: number;
  slug: string;
  name: string;
  duration_months: number;
  price_fcfa: number;
  is_popular: boolean;
  features: string[];
  active: boolean;
}

export interface PaymentRecord {
  id: number;
  user_id: number;
  user_name?: string;
  plan_name: string;
  amount_fcfa: number;
  currency: string;
  provider: string;
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  verified_at: string | null;
}

export interface ReportRecord {
  id: number;
  reporter_id: number;
  reporter_name: string;
  reported_user_id: number;
  reported_name: string;
  reported_avatar: string;
  reported_status: string;
  reason: string;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface VerificationRequestRecord {
  id: number;
  user_id: number;
  full_name?: string;
  city?: string;
  country?: string;
  avatar_url?: string;
  challenge_code: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string;
  created_at: string;
  reviewed_at: string | null;
}

export interface SiteSettings {
  hero_title: string;
  hero_subtitle: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  footer_slogan: string;
  oauth_google_enabled: string;
  oauth_facebook_enabled: string;
  oauth_apple_enabled: string;
  payment_provider_label: string;
}

export interface MonthlySignupPoint {
  month: string;
  label: string;
  count: number;
  revenue_fcfa?: number;
}

export interface CountryDistributionPoint {
  country: string;
  count: number;
}

export interface AdminAuditLog {
  id: number;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  created_at: string;
}

export interface UserSessionRecord {
  session_id: string;
  user_agent: string;
  ip_address: string;
  last_active_at: string;
  created_at: string;
  is_current: boolean;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  verified_users: number;
  online_users: number;
  total_matches: number;
  total_messages: number;
  active_subscriptions: number;
  total_revenue_fcfa: number;
  conversion_rate: number;
  pending_reports: number;
  pending_verifications: number;
}
