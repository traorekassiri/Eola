import { db } from './db.ts';
import type { Interest, ProfilePhoto, UserProfile } from '../src/types.ts';

export function computeAge(birthDate: string): number {
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return 25;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

const COUNTRY_CODES: Record<string, string> = {
  'Burkina Faso': 'BF',
  'Mali': 'ML',
  "Côte d'Ivoire": 'CI',
  'Sénégal': 'SN',
  'Bénin': 'BJ',
  'Togo': 'TG',
  'Niger': 'NE',
  'Guinée': 'GN',
  'Cameroun': 'CM',
  'Gabon': 'GA',
  'Congo': 'CG',
  'RD Congo': 'CD',
  'Rwanda': 'RW',
  'Maroc': 'MA',
  'Tunisie': 'TN',
  'Algérie': 'DZ',
  'Ghana': 'GH',
  'Nigeria': 'NG',
  'Kenya': 'KE',
  'Afrique du Sud': 'ZA',
};

export function resolveCountryCode(country: string): string {
  if (COUNTRY_CODES[country]) return COUNTRY_CODES[country];
  return country.slice(0, 2).toUpperCase() || 'AF';
}

export function getFullUserProfile(userId: number, viewerId?: number): UserProfile | null {
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.role, u.status, u.is_verified, u.is_online, u.last_seen_at,
              u.notify_messages, u.notify_matches, u.profile_visible,
              p.full_name, p.birth_date, p.gender, p.seeking_gender, p.country, p.country_code,
              p.city, p.profession, p.height_cm, p.zodiac_sign, p.bio, p.avatar_url
       FROM users u
       JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = ?`
    )
    .get(userId) as Record<string, unknown> | undefined;

  if (!row) return null;

  const interests = db
    .prepare(
      `SELECT i.id, i.name, i.category
       FROM interests i
       JOIN user_interests ui ON ui.interest_id = i.id
       WHERE ui.user_id = ?
       ORDER BY i.name`
    )
    .all(userId) as Interest[];

  const photos = db
    .prepare('SELECT id, user_id, photo_url, is_primary, created_at FROM profile_photos WHERE user_id = ? ORDER BY is_primary DESC, id ASC')
    .all(userId) as ProfilePhoto[];

  const activeSub = db
    .prepare(
      `SELECT expires_at FROM subscriptions
       WHERE user_id = ? AND status = 'active' AND datetime(expires_at) > datetime('now')
       ORDER BY datetime(expires_at) DESC LIMIT 1`
    )
    .get(userId) as { expires_at: string } | undefined;

  let likedByMe = false;
  let isMatch = false;
  let sharedInterestsCount = 0;
  let compatibilityScore: number | undefined;

  if (viewerId && viewerId !== userId) {
    likedByMe = Boolean(
      db.prepare('SELECT 1 FROM likes WHERE from_user_id = ? AND to_user_id = ?').get(viewerId, userId)
    );
    const minId = Math.min(viewerId, userId);
    const maxId = Math.max(viewerId, userId);
    isMatch = Boolean(
      db.prepare('SELECT 1 FROM matches WHERE user_one_id = ? AND user_two_id = ?').get(minId, maxId)
    );

    const viewerRow = db
      .prepare('SELECT seeking_gender, country, city FROM user_profiles WHERE user_id = ?')
      .get(viewerId) as { seeking_gender: string; country: string; city: string } | undefined;
    const viewerInterests = db
      .prepare('SELECT interest_id FROM user_interests WHERE user_id = ?')
      .all(viewerId) as Array<{ interest_id: number }>;

    const viewerSet = new Set(viewerInterests.map((x) => x.interest_id));
    sharedInterestsCount = interests.filter((i) => viewerSet.has(i.id)).length;

    let score = 50;
    if (viewerRow) {
      if (viewerRow.seeking_gender === 'Tous' || viewerRow.seeking_gender === String(row.gender)) {
        score += 20;
      }
      if (viewerRow.country === String(row.country)) score += 10;
      if (viewerRow.city.toLowerCase() === String(row.city).toLowerCase()) score += 10;
    }
    score += Math.min(10, sharedInterestsCount * 4);
    compatibilityScore = Math.min(99, score);
  }

  const fullName = String(row.full_name || '');
  const firstName = fullName.split(' ')[0] || fullName;

  return {
    id: Number(row.id),
    email: viewerId === userId ? String(row.email) : undefined,
    role: row.role as UserProfile['role'],
    status: row.status as UserProfile['status'],
    is_verified: Boolean(row.is_verified),
    is_online: Boolean(row.is_online),
    last_seen_at: String(row.last_seen_at),
    notify_messages: Boolean(row.notify_messages),
    notify_matches: Boolean(row.notify_matches),
    profile_visible: Boolean(row.profile_visible),
    is_premium: Boolean(activeSub),
    premium_expires_at: activeSub ? activeSub.expires_at : null,
    full_name: fullName,
    first_name: firstName,
    birth_date: String(row.birth_date),
    age: computeAge(String(row.birth_date)),
    gender: row.gender as 'Femme' | 'Homme',
    seeking_gender: row.seeking_gender as 'Homme' | 'Femme' | 'Tous',
    country: String(row.country),
    country_code: String(row.country_code),
    city: String(row.city),
    profession: String(row.profession || ''),
    height_cm: row.height_cm ? Number(row.height_cm) : null,
    zodiac_sign: String(row.zodiac_sign || ''),
    bio: String(row.bio || ''),
    avatar_url: String(row.avatar_url || '/media/zola_portrait_woman_2_1794726546703.jpg'),
    interests,
    photos,
    liked_by_me: likedByMe,
    is_match: isMatch,
    shared_interests_count: sharedInterestsCount,
    compatibility_score: compatibilityScore,
  };
}
