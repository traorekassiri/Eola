import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import {
  attachAuth,
  checkRateLimit,
  createSessionCookie,
  parseSessionCookie,
  requireAdmin,
  requireAuth,
  requireCsrf,
  resetRateLimit,
  verifySessionToken,
  type AuthenticatedRequest,
} from './server/auth.ts';
import { db, hashPassword, initDatabase, verifyPassword } from './server/db.ts';
import { stripJpegExifInPlace, validateMagicBytes } from './server/media.ts';
import { computeAge, getFullUserProfile, resolveCountryCode } from './server/queries.ts';
import { buildOtpAuthUri, generateTotpSecret, verifyTotpCode } from './server/totp.ts';

initDatabase();

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const VERIFICATION_DIR = path.resolve(process.cwd(), 'private_verifications');
const MEDIA_DIR = path.resolve(process.cwd(), 'src/assets/images');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(VERIFICATION_DIR)) fs.mkdirSync(VERIFICATION_DIR, { recursive: true });

const PAYMENT_SECRET =
  process.env.PAYMENT_WEBHOOK_SECRET ||
  crypto.createHash('sha256').update(process.cwd() + '_zola_pay_hmac').digest('hex');

const SASPAY_BASE_URL = (process.env.SASPAY_BASE_URL || 'https://api.saspay.me/api/v1').replace(/\/+$/, '');
const SASPAY_SECRET_KEY = (process.env.SASPAY_SECRET_KEY || '').trim();
const SASPAY_WEBHOOK_SECRET = (process.env.SASPAY_WEBHOOK_SECRET || PAYMENT_SECRET).trim();

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext = extMap[file.mimetype] || '.jpg';
    cb(null, `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const verificationStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VERIFICATION_DIR),
  filename: (_req, file, cb) => {
    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext = extMap[file.mimetype] || '.jpg';
    cb(null, `verif_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const chatMediaStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'audio/webm': '.webm',
      'audio/ogg': '.ogg',
      'audio/mpeg': '.mp3',
      'audio/mp4': '.m4a',
      'audio/wav': '.wav',
    };
    const ext = extMap[file.mimetype] || (file.fieldname === 'audio' ? '.webm' : '.jpg');
    cb(null, `${file.fieldname}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format de fichier non autorisé (JPG, PNG, WEBP uniquement).'));
  },
});

const uploadVerification = multer({
  storage: verificationStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format de fichier non autorisé (JPG, PNG, WEBP uniquement).'));
  },
});

const uploadChatMedia = multer({
  storage: chatMediaStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedImg = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedAudio = ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav'];
    if (file.fieldname === 'image' && allowedImg.includes(file.mimetype)) cb(null, true);
    else if (file.fieldname === 'audio' && allowedAudio.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Type de média non supporté.'));
  },
});

async function sendTransactionalEmail(toEmail: string, subject: string, htmlContent: string): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return false;
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'ZOLA', email: process.env.MAIL_FROM || 'noreply@zola.africa' },
        to: [{ email: toEmail }],
        subject,
        htmlContent,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const app = express();
app.use(
  express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: string }).rawBody = buf.toString('utf8');
    },
  })
);
app.use('/media', express.static(MEDIA_DIR));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(attachAuth);

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const onlineSockets = new Map<number, Set<WebSocket>>();

function broadcastToUser(userId: number, event: string, payload: unknown) {
  const sockets = onlineSockets.get(userId);
  if (!sockets) return;
  const serialized = JSON.stringify({ event, payload });
  for (const sock of sockets) {
    if (sock.readyState === WebSocket.OPEN) {
      sock.send(serialized);
    }
  }
}

function setAuthCookie(req: express.Request, res: express.Response, cookieValue: string, maxAgeMs: number) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie('zola_session', cookieValue, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    maxAge: maxAgeMs,
    path: '/',
  });
}

wss.on('connection', (ws, req) => {
  let session = parseSessionCookie(req.headers.cookie);
  if (!session && req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      const tokenParam = parsedUrl.searchParams.get('token') || undefined;
      session = verifySessionToken(tokenParam);
    } catch {
      // Ignore malformed URL
    }
  }
  if (!session) {
    ws.close(1008, 'Unauthorized');
    return;
  }
  const userId = session.userId;
  if (!onlineSockets.has(userId)) {
    onlineSockets.set(userId, new Set());
  }
  onlineSockets.get(userId)!.add(ws);
  db.prepare("UPDATE users SET is_online = 1, last_seen_at = datetime('now') WHERE id = ?").run(userId);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString('utf8')) as { event?: string; payload?: Record<string, unknown> };
      const convId = Number(msg.payload?.conversationId || 0);
      if (!convId || !msg.event) return;

      const isMember = db
        .prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?')
        .get(convId, userId);
      if (!isMember) return;

      const other = db
        .prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?')
        .get(convId, userId) as { user_id: number } | undefined;
      if (!other) return;

      const blocked = db
        .prepare(
          'SELECT 1 FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)'
        )
        .get(userId, other.user_id, other.user_id, userId);
      if (blocked) return;

      const allowedRelay = new Set([
        'typing:start',
        'typing:stop',
        'call:offer',
        'call:answer',
        'call:ice',
        'call:end',
        'call:reject',
      ]);
      if (allowedRelay.has(msg.event)) {
        broadcastToUser(other.user_id, msg.event, {
          ...msg.payload,
          conversationId: convId,
          fromUserId: userId,
        });
      }
    } catch {
      // Ignore malformed client WS messages
    }
  });

  ws.on('close', () => {
    const set = onlineSockets.get(userId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) {
        onlineSockets.delete(userId);
        db.prepare("UPDATE users SET is_online = 0, last_seen_at = datetime('now') WHERE id = ?").run(userId);
      }
    }
  });
});

// Apply CSRF protection to all mutating API requests when authenticated (skip public webhooks & auth entrypoints)
app.use('/api', (req, res, next) => {
  if (
    req.path === '/auth/login' ||
    req.path === '/auth/register' ||
    req.path === '/auth/forgot-password' ||
    req.path === '/auth/reset-password' ||
    req.path.startsWith('/premium/webhook/')
  ) {
    next();
    return;
  }
  requireCsrf(req as AuthenticatedRequest, res, next);
});

// ========================
// PUBLIC & LANDING ROUTES
// ========================
app.get('/api/public/landing', (_req, res) => {
  const activeMembers = (
    db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'active'").get() as { c: number }
  ).c;
  const verifiedMembers = (
    db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'active' AND is_verified = 1").get() as { c: number }
  ).c;
  const settingsRows = db.prepare('SELECT setting_key, setting_value FROM site_settings').all() as Array<{
    setting_key: string;
    setting_value: string;
  }>;
  const settings: Record<string, string> = {};
  for (const r of settingsRows) settings[r.setting_key] = r.setting_value;

  const plans = db
    .prepare('SELECT id, slug, name, duration_months, price_fcfa, is_popular, features_json, active FROM subscription_plans WHERE active = 1 ORDER BY duration_months ASC')
    .all() as Array<{
    id: number;
    slug: string;
    name: string;
    duration_months: number;
    price_fcfa: number;
    is_popular: number;
    features_json: string;
    active: number;
  }>;

  const totalMatches = (db.prepare('SELECT COUNT(*) as c FROM matches').get() as { c: number }).c;
  const countriesCount = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT up.country) as c
         FROM user_profiles up
         JOIN users u ON u.id = up.user_id
         WHERE u.status = 'active' AND up.country != ''`
      )
      .get() as { c: number }
  ).c;

  const previewRows = db
    .prepare(
      `SELECT up.full_name, up.birth_date, up.city, up.country, up.avatar_url, u.is_verified
       FROM user_profiles up
       JOIN users u ON u.id = up.user_id
       WHERE u.status = 'active' AND u.profile_visible = 1 AND u.role = 'user'
       ORDER BY u.is_verified DESC, u.id ASC
       LIMIT 3`
    )
    .all() as Array<{
    full_name: string;
    birth_date: string;
    city: string;
    country: string;
    avatar_url: string;
    is_verified: number;
  }>;

  const previewProfiles = previewRows.map((p) => ({
    first_name: p.full_name.trim().split(/\s+/)[0] || p.full_name,
    age: computeAge(p.birth_date),
    city: p.city,
    country: p.country,
    avatar_url: p.avatar_url,
    is_verified: Boolean(p.is_verified),
  }));

  const interests = db.prepare('SELECT id, name, category FROM interests ORDER BY name ASC').all();

  res.json({
    active_members: activeMembers,
    verified_members: verifiedMembers,
    total_matches: totalMatches,
    countries_count: countriesCount,
    preview_profiles: previewProfiles,
    settings,
    plans: plans.map((p) => ({
      ...p,
      is_popular: Boolean(p.is_popular),
      active: Boolean(p.active),
      features: JSON.parse(p.features_json),
    })),
    interests,
  });
});

// ========================
// AUTH ROUTES
// ========================
app.post('/api/auth/register', (req, res) => {
  const ip = req.ip || 'unknown';
  const rate = checkRateLimit(`register:${ip}`, 15, 15 * 60 * 1000);
  if (!rate.allowed) {
    res.status(429).json({ error: `Trop de tentatives. Réessayez dans ${rate.retryAfterSec}s.` });
    return;
  }

  const {
    full_name,
    email,
    password,
    password_confirm,
    birth_date,
    gender,
    seeking_gender,
    country,
    city,
    accepted_terms,
  } = req.body ?? {};

  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
    res.status(400).json({ error: 'Veuillez renseigner votre nom et prénom.' });
    return;
  }
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    res.status(400).json({ error: 'Adresse email invalide.' });
    return;
  }
  if (!password || String(password).length < 8) {
    res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    return;
  }
  if (password !== password_confirm) {
    res.status(400).json({ error: 'Les mots de passe ne correspondent pas.' });
    return;
  }
  const age = computeAge(String(birth_date || ''));
  if (!birth_date || age < 18 || age > 100) {
    res.status(400).json({ error: 'Vous devez avoir au moins 18 ans pour rejoindre ZOLA.' });
    return;
  }
  if (!['Femme', 'Homme'].includes(gender)) {
    res.status(400).json({ error: 'Veuillez sélectionner votre genre.' });
    return;
  }
  if (!country || !city) {
    res.status(400).json({ error: 'Veuillez indiquer votre pays et votre ville.' });
    return;
  }
  if (!accepted_terms) {
    res.status(400).json({ error: "Vous devez accepter les conditions d'utilisation." });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    res.status(409).json({ error: 'Un compte existe déjà avec cette adresse email.' });
    return;
  }

  const defaultAvatar =
    gender === 'Femme'
      ? '/media/zola_register_woman_1794726545235.jpg'
      : '/media/zola_login_man_1794726545582.jpg';

  const passwordHash = hashPassword(String(password));
  const countryCode = resolveCountryCode(String(country));

  const tx = db.transaction(() => {
    const uInfo = db
      .prepare("INSERT INTO users (email, password_hash, role, status, is_verified, is_online) VALUES (?, ?, 'user', 'active', 0, 1)")
      .run(cleanEmail, passwordHash);
    const uid = Number(uInfo.lastInsertRowid);
    db.prepare(
      `INSERT INTO user_profiles (user_id, full_name, birth_date, gender, seeking_gender, country, country_code, city, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(uid, full_name.trim(), birth_date, gender, seeking_gender || 'Tous', country.trim(), countryCode, city.trim(), defaultAvatar);
    db.prepare('INSERT INTO profile_photos (user_id, photo_url, is_primary) VALUES (?, ?, 1)').run(uid, defaultAvatar);
    return uid;
  });

  const userId = tx();
  const { cookieValue, csrfToken, maxAgeMs } = createSessionCookie(
    userId,
    'user',
    false,
    String(req.headers['user-agent'] || 'Navigateur Web'),
    req.ip || '0.0.0.0'
  );
  setAuthCookie(req, res, cookieValue, maxAgeMs);

  res.status(201).json({
    user: getFullUserProfile(userId, userId),
    csrfToken,
    sessionToken: cookieValue,
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password, remember_me, totp_code } = req.body ?? {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const ip = req.ip || 'unknown';
  const limitKey = `login:${ip}:${cleanEmail}`;

  const rate = checkRateLimit(limitKey, 8, 15 * 60 * 1000);
  if (!rate.allowed) {
    res.status(429).json({
      error: `Trop de tentatives de connexion. Patientez ${rate.retryAfterSec} secondes.`,
    });
    return;
  }

  const user = db
    .prepare('SELECT id, password_hash, role, status, two_factor_enabled, two_factor_secret FROM users WHERE email = ?')
    .get(cleanEmail) as
    | {
        id: number;
        password_hash: string;
        role: string;
        status: string;
        two_factor_enabled: number;
        two_factor_secret: string | null;
      }
    | undefined;

  if (!user || !verifyPassword(String(password || ''), user.password_hash)) {
    res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    return;
  }

  if (user.status === 'suspended') {
    res.status(403).json({ error: 'Ce compte a été suspendu par la modération.' });
    return;
  }

  if (user.two_factor_enabled && user.two_factor_secret) {
    if (!totp_code) {
      res.status(200).json({ two_factor_required: true });
      return;
    }
    if (!verifyTotpCode(user.two_factor_secret, String(totp_code))) {
      res.status(401).json({ error: 'Code d’authentification à deux facteurs (2FA) invalide.' });
      return;
    }
  }

  resetRateLimit(limitKey);
  db.prepare("UPDATE users SET is_online = 1, last_seen_at = datetime('now') WHERE id = ?").run(user.id);

  const { cookieValue, csrfToken, maxAgeMs } = createSessionCookie(
    user.id,
    user.role,
    Boolean(remember_me),
    String(req.headers['user-agent'] || 'Navigateur Web'),
    ip
  );
  setAuthCookie(req, res, cookieValue, maxAgeMs);

  res.json({
    user: getFullUserProfile(user.id, user.id),
    csrfToken,
    sessionToken: cookieValue,
  });
});

app.post('/api/auth/logout', (req: AuthenticatedRequest, res) => {
  if (req.auth) {
    db.prepare("UPDATE users SET is_online = 0, last_seen_at = datetime('now') WHERE id = ?").run(req.auth.userId);
    if (req.auth.sessionId) {
      db.prepare('UPDATE user_sessions SET revoked = 1 WHERE session_id = ?').run(req.auth.sessionId);
    }
  }
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie('zola_session', {
    path: '/',
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
  });
  res.json({ ok: true });
});

app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    res.json({ user: null, csrfToken: null });
    return;
  }
  const user = getFullUserProfile(req.auth.userId, req.auth.userId);
  res.json({ user, csrfToken: req.auth.csrfToken });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail) as { id: number } | undefined;
  let resetTokenPreview: string | undefined;
  let emailDispatched = false;
  if (user) {
    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    db.prepare(
      "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+1 hour'))"
    ).run(user.id, tokenHash);

    emailDispatched = await sendTransactionalEmail(
      cleanEmail,
      'ZOLA — Réinitialisation de votre mot de passe',
      `<p>Utilisez ce jeton pour réinitialiser votre mot de passe ZOLA (valable 1 heure) : <strong>${rawToken}</strong></p>`
    );

    if (!emailDispatched) {
      resetTokenPreview = rawToken;
    }
  }
  res.json({
    message: emailDispatched
      ? 'Un email contenant votre jeton de réinitialisation vient d’être envoyé.'
      : 'Si un compte correspond à cet email, un jeton de réinitialisation a été généré.',
    dev_reset_token: resetTokenPreview,
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { token, new_password } = req.body ?? {};
  if (!token || !new_password || String(new_password).length < 8) {
    res.status(400).json({ error: 'Jeton invalide ou mot de passe trop court (8 caractères min.).' });
    return;
  }
  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const record = db
    .prepare(
      "SELECT id, user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND datetime(expires_at) > datetime('now')"
    )
    .get(tokenHash) as { id: number; user_id: number } | undefined;

  if (!record) {
    res.status(400).json({ error: 'Ce lien de réinitialisation est expiré ou invalide.' });
    return;
  }

  const newHash = hashPassword(String(new_password));
  db.transaction(() => {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, record.user_id);
    db.prepare("UPDATE password_resets SET used_at = datetime('now') WHERE id = ?").run(record.id);
  })();

  res.json({ ok: true, message: 'Mot de passe mis à jour avec succès.' });
});

// ========================
// DISCOVER, PASSES & LIKES / MATCHES
// ========================
app.get('/api/discover', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const search = String(req.query.search || '').trim().toLowerCase();
  const country = String(req.query.country || '').trim();
  const city = String(req.query.city || '').trim().toLowerCase();
  const gender = String(req.query.gender || '').trim();
  const minAge = Number(req.query.minAge || 18);
  const maxAge = Number(req.query.maxAge || 99);
  const interestId = Number(req.query.interestId || 0);
  const verifiedOnly = req.query.verifiedOnly === '1';
  const sortMode = String(req.query.sort || 'compatibility');
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(48, Math.max(4, Number(req.query.limit || 12)));

  const rows = db
    .prepare(
      `SELECT u.id
       FROM users u
       JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id != ?
         AND u.status = 'active'
         AND u.profile_visible = 1
         AND u.id NOT IN (SELECT to_user_id FROM passes WHERE from_user_id = ?)
         AND u.id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = ?)
         AND u.id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = ?)
       ORDER BY EXISTS(SELECT 1 FROM profile_boosts pb WHERE pb.user_id = u.id AND datetime(pb.expires_at) > datetime('now')) DESC,
                u.is_online DESC,
                datetime(u.last_seen_at) DESC`
    )
    .all(meId, meId, meId, meId) as Array<{ id: number }>;

  const filtered = rows
    .map((r) => getFullUserProfile(r.id, meId))
    .filter((p): p is NonNullable<typeof p> => {
      if (!p) return false;
      if (search) {
        const hay = `${p.full_name} ${p.city} ${p.country} ${p.profession} ${p.bio}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      if (country && p.country !== country) return false;
      if (city && !p.city.toLowerCase().includes(city)) return false;
      if (gender && gender !== 'Tous' && p.gender !== gender) return false;
      if (p.age < minAge || p.age > maxAge) return false;
      if (verifiedOnly && !p.is_verified) return false;
      if (interestId > 0 && !p.interests.some((i) => i.id === interestId)) return false;
      return true;
    });

  if (sortMode === 'compatibility') {
    filtered.sort((a, b) => {
      const boostDiff = Number(Boolean(b.is_boosted)) - Number(Boolean(a.is_boosted));
      if (boostDiff !== 0) return boostDiff;
      return (b.compatibility_score || 0) - (a.compatibility_score || 0);
    });
  }

  const total = filtered.length;
  const offset = (page - 1) * limit;
  const profiles = filtered.slice(offset, offset + limit);
  const passedCount = (
    db.prepare('SELECT COUNT(*) as c FROM passes WHERE from_user_id = ?').get(meId) as { c: number }
  ).c;

  res.json({
    profiles,
    total,
    page,
    hasMore: offset + profiles.length < total,
    passed_count: passedCount,
  });
});

app.post('/api/passes/:targetId', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const targetId = Number(req.params.targetId);
  if (!targetId || targetId === meId) {
    res.status(400).json({ error: 'Profil cible invalide.' });
    return;
  }
  db.prepare('INSERT OR IGNORE INTO passes (from_user_id, to_user_id) VALUES (?, ?)').run(meId, targetId);
  res.json({ ok: true });
});

app.delete('/api/passes', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare('DELETE FROM passes WHERE from_user_id = ?').run(req.auth!.userId);
  res.json({ ok: true });
});

app.get('/api/likes/received', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const me = getFullUserProfile(meId, meId);
  const rows = db
    .prepare(
      `SELECT l.from_user_id
       FROM likes l
       JOIN users u ON u.id = l.from_user_id
       WHERE l.to_user_id = ?
         AND u.status = 'active'
         AND l.from_user_id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = ?)
         AND l.from_user_id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = ?)
       ORDER BY l.created_at DESC`
    )
    .all(meId, meId, meId) as Array<{ from_user_id: number }>;

  if (!me?.is_premium) {
    res.json({ locked: true, count: rows.length, profiles: [] });
    return;
  }

  const profiles = rows
    .map((r) => getFullUserProfile(r.from_user_id, meId))
    .filter(Boolean);
  res.json({ locked: false, count: rows.length, profiles });
});

app.post('/api/likes/:targetId', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const targetId = Number(req.params.targetId);
  const isSuper = Boolean(req.body?.is_super);
  if (!targetId || targetId === meId) {
    res.status(400).json({ error: 'Profil cible invalide.' });
    return;
  }

  const isBlocked = db
    .prepare(
      'SELECT 1 FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)'
    )
    .get(meId, targetId, targetId, meId);
  if (isBlocked) {
    res.status(403).json({ error: 'Action impossible : ce profil est bloqué.' });
    return;
  }

  const targetUser = getFullUserProfile(targetId, meId);
  if (!targetUser || targetUser.status !== 'active') {
    res.status(404).json({ error: 'Membre introuvable.' });
    return;
  }

  const existingLike = db
    .prepare('SELECT id, is_super FROM likes WHERE from_user_id = ? AND to_user_id = ?')
    .get(meId, targetId) as { id: number; is_super: number } | undefined;

  if (existingLike) {
    res.json({
      liked: true,
      is_super: Boolean(existingLike.is_super),
      matched: targetUser.is_match,
      partner: targetUser,
    });
    return;
  }

  const meUser = getFullUserProfile(meId, meId)!;

  if (isSuper) {
    const usedToday = (
      db
        .prepare(
          "SELECT COUNT(*) as c FROM likes WHERE from_user_id = ? AND is_super = 1 AND date(created_at) = date('now')"
        )
        .get(meId) as { c: number }
    ).c;
    const quota = meUser.is_premium ? 5 : 1;
    if (usedToday >= quota) {
      res.status(429).json({
        error: meUser.is_premium
          ? 'Quota quotidien de 5 Super-Likes atteint.'
          : 'Quota de 1 Super-Like gratuit par jour atteint. Passez à Premium pour en envoyer 5/jour.',
      });
      return;
    }
  }

  const result = db.transaction(() => {
    db.prepare('INSERT INTO likes (from_user_id, to_user_id, is_super) VALUES (?, ?, ?)').run(
      meId,
      targetId,
      isSuper ? 1 : 0
    );

    const mutual = db
      .prepare('SELECT id FROM likes WHERE from_user_id = ? AND to_user_id = ?')
      .get(targetId, meId);

    if (!mutual) {
      if (targetUser.notify_matches) {
        db.prepare(
          'INSERT INTO notifications (user_id, type, title, body, related_user_id) VALUES (?, ?, ?, ?, ?)'
        ).run(
          targetId,
          'like',
          isSuper ? 'Coup de cœur ZOLA !' : 'Nouveau J’aime',
          isSuper
            ? `${meUser.first_name} vous a envoyé un Coup de cœur prioritaire.`
            : `${meUser.first_name} a aimé votre profil.`,
          meId
        );
      }
      return { matched: false, conversationId: null };
    }

    const u1 = Math.min(meId, targetId);
    const u2 = Math.max(meId, targetId);
    db.prepare('INSERT OR IGNORE INTO matches (user_one_id, user_two_id) VALUES (?, ?)').run(u1, u2);
    const matchRow = db
      .prepare('SELECT id FROM matches WHERE user_one_id = ? AND user_two_id = ?')
      .get(u1, u2) as { id: number };

    db.prepare('INSERT OR IGNORE INTO conversations (match_id) VALUES (?)').run(matchRow.id);
    const convRow = db
      .prepare('SELECT id FROM conversations WHERE match_id = ?')
      .get(matchRow.id) as { id: number };

    db.prepare('INSERT OR IGNORE INTO conversation_members (conversation_id, user_id) VALUES (?, ?)').run(convRow.id, meId);
    db.prepare('INSERT OR IGNORE INTO conversation_members (conversation_id, user_id) VALUES (?, ?)').run(convRow.id, targetId);

    db.prepare(
      'INSERT INTO notifications (user_id, type, title, body, related_user_id) VALUES (?, ?, ?, ?, ?)'
    ).run(targetId, 'match', "C'est un Match !", `${meUser.first_name} et vous vous plaisez mutuellement.`, meId);

    db.prepare(
      'INSERT INTO notifications (user_id, type, title, body, related_user_id) VALUES (?, ?, ?, ?, ?)'
    ).run(meId, 'match', "C'est un Match !", `${targetUser.first_name} et vous vous plaisez mutuellement.`, targetId);

    return { matched: true, conversationId: convRow.id };
  })();

  if (result.matched) {
    broadcastToUser(targetId, 'match:created', {
      conversationId: result.conversationId,
      partner: meUser,
    });
    broadcastToUser(targetId, 'notification:new', { type: 'match' });
  } else {
    broadcastToUser(targetId, 'notification:new', { type: 'like' });
  }

  res.json({
    liked: true,
    is_super: isSuper,
    matched: result.matched,
    conversationId: result.conversationId,
    partner: targetUser,
  });
});

app.post('/api/boost', requireAuth, (req: AuthenticatedRequest, res) => {
  const me = getFullUserProfile(req.auth!.userId, req.auth!.userId);
  if (!me?.is_premium) {
    res.status(403).json({ error: 'Fonctionnalité réservée aux membres Premium.' });
    return;
  }
  db.prepare("INSERT INTO profile_boosts (user_id, expires_at) VALUES (?, datetime('now', '+30 minutes'))").run(
    req.auth!.userId
  );
  db.prepare("UPDATE users SET last_seen_at = datetime('now') WHERE id = ?").run(req.auth!.userId);
  res.json({ ok: true, message: 'Votre profil est propulsé en tête des découvertes pendant 30 minutes.' });
});

// ========================
// IDENTITY VERIFICATION REQUESTS
// ========================
app.get('/api/verification/status', requireAuth, (req: AuthenticatedRequest, res) => {
  const latest = db
    .prepare(
      'SELECT id, user_id, challenge_code, status, admin_note, created_at, reviewed_at FROM verification_requests WHERE user_id = ? ORDER BY id DESC LIMIT 1'
    )
    .get(req.auth!.userId);
  res.json({ request: latest || null });
});

app.post('/api/verification/request', requireAuth, uploadVerification.single('selfie'), (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Veuillez joindre un selfie valide.' });
    return;
  }
  const filePath = req.file.path;
  if (!validateMagicBytes(filePath, 'image')) {
    fs.unlinkSync(filePath);
    res.status(400).json({ error: 'Le fichier envoyé ne correspond pas à une image valide.' });
    return;
  }
  stripJpegExifInPlace(filePath);

  const challengeCode = String(req.body?.challenge_code || 'ZOLA-CHECK').slice(0, 24);
  db.prepare(
    "INSERT INTO verification_requests (user_id, selfie_url, challenge_code, status) VALUES (?, ?, ?, 'pending')"
  ).run(req.auth!.userId, req.file.filename, challengeCode);

  res.status(201).json({ ok: true, message: 'Demande de vérification envoyée à la modération.' });
});

// ========================
// MEMBER PROFILE, REPORT & BLOCK
// ========================
app.get('/api/users/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const targetId = Number(req.params.id);
  const blocked = db
    .prepare(
      'SELECT 1 FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)'
    )
    .get(meId, targetId, targetId, meId);
  if (blocked) {
    res.status(404).json({ error: 'Ce profil est inaccessible.' });
    return;
  }
  const profile = getFullUserProfile(targetId, meId);
  if (!profile) {
    res.status(404).json({ error: 'Profil introuvable.' });
    return;
  }
  res.json({ profile });
});

// ========================
// FAVORITES (SAVED PROFILES)
// ========================
app.get('/api/favorites', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const rows = db
    .prepare(
      `SELECT f.favorite_user_id, f.created_at as favorited_at
       FROM favorites f
       JOIN users u ON u.id = f.favorite_user_id
       WHERE f.user_id = ?
         AND u.status = 'active'
         AND u.profile_visible = 1
         AND f.favorite_user_id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = ?)
         AND f.favorite_user_id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = ?)
       ORDER BY datetime(f.created_at) DESC`
    )
    .all(meId, meId, meId) as Array<{ favorite_user_id: number; favorited_at: string }>;

  const profiles = rows
    .map((r) => {
      const p = getFullUserProfile(r.favorite_user_id, meId);
      return p ? { ...p, favorited_at: r.favorited_at } : null;
    })
    .filter(Boolean);

  res.json({ profiles, count: profiles.length });
});

app.post('/api/favorites/:targetId', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const targetId = Number(req.params.targetId);
  if (!Number.isInteger(targetId) || targetId <= 0 || targetId === meId) {
    res.status(400).json({ error: 'Profil cible invalide.' });
    return;
  }

  const isBlocked = db
    .prepare(
      'SELECT 1 FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)'
    )
    .get(meId, targetId, targetId, meId);
  if (isBlocked) {
    res.status(403).json({ error: 'Ce profil est inaccessible.' });
    return;
  }

  const targetUser = db
    .prepare("SELECT id FROM users WHERE id = ? AND status = 'active'")
    .get(targetId);
  if (!targetUser) {
    res.status(404).json({ error: 'Profil introuvable.' });
    return;
  }

  const existing = db
    .prepare('SELECT 1 FROM favorites WHERE user_id = ? AND favorite_user_id = ?')
    .get(meId, targetId);

  let isFavorite = false;
  if (existing) {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND favorite_user_id = ?').run(meId, targetId);
    isFavorite = false;
  } else {
    db.prepare('INSERT INTO favorites (user_id, favorite_user_id) VALUES (?, ?)').run(meId, targetId);
    isFavorite = true;
  }

  const count = (
    db
      .prepare(
        `SELECT COUNT(*) as c
         FROM favorites f
         JOIN users u ON u.id = f.favorite_user_id
         WHERE f.user_id = ?
           AND u.status = 'active'
           AND u.profile_visible = 1
           AND f.favorite_user_id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = ?)
           AND f.favorite_user_id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = ?)`
      )
      .get(meId, meId, meId) as { c: number }
  ).c;

  res.json({
    ok: true,
    is_favorite: isFavorite,
    count,
    message: isFavorite ? 'Profil ajouté à vos favoris !' : 'Profil retiré de vos favoris.',
  });
});

app.delete('/api/favorites/:targetId', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const targetId = Number(req.params.targetId);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    res.status(400).json({ error: 'Profil cible invalide.' });
    return;
  }

  db.prepare('DELETE FROM favorites WHERE user_id = ? AND favorite_user_id = ?').run(meId, targetId);

  const count = (
    db
      .prepare(
        `SELECT COUNT(*) as c
         FROM favorites f
         JOIN users u ON u.id = f.favorite_user_id
         WHERE f.user_id = ?
           AND u.status = 'active'
           AND u.profile_visible = 1
           AND f.favorite_user_id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = ?)
           AND f.favorite_user_id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = ?)`
      )
      .get(meId, meId, meId) as { c: number }
  ).c;

  res.json({
    ok: true,
    is_favorite: false,
    count,
    message: 'Profil retiré de vos favoris.',
  });
});

app.post('/api/users/:id/report', requireAuth, (req: AuthenticatedRequest, res) => {
  const targetId = Number(req.params.id);
  const reason = String(req.body?.reason || '').trim();
  const details = String(req.body?.details || '').trim();
  if (!reason) {
    res.status(400).json({ error: 'Veuillez sélectionner un motif de signalement.' });
    return;
  }
  db.prepare(
    'INSERT INTO reports (reporter_id, reported_user_id, reason, details) VALUES (?, ?, ?, ?)'
  ).run(req.auth!.userId, targetId, reason, details);
  res.json({ ok: true, message: 'Signalement transmis à notre équipe de modération.' });
});

function getUserConversations(meId: number) {
  const rows = db
    .prepare(
      `SELECT c.id, c.match_id, cm_other.user_id as partner_id,
              p.full_name, p.avatar_url, p.city, p.country_code,
              u.is_online, u.is_verified,
              (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) as last_message,
              (SELECT m.image_url FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) as last_message_image,
              (SELECT m.audio_url FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) as last_message_audio,
              (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) as last_message_at,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = 0) as unread_count
       FROM conversations c
       JOIN conversation_members cm_me ON cm_me.conversation_id = c.id AND cm_me.user_id = ?
       JOIN conversation_members cm_other ON cm_other.conversation_id = c.id AND cm_other.user_id != ?
       JOIN users u ON u.id = cm_other.user_id
       JOIN user_profiles p ON p.user_id = u.id
       WHERE u.status = 'active'
         AND u.id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = ?)
         AND u.id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = ?)
       ORDER BY COALESCE(last_message_at, c.created_at) DESC`
    )
    .all(meId, meId, meId, meId, meId) as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: Number(r.id),
    match_id: Number(r.match_id),
    partner: {
      id: Number(r.partner_id),
      full_name: String(r.full_name),
      first_name: String(r.full_name).split(' ')[0],
      avatar_url: String(r.avatar_url),
      is_online: Boolean(r.is_online),
      is_verified: Boolean(r.is_verified),
      city: String(r.city),
      country_code: String(r.country_code),
    },
    last_message: r.last_message ? String(r.last_message) : null,
    last_message_image: r.last_message_image ? String(r.last_message_image) : null,
    last_message_audio: r.last_message_audio ? String(r.last_message_audio) : null,
    last_message_at: r.last_message_at ? String(r.last_message_at) : null,
    unread_count: Number(r.unread_count || 0),
  }));
}

app.post('/api/users/:id/block', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId) || targetId <= 0 || targetId === meId) {
    res.status(400).json({ error: 'Action impossible.' });
    return;
  }

  const targetExists = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
  if (!targetExists) {
    res.status(404).json({ error: 'Profil introuvable.' });
    return;
  }

  const cleanupResult = db.transaction(() => {
    db.prepare('INSERT OR IGNORE INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)').run(meId, targetId);

    // Supprimer les likes mutuels et éventuels likes en attente entre les deux profils
    db.prepare(
      'DELETE FROM likes WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)'
    ).run(meId, targetId, targetId, meId);

    // Supprimer le match et la conversation privée associée (messages, réactions, membres)
    const u1 = Math.min(meId, targetId);
    const u2 = Math.max(meId, targetId);
    const matchRows = db
      .prepare('SELECT id FROM matches WHERE user_one_id = ? AND user_two_id = ?')
      .all(u1, u2) as Array<{ id: number }>;

    let deletedConversations = 0;
    for (const m of matchRows) {
      const convRows = db
        .prepare('SELECT id FROM conversations WHERE match_id = ?')
        .all(m.id) as Array<{ id: number }>;
      for (const c of convRows) {
        db.prepare(
          'DELETE FROM message_reactions WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = ?)'
        ).run(c.id);
        db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(c.id);
        db.prepare('DELETE FROM conversation_members WHERE conversation_id = ?').run(c.id);
        db.prepare('DELETE FROM conversations WHERE id = ?').run(c.id);
        deletedConversations++;
      }
    }

    const matchDeleteInfo = db
      .prepare('DELETE FROM matches WHERE user_one_id = ? AND user_two_id = ?')
      .run(u1, u2);

    // Nettoyer les notifications liées entre les deux membres
    db.prepare(
      'DELETE FROM notifications WHERE (user_id = ? AND related_user_id = ?) OR (user_id = ? AND related_user_id = ?)'
    ).run(meId, targetId, targetId, meId);

    // Retirer des favoris dans les deux sens
    db.prepare(
      'DELETE FROM favorites WHERE (user_id = ? AND favorite_user_id = ?) OR (user_id = ? AND favorite_user_id = ?)'
    ).run(meId, targetId, targetId, meId);

    return {
      deletedMatches: matchDeleteInfo.changes,
      deletedConversations,
    };
  })();

  const conversations = getUserConversations(meId);

  broadcastToUser(targetId, 'user:blocked', {
    blockedByUserId: meId,
    blockedUserId: targetId,
  });
  broadcastToUser(meId, 'user:blocked', {
    blockedByUserId: meId,
    blockedUserId: targetId,
  });

  res.json({
    ok: true,
    message: 'Utilisateur bloqué. Vos matchs et conversations avec ce profil ont été supprimés.',
    blocked_user_id: targetId,
    deleted_matches: cleanupResult.deletedMatches,
    deleted_conversations: cleanupResult.deletedConversations,
    conversations,
  });
});

// ========================
// MESSAGING (TEXT, PHOTO, VOICE AUDIO, REAL-TIME)
// ========================
app.get('/api/messages/conversations', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  res.json({ conversations: getUserConversations(meId) });
});

app.get('/api/messages/conversations/:convId', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const convId = Number(req.params.convId);
  const member = db
    .prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?')
    .get(convId, meId);
  if (!member) {
    res.status(403).json({ error: 'Accès refusé à cette conversation.' });
    return;
  }

  const otherMember = db
    .prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?')
    .get(convId, meId) as { user_id: number } | undefined;

  if (otherMember) {
    const blocked = db
      .prepare(
        'SELECT 1 FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)'
      )
      .get(meId, otherMember.user_id, otherMember.user_id, meId);
    if (blocked) {
      res.status(403).json({ error: 'Cette conversation est inaccessible.' });
      return;
    }
  }

  db.prepare('UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ? AND is_read = 0').run(
    convId,
    meId
  );

  if (otherMember) {
    broadcastToUser(otherMember.user_id, 'messages:read', { conversationId: convId });
  }

  const messages = db
    .prepare('SELECT id, conversation_id, sender_id, content, image_url, audio_url, is_read, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC')
    .all(convId) as Array<Record<string, unknown>>;

  const reactionRows = db
    .prepare(
      `SELECT mr.message_id, mr.emoji, COUNT(*) as cnt,
              MAX(CASE WHEN mr.user_id = ? THEN 1 ELSE 0 END) as reacted_by_me
       FROM message_reactions mr
       JOIN messages m ON m.id = mr.message_id
       WHERE m.conversation_id = ?
       GROUP BY mr.message_id, mr.emoji`
    )
    .all(meId, convId) as Array<{ message_id: number; emoji: string; cnt: number; reacted_by_me: number }>;

  const reactionsByMsg = new Map<number, Array<{ emoji: string; count: number; reacted_by_me: boolean }>>();
  for (const r of reactionRows) {
    const arr = reactionsByMsg.get(r.message_id) || [];
    arr.push({ emoji: r.emoji, count: r.cnt, reacted_by_me: Boolean(r.reacted_by_me) });
    reactionsByMsg.set(r.message_id, arr);
  }

  res.json({
    messages: messages.map((m) => ({
      id: Number(m.id),
      conversation_id: Number(m.conversation_id),
      sender_id: Number(m.sender_id),
      content: String(m.content),
      image_url: m.image_url ? String(m.image_url) : null,
      audio_url: m.audio_url ? String(m.audio_url) : null,
      is_read: Boolean(m.is_read),
      created_at: String(m.created_at),
      reactions: reactionsByMsg.get(Number(m.id)) || [],
    })),
  });
});

app.get('/api/rtc/config', requireAuth, (_req, res) => {
  const iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
    { urls: 'stun:stun.l.google.com:19302' },
  ];
  if (process.env.TURN_URL) {
    iceServers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME || undefined,
      credential: process.env.TURN_CREDENTIAL || undefined,
    });
  }
  res.json({ iceServers });
});

app.post('/api/messages/:messageId/react', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const msgId = Number(req.params.messageId);
  const emoji = String(req.body?.emoji || '').trim();
  const allowedEmojis = ['❤️', '😊', '🔥', '😂', '👏', '🙏'];
  if (!allowedEmojis.includes(emoji)) {
    res.status(400).json({ error: 'Réaction non autorisée.' });
    return;
  }

  const msg = db.prepare('SELECT id, conversation_id FROM messages WHERE id = ?').get(msgId) as
    | { id: number; conversation_id: number }
    | undefined;
  if (!msg) {
    res.status(404).json({ error: 'Message introuvable.' });
    return;
  }
  const isMember = db
    .prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?')
    .get(msg.conversation_id, meId);
  if (!isMember) {
    res.status(403).json({ error: 'Accès refusé.' });
    return;
  }

  const existing = db
    .prepare('SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?')
    .get(msgId, meId, emoji) as { id: number } | undefined;

  if (existing) {
    db.prepare('DELETE FROM message_reactions WHERE id = ?').run(existing.id);
  } else {
    db.prepare('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)').run(msgId, meId, emoji);
  }

  const updated = db
    .prepare(
      `SELECT emoji, COUNT(*) as cnt, MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) as reacted_by_me
       FROM message_reactions WHERE message_id = ? GROUP BY emoji`
    )
    .all(meId, msgId) as Array<{ emoji: string; cnt: number; reacted_by_me: number }>;

  const reactions = updated.map((r) => ({
    emoji: r.emoji,
    count: r.cnt,
    reacted_by_me: Boolean(r.reacted_by_me),
  }));

  const otherMember = db
    .prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?')
    .get(msg.conversation_id, meId) as { user_id: number } | undefined;
  if (otherMember) {
    broadcastToUser(otherMember.user_id, 'message:reaction', {
      conversationId: msg.conversation_id,
      messageId: msgId,
    });
  }

  res.json({ ok: true, reactions });
});

app.post(
  '/api/messages/conversations/:convId',
  requireAuth,
  uploadChatMedia.fields([
    { name: 'image', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
  ]),
  (req: AuthenticatedRequest, res) => {
    const meId = req.auth!.userId;
    const convId = Number(req.params.convId);
    const member = db
      .prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?')
      .get(convId, meId);
    if (!member) {
      res.status(403).json({ error: 'Accès refusé à cette conversation.' });
      return;
    }

    const files = (req.files || {}) as Record<string, Express.Multer.File[]>;
    const imgFile = files.image?.[0];
    const audioFile = files.audio?.[0];

    if (imgFile) {
      if (!validateMagicBytes(imgFile.path, 'image')) {
        fs.unlinkSync(imgFile.path);
        res.status(400).json({ error: 'Fichier image invalide.' });
        return;
      }
      stripJpegExifInPlace(imgFile.path);
    }

    if (audioFile) {
      if (!validateMagicBytes(audioFile.path, 'audio')) {
        fs.unlinkSync(audioFile.path);
        res.status(400).json({ error: 'Fichier audio invalide.' });
        return;
      }
    }

    const content = String(req.body?.content || '').trim();
    const imageUrl = imgFile ? `/uploads/${imgFile.filename}` : null;
    const audioUrl = audioFile ? `/uploads/${audioFile.filename}` : null;
    if (!content && !imageUrl && !audioUrl) {
      res.status(400).json({ error: 'Message vide.' });
      return;
    }

    // Anti-spam & suspicious link guard
    if (content) {
      const recentDuplicate = db
        .prepare(
          "SELECT COUNT(*) as c FROM messages WHERE sender_id = ? AND content = ? AND datetime(created_at) > datetime('now', '-2 minutes')"
        )
        .get(meId, content) as { c: number };
      if (recentDuplicate.c >= 3) {
        res.status(429).json({ error: 'Envoi trop rapide de messages identiques détecté (protection anti-spam).' });
        return;
      }
      if (/(bit\.ly|tinyurl\.com|t\.me\/|wa\.me\/|whatsapp\.com)/i.test(content)) {
        res.status(400).json({
          error: 'Par sécurité, les liens raccourcis ou redirections externes ne sont pas autorisés dans les discussions.',
        });
        return;
      }
    }

    const otherMember = db
      .prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?')
      .get(convId, meId) as { user_id: number } | undefined;

    if (otherMember) {
      const blocked = db
        .prepare(
          'SELECT 1 FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)'
        )
        .get(meId, otherMember.user_id, otherMember.user_id, meId);
      if (blocked) {
        res.status(403).json({ error: 'Impossible d’envoyer un message à cet utilisateur.' });
        return;
      }
    }

    const info = db
      .prepare('INSERT INTO messages (conversation_id, sender_id, content, image_url, audio_url, is_read) VALUES (?, ?, ?, ?, ?, 0)')
      .run(convId, meId, content, imageUrl, audioUrl);

    const inserted = db
      .prepare('SELECT id, conversation_id, sender_id, content, image_url, audio_url, is_read, created_at FROM messages WHERE id = ?')
      .get(Number(info.lastInsertRowid)) as Record<string, unknown>;

    const formatted = {
      id: Number(inserted.id),
      conversation_id: Number(inserted.conversation_id),
      sender_id: Number(inserted.sender_id),
      content: String(inserted.content),
      image_url: inserted.image_url ? String(inserted.image_url) : null,
      audio_url: inserted.audio_url ? String(inserted.audio_url) : null,
      is_read: Boolean(inserted.is_read),
      created_at: String(inserted.created_at),
      reactions: [],
    };

    if (otherMember) {
      const me = getFullUserProfile(meId, meId);
      const partner = db
        .prepare('SELECT notify_messages FROM users WHERE id = ?')
        .get(otherMember.user_id) as { notify_messages: number } | undefined;
      if (partner?.notify_messages) {
        db.prepare(
          'INSERT INTO notifications (user_id, type, title, body, related_user_id) VALUES (?, ?, ?, ?, ?)'
        ).run(
          otherMember.user_id,
          'message',
          `Message de ${me?.first_name || 'ZOLA'}`,
          content ? content.slice(0, 80) : audioUrl ? 'Message vocal reçu.' : 'A envoyé une photo.',
          meId
        );
      }
      broadcastToUser(otherMember.user_id, 'message:new', formatted);
      broadcastToUser(otherMember.user_id, 'notification:new', { type: 'message' });
    }

    res.status(201).json({ message: formatted });
  }
);

// ========================
// NOTIFICATIONS
// ========================
app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const rows = db
    .prepare(
      `SELECT n.id, n.type, n.title, n.body, n.related_user_id, n.is_read, n.created_at,
              p.full_name as related_user_name, p.avatar_url as related_user_avatar
       FROM notifications n
       LEFT JOIN user_profiles p ON p.user_id = n.related_user_id
       WHERE n.user_id = ?
         AND (n.related_user_id IS NULL OR (
           n.related_user_id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = ?)
           AND n.related_user_id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = ?)
         ))
       ORDER BY n.id DESC
       LIMIT 50`
    )
    .all(meId, meId, meId) as Array<Record<string, unknown>>;

  res.json({
    notifications: rows.map((r) => ({
      id: Number(r.id),
      type: String(r.type),
      title: String(r.title),
      body: String(r.body),
      related_user_id: r.related_user_id ? Number(r.related_user_id) : null,
      related_user_name: r.related_user_name ? String(r.related_user_name) : undefined,
      related_user_avatar: r.related_user_avatar ? String(r.related_user_avatar) : undefined,
      is_read: Boolean(r.is_read),
      created_at: String(r.created_at),
    })),
  });
});

app.post('/api/notifications/read', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.auth!.userId);
  res.json({ ok: true });
});

// ========================
// PROFILE EDIT & PHOTOS (WITH MAGIC BYTES & EXIF STRIPPING)
// ========================
app.put('/api/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const {
    full_name,
    birth_date,
    gender,
    seeking_gender,
    country,
    city,
    profession,
    height_cm,
    zodiac_sign,
    bio,
    interest_ids,
  } = req.body ?? {};

  if (!full_name || String(full_name).trim().length < 2) {
    res.status(400).json({ error: 'Le nom complet est requis.' });
    return;
  }
  const age = computeAge(String(birth_date || ''));
  if (!birth_date || age < 18 || age > 100) {
    res.status(400).json({ error: 'Date de naissance invalide (18 ans minimum).' });
    return;
  }

  const countryCode = resolveCountryCode(String(country || ''));
  db.transaction(() => {
    db.prepare(
      `UPDATE user_profiles
       SET full_name = ?, birth_date = ?, gender = ?, seeking_gender = ?, country = ?, country_code = ?,
           city = ?, profession = ?, height_cm = ?, zodiac_sign = ?, bio = ?
       WHERE user_id = ?`
    ).run(
      String(full_name).trim(),
      birth_date,
      gender || 'Femme',
      seeking_gender || 'Tous',
      String(country || '').trim(),
      countryCode,
      String(city || '').trim(),
      String(profession || '').trim(),
      height_cm ? Number(height_cm) : null,
      String(zodiac_sign || '').trim(),
      String(bio || '').trim(),
      meId
    );

    if (Array.isArray(interest_ids)) {
      db.prepare('DELETE FROM user_interests WHERE user_id = ?').run(meId);
      const stmt = db.prepare('INSERT OR IGNORE INTO user_interests (user_id, interest_id) VALUES (?, ?)');
      for (const iid of interest_ids) {
        stmt.run(meId, Number(iid));
      }
    }
  })();

  res.json({ user: getFullUserProfile(meId, meId) });
});

app.post('/api/profile/photo', requireAuth, uploadImage.single('photo'), (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Aucune image valide fournie.' });
    return;
  }
  if (!validateMagicBytes(req.file.path, 'image')) {
    fs.unlinkSync(req.file.path);
    res.status(400).json({ error: 'Contenu de fichier image corrompu ou non autorisé.' });
    return;
  }
  stripJpegExifInPlace(req.file.path);

  const meId = req.auth!.userId;
  const photoUrl = `/uploads/${req.file.filename}`;
  const isPrimary = req.body?.is_primary === '1' || req.body?.is_primary === 'true';

  db.transaction(() => {
    if (isPrimary) {
      db.prepare('UPDATE profile_photos SET is_primary = 0 WHERE user_id = ?').run(meId);
      db.prepare('UPDATE user_profiles SET avatar_url = ? WHERE user_id = ?').run(photoUrl, meId);
    }
    db.prepare('INSERT INTO profile_photos (user_id, photo_url, is_primary) VALUES (?, ?, ?)').run(
      meId,
      photoUrl,
      isPrimary ? 1 : 0
    );
  })();

  res.status(201).json({ photo_url: photoUrl, user: getFullUserProfile(meId, meId) });
});

app.delete('/api/profile/photo/:photoId', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const photoId = Number(req.params.photoId);
  const photo = db
    .prepare('SELECT id, is_primary FROM profile_photos WHERE id = ? AND user_id = ?')
    .get(photoId, meId) as { id: number; is_primary: number } | undefined;

  if (!photo) {
    res.status(404).json({ error: 'Photo introuvable.' });
    return;
  }
  if (photo.is_primary) {
    res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre photo principale.' });
    return;
  }
  db.prepare('DELETE FROM profile_photos WHERE id = ? AND user_id = ?').run(photoId, meId);
  res.json({ user: getFullUserProfile(meId, meId) });
});

// ========================
// SETTINGS
// ========================
app.put('/api/settings', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const { notify_messages, notify_matches, profile_visible } = req.body ?? {};
  db.prepare(
    'UPDATE users SET notify_messages = ?, notify_matches = ?, profile_visible = ? WHERE id = ?'
  ).run(notify_messages ? 1 : 0, notify_matches ? 1 : 0, profile_visible ? 1 : 0, meId);
  res.json({ user: getFullUserProfile(meId, meId) });
});

app.put('/api/settings/password', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const { current_password, new_password } = req.body ?? {};
  if (!new_password || String(new_password).length < 8) {
    res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
    return;
  }
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(meId) as { password_hash: string };
  if (!verifyPassword(String(current_password || ''), user.password_hash)) {
    res.status(400).json({ error: 'Mot de passe actuel incorrect.' });
    return;
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(String(new_password)), meId);
  res.json({ ok: true, message: 'Mot de passe modifié avec succès.' });
});

app.delete('/api/settings/account', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const { password } = req.body ?? {};
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(meId) as { password_hash: string };
  if (!verifyPassword(String(password || ''), user.password_hash)) {
    res.status(400).json({ error: 'Mot de passe requis pour confirmer la suppression.' });
    return;
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(meId);
  res.clearCookie('zola_session', { path: '/' });
  res.json({ ok: true });
});

app.get('/api/settings/sessions', requireAuth, (req: AuthenticatedRequest, res) => {
  const rows = db
    .prepare(
      'SELECT session_id, user_agent, ip_address, last_active_at, created_at FROM user_sessions WHERE user_id = ? AND revoked = 0 ORDER BY datetime(last_active_at) DESC'
    )
    .all(req.auth!.userId) as Array<{
    session_id: string;
    user_agent: string;
    ip_address: string;
    last_active_at: string;
    created_at: string;
  }>;

  res.json({
    sessions: rows.map((r) => ({
      ...r,
      is_current: r.session_id === req.auth!.sessionId,
    })),
  });
});

app.delete('/api/settings/sessions/:sessionId', requireAuth, (req: AuthenticatedRequest, res) => {
  const sid = String(req.params.sessionId || '');
  db.prepare('UPDATE user_sessions SET revoked = 1 WHERE session_id = ? AND user_id = ?').run(sid, req.auth!.userId);
  res.json({ ok: true });
});

app.post('/api/settings/2fa/setup', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.auth!.userId) as { email: string };
  const secret = generateTotpSecret();
  db.prepare('UPDATE users SET two_factor_secret = ? WHERE id = ?').run(secret, req.auth!.userId);
  res.json({
    secret,
    otpauth_uri: buildOtpAuthUri(user.email, secret),
  });
});

app.post('/api/settings/2fa/enable', requireAuth, (req: AuthenticatedRequest, res) => {
  const code = String(req.body?.code || '');
  const row = db.prepare('SELECT two_factor_secret FROM users WHERE id = ?').get(req.auth!.userId) as {
    two_factor_secret: string | null;
  };
  if (!row?.two_factor_secret || !verifyTotpCode(row.two_factor_secret, code)) {
    res.status(400).json({ error: 'Code TOTP invalide. Vérifiez l’heure de votre application d’authentification.' });
    return;
  }
  db.prepare('UPDATE users SET two_factor_enabled = 1 WHERE id = ?').run(req.auth!.userId);
  res.json({ ok: true, user: getFullUserProfile(req.auth!.userId, req.auth!.userId) });
});

app.post('/api/settings/2fa/disable', requireAuth, (req: AuthenticatedRequest, res) => {
  const code = String(req.body?.code || '');
  const row = db.prepare('SELECT two_factor_secret FROM users WHERE id = ?').get(req.auth!.userId) as {
    two_factor_secret: string | null;
  };
  if (row?.two_factor_secret && !verifyTotpCode(row.two_factor_secret, code)) {
    res.status(400).json({ error: 'Code 2FA invalide pour désactiver.' });
    return;
  }
  db.prepare('UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?').run(req.auth!.userId);
  res.json({ ok: true, user: getFullUserProfile(req.auth!.userId, req.auth!.userId) });
});

// ========================
// PREMIUM, GATEWAY WEBHOOK & RECEIPTS
// ========================
app.get('/api/premium/status', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const plans = db
    .prepare('SELECT id, slug, name, duration_months, price_fcfa, is_popular, features_json, active FROM subscription_plans WHERE active = 1 ORDER BY duration_months ASC')
    .all() as Array<{
    id: number;
    slug: string;
    name: string;
    duration_months: number;
    price_fcfa: number;
    is_popular: number;
    features_json: string;
    active: number;
  }>;

  const activeSub = db
    .prepare(
      `SELECT s.id, s.status, s.started_at, s.expires_at, sp.name as plan_name, sp.duration_months
       FROM subscriptions s
       JOIN subscription_plans sp ON sp.id = s.plan_id
       WHERE s.user_id = ? AND s.status = 'active' AND datetime(s.expires_at) > datetime('now')
       ORDER BY datetime(s.expires_at) DESC LIMIT 1`
    )
    .get(meId);

  const payments = db
    .prepare(
      `SELECT p.id, p.user_id, sp.name as plan_name, p.amount_fcfa, p.currency, p.provider, p.gateway, p.reference, p.status, p.checkout_url, p.created_at, p.verified_at
       FROM payments p
       JOIN subscription_plans sp ON sp.id = p.plan_id
       WHERE p.user_id = ?
       ORDER BY p.id DESC`
    )
    .all(meId);

  res.json({
    plans: plans.map((p) => ({
      ...p,
      is_popular: Boolean(p.is_popular),
      active: Boolean(p.active),
      features: JSON.parse(p.features_json),
    })),
    active_subscription: activeSub || null,
    payments,
    saspay_configured: Boolean(SASPAY_SECRET_KEY),
    saspay_mode: SASPAY_SECRET_KEY.startsWith('sk_live_') ? 'live' : 'sandbox',
  });
});

app.post('/api/premium/checkout', requireAuth, async (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const planId = Number(req.body?.plan_id);
  const provider = 'SasPay · Mobile Money & Carte';
  const gateway = 'saspay';
  const plan = db
    .prepare('SELECT id, name, duration_months, price_fcfa FROM subscription_plans WHERE id = ? AND active = 1')
    .get(planId) as { id: number; name: string; duration_months: number; price_fcfa: number } | undefined;

  if (!plan) {
    res.status(404).json({ error: 'Formule introuvable.' });
    return;
  }

  const payer = db
    .prepare(
      `SELECT u.email, COALESCE(up.full_name, u.email) as full_name
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE u.id = ?`
    )
    .get(meId) as { email: string; full_name: string } | undefined;

  const reference = `ZOLA-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const amountDecimal = plan.price_fcfa.toFixed(2);
  const signature = crypto
    .createHmac('sha256', PAYMENT_SECRET)
    .update(`${reference}:${meId}:${plan.id}:${plan.price_fcfa}`)
    .digest('hex');

  let sasSessionId: string | null = null;
  let checkoutUrl: string | null = null;

  if (SASPAY_SECRET_KEY) {
    const envAppUrl = process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL' ? process.env.APP_URL.replace(/\/+$/, '') : '';
    const appOrigin = envAppUrl || `${req.protocol}://${req.get('host')}`;
    try {
      const sasRes = await fetch(`${SASPAY_BASE_URL}/checkout-sessions/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SASPAY_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountDecimal,
          currency: 'XOF',
          description: `Abonnement ZOLA Premium - ${plan.name}`,
          reference,
          customer_email: payer?.email || '',
          customer_name: payer?.full_name || 'Membre ZOLA',
          return_url: `${appOrigin}/?saspay_ref=${encodeURIComponent(reference)}`,
        }),
      });
      const sasBodyText = await sasRes.text();
      let sasData: Record<string, unknown> = {};
      try {
        sasData = JSON.parse(sasBodyText) as Record<string, unknown>;
      } catch {
        sasData = {};
      }
      if (!sasRes.ok) {
        const errMsg =
          String(sasData.detail || sasData.message || sasData.error || '') ||
          `Erreur SasPay (${sasRes.status})`;
        res.status(502).json({ error: `Passerelle SasPay indisponible : ${errMsg}` });
        return;
      }
      const nested = (sasData.data as Record<string, unknown> | undefined) || {};
      sasSessionId = String(sasData.id || sasData.session_id || nested.id || nested.session_id || '') || null;
      checkoutUrl = String(sasData.checkout_url || sasData.url || nested.checkout_url || nested.url || '') || null;
    } catch {
      res.status(502).json({ error: 'Impossible de contacter la passerelle SasPay pour le moment.' });
      return;
    }
  }

  db.prepare(
    `INSERT INTO payments (user_id, plan_id, amount_fcfa, currency, provider, gateway, reference, verification_hmac, saspay_session_id, checkout_url, status)
     VALUES (?, ?, ?, 'XOF', ?, ?, ?, ?, ?, ?, 'pending')`
  ).run(meId, plan.id, plan.price_fcfa, provider, gateway, reference, signature, sasSessionId, checkoutUrl);

  res.status(201).json({
    payment_intent: {
      reference,
      amount_fcfa: plan.price_fcfa,
      amount_decimal: amountDecimal,
      currency: 'XOF',
      plan_name: plan.name,
      provider,
      gateway,
      session_id: sasSessionId,
      checkout_url: checkoutUrl,
      saspay_configured: Boolean(SASPAY_SECRET_KEY),
      saspay_mode: SASPAY_SECRET_KEY.startsWith('sk_live_') ? 'live' : 'sandbox',
      verification_token: signature,
    },
  });
});

function finalizeVerifiedPayment(reference: string, userId: number, payloadJson?: string) {
  const payment = db
    .prepare(
      `SELECT p.*, sp.duration_months
       FROM payments p
       JOIN subscription_plans sp ON sp.id = p.plan_id
       WHERE p.reference = ? AND p.user_id = ?`
    )
    .get(reference, userId) as
    | {
        id: number;
        plan_id: number;
        status: string;
        duration_months: number;
      }
    | undefined;

  if (!payment || payment.status === 'completed') return;

  const monthsExpr = `+${payment.duration_months} months`;
  db.transaction(() => {
    db.prepare("UPDATE payments SET status = 'completed', verified_at = datetime('now'), webhook_payload = COALESCE(?, webhook_payload) WHERE id = ?").run(
      payloadJson || null,
      payment.id
    );
    db.prepare("UPDATE subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'").run(userId);
    db.prepare(
      `INSERT INTO subscriptions (user_id, plan_id, status, started_at, expires_at)
       VALUES (?, ?, 'active', datetime('now'), datetime('now', ?))`
    ).run(userId, payment.plan_id, monthsExpr);
    db.prepare(
      'INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)'
    ).run(userId, 'system', 'Abonnement Premium activé', `Votre accès ZOLA Premium est actif pour ${payment.duration_months} mois.`);
  })();
}

app.post('/api/premium/verify', requireAuth, async (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const reference = String(req.body?.reference || '');
  const verificationToken = String(req.body?.verification_token || '');
  const payment = db
    .prepare('SELECT id, plan_id, amount_fcfa, status, saspay_session_id FROM payments WHERE reference = ? AND user_id = ?')
    .get(reference, meId) as
    | { id: number; plan_id: number; amount_fcfa: number; status: string; saspay_session_id: string | null }
    | undefined;

  if (!payment) {
    res.status(404).json({ error: 'Transaction introuvable.' });
    return;
  }
  if (payment.status === 'completed') {
    res.json({ ok: true, user: getFullUserProfile(meId, meId) });
    return;
  }

  if (payment.saspay_session_id && SASPAY_SECRET_KEY) {
    try {
      const sasRes = await fetch(
        `${SASPAY_BASE_URL}/checkout-sessions/${encodeURIComponent(payment.saspay_session_id)}/status/`,
        {
          headers: { Authorization: `Bearer ${SASPAY_SECRET_KEY}` },
        }
      );
      const statusText = await sasRes.text();
      let statusData: Record<string, unknown> = {};
      try {
        statusData = JSON.parse(statusText) as Record<string, unknown>;
      } catch {
        statusData = {};
      }
      if (!sasRes.ok) {
        res.status(502).json({ error: `Impossible de vérifier le statut SasPay (${sasRes.status}).` });
        return;
      }
      const nested = (statusData.data as Record<string, unknown> | undefined) || {};
      const sasStatus = String(statusData.status || nested.status || '').toLowerCase();
      if (['completed', 'success', 'succeeded', 'paid'].includes(sasStatus)) {
        finalizeVerifiedPayment(reference, meId, statusText);
        res.json({ ok: true, user: getFullUserProfile(meId, meId) });
        return;
      }
      if (['failed', 'cancelled', 'expired'].includes(sasStatus)) {
        db.prepare("UPDATE payments SET status = 'failed', webhook_payload = ? WHERE id = ?").run(statusText, payment.id);
        res.status(402).json({ error: 'Paiement SasPay annulé ou échoué.' });
        return;
      }
      res.status(402).json({ error: 'Paiement SasPay toujours en attente de confirmation.' });
      return;
    } catch {
      res.status(502).json({ error: 'Erreur de communication lors de la vérification SasPay.' });
      return;
    }
  }

  const expected = crypto
    .createHmac('sha256', PAYMENT_SECRET)
    .update(`${reference}:${meId}:${payment.plan_id}:${payment.amount_fcfa}`)
    .digest('hex');

  const providedBuf = Buffer.from(verificationToken);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    db.prepare("UPDATE payments SET status = 'failed' WHERE id = ?").run(payment.id);
    res.status(403).json({ error: 'Signature de paiement SasPay invalide. Abonnement non activé.' });
    return;
  }

  finalizeVerifiedPayment(reference, meId);
  res.json({ ok: true, user: getFullUserProfile(meId, meId) });
});

app.post('/api/premium/webhook/:gateway', (req, res) => {
  const gateway = String(req.params.gateway || '').toLowerCase();
  if (gateway !== 'saspay') {
    res.status(400).json({ error: 'Seule la passerelle SasPay est supportée.' });
    return;
  }

  const tsHeader = String(req.headers['x-webhook-timestamp'] || '').trim();
  const sigHeader = String(req.headers['x-webhook-signature'] || '').trim().toLowerCase();
  const eventHeader = String(req.headers['x-webhook-event'] || req.body?.event || '').trim().toLowerCase();

  const tsNum = Number(tsHeader);
  const nowSec = Math.floor(Date.now() / 1000);
  if (!tsHeader || !Number.isFinite(tsNum) || Math.abs(nowSec - tsNum) > 300) {
    res.status(403).json({ error: 'Timestamp webhook SasPay manquant ou expiré.' });
    return;
  }

  const rawBody = (req as express.Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});
  const expected = crypto
    .createHmac('sha256', SASPAY_WEBHOOK_SECRET)
    .update(`${tsHeader}.${rawBody}`)
    .digest('hex')
    .toLowerCase();

  const sigBuf = Buffer.from(sigHeader, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (!sigHeader || sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    res.status(403).json({ error: 'Signature webhook SasPay invalide.' });
    return;
  }

  const bodyData = (req.body?.data as Record<string, unknown> | undefined) || {};
  const reference = String(req.body?.reference || bodyData.reference || '');
  const payment = db
    .prepare('SELECT id, user_id, status FROM payments WHERE reference = ?')
    .get(reference) as { id: number; user_id: number; status: string } | undefined;

  if (!payment) {
    res.status(404).json({ error: 'Référence de paiement SasPay inconnue.' });
    return;
  }

  if (eventHeader === 'transaction.failed' || eventHeader === 'transaction.cancelled') {
    if (payment.status !== 'completed') {
      db.prepare("UPDATE payments SET status = 'failed', webhook_payload = ? WHERE id = ?").run(rawBody, payment.id);
    }
    res.json({ ok: true, status: 'failed' });
    return;
  }

  const payloadStatus = String(req.body?.status || bodyData.status || '').toLowerCase();
  if (
    eventHeader === 'transaction.success' ||
    ['completed', 'success', 'succeeded', 'paid'].includes(payloadStatus)
  ) {
    finalizeVerifiedPayment(reference, payment.user_id, rawBody);
    res.json({ ok: true, status: 'completed' });
    return;
  }

  res.json({ ok: true, status: 'ignored' });
});

app.get('/api/premium/receipt/:reference', requireAuth, (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const row = db
    .prepare(
      `SELECT p.reference, p.amount_fcfa, p.currency, p.provider, p.status, p.created_at, p.verified_at,
              sp.name as plan_name, sp.duration_months, up.full_name, u.email
       FROM payments p
       JOIN subscription_plans sp ON sp.id = p.plan_id
       JOIN users u ON u.id = p.user_id
       JOIN user_profiles up ON up.user_id = u.id
       WHERE p.reference = ? AND p.user_id = ?`
    )
    .get(String(req.params.reference), meId);

  if (!row) {
    res.status(404).json({ error: 'Reçu introuvable.' });
    return;
  }
  res.json({ receipt: row });
});

// ========================
// ADMIN DASHBOARD (RBAC + VERIFICATIONS + ANALYTICS + AUDIT)
// ========================
function recordAuditLog(adminId: number, action: string, targetType: string, targetId: string | number, details = '') {
  db.prepare(
    'INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)'
  ).run(adminId, action, targetType, String(targetId), details);
}

app.get('/api/admin/overview', requireAdmin, (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = 25;
  const offset = (page - 1) * limit;

  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const activeSubs = (
    db.prepare("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'active' AND datetime(expires_at) > datetime('now')").get() as { c: number }
  ).c;

  const stats = {
    total_users: totalUsers,
    active_users: (db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'active'").get() as { c: number }).c,
    verified_users: (db.prepare('SELECT COUNT(*) as c FROM users WHERE is_verified = 1').get() as { c: number }).c,
    online_users: (db.prepare('SELECT COUNT(*) as c FROM users WHERE is_online = 1').get() as { c: number }).c,
    total_matches: (db.prepare('SELECT COUNT(*) as c FROM matches').get() as { c: number }).c,
    total_messages: (db.prepare('SELECT COUNT(*) as c FROM messages').get() as { c: number }).c,
    active_subscriptions: activeSubs,
    total_revenue_fcfa: (
      db.prepare("SELECT COALESCE(SUM(amount_fcfa), 0) as s FROM payments WHERE status = 'completed'").get() as { s: number }
    ).s,
    conversion_rate: totalUsers > 0 ? Math.round((activeSubs / totalUsers) * 1000) / 10 : 0,
    pending_reports: (db.prepare("SELECT COUNT(*) as c FROM reports WHERE status = 'pending'").get() as { c: number }).c,
    pending_verifications: (
      db.prepare("SELECT COUNT(*) as c FROM verification_requests WHERE status = 'pending'").get() as { c: number }
    ).c,
  };

  const usersRows = db
    .prepare(
      `SELECT u.id, u.email, u.role, u.status, u.is_verified, u.is_online, u.created_at,
              p.full_name, p.city, p.country, p.avatar_url
       FROM users u
       JOIN user_profiles p ON p.user_id = u.id
       ORDER BY u.id DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset);

  const reports = db
    .prepare(
      `SELECT r.id, r.reporter_id, pr.full_name as reporter_name,
              r.reported_user_id, pd.full_name as reported_name, pd.avatar_url as reported_avatar,
              ud.status as reported_status, r.reason, r.details, r.status, r.created_at
       FROM reports r
       JOIN user_profiles pr ON pr.user_id = r.reporter_id
       JOIN user_profiles pd ON pd.user_id = r.reported_user_id
       JOIN users ud ON ud.id = r.reported_user_id
       ORDER BY r.id DESC`
    )
    .all();

  const verifications = db
    .prepare(
      `SELECT v.id, v.user_id, up.full_name, up.city, up.country, up.avatar_url,
              v.challenge_code, v.status, v.admin_note, v.created_at, v.reviewed_at
       FROM verification_requests v
       JOIN user_profiles up ON up.user_id = v.user_id
       ORDER BY v.id DESC`
    )
    .all();

  const payments = db
    .prepare(
      `SELECT p.id, p.user_id, up.full_name as user_name, sp.name as plan_name,
              p.amount_fcfa, p.currency, p.provider, p.reference, p.status, p.created_at, p.verified_at
       FROM payments p
       JOIN user_profiles up ON up.user_id = p.user_id
       JOIN subscription_plans sp ON sp.id = p.plan_id
       ORDER BY p.id DESC`
    )
    .all();

  const plans = db
    .prepare('SELECT id, slug, name, duration_months, price_fcfa, is_popular, features_json, active FROM subscription_plans ORDER BY duration_months ASC')
    .all() as Array<Record<string, unknown>>;

  const settingsRows = db.prepare('SELECT setting_key, setting_value FROM site_settings').all() as Array<{
    setting_key: string;
    setting_value: string;
  }>;
  const settings: Record<string, string> = {};
  for (const r of settingsRows) settings[r.setting_key] = r.setting_value;

  const rawMonthly = db
    .prepare(
      `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
       FROM users
       GROUP BY strftime('%Y-%m', created_at)
       ORDER BY month ASC`
    )
    .all() as Array<{ month: string; count: number }>;

  const rawMonthlyRevenue = db
    .prepare(
      `SELECT strftime('%Y-%m', COALESCE(verified_at, created_at)) as month, COALESCE(SUM(amount_fcfa), 0) as rev
       FROM payments
       WHERE status = 'completed'
       GROUP BY strftime('%Y-%m', COALESCE(verified_at, created_at))`
    )
    .all() as Array<{ month: string; rev: number }>;

  const monthCountMap = new Map<string, number>();
  for (const row of rawMonthly) {
    if (row.month) monthCountMap.set(row.month, row.count);
  }
  const monthRevMap = new Map<string, number>();
  for (const row of rawMonthlyRevenue) {
    if (row.month) monthRevMap.set(row.month, row.rev);
  }

  const monthsWindow = Number(req.query.months) === 12 ? 12 : 6;
  const monthNamesFr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const monthlySignups: Array<{ month: string; label: string; count: number; revenue_fcfa: number }> = [];
  const now = new Date();
  for (let i = monthsWindow - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const label = `${monthNamesFr[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(-2)}`;
    monthlySignups.push({
      month: ym,
      label,
      count: monthCountMap.get(ym) ?? 0,
      revenue_fcfa: monthRevMap.get(ym) ?? 0,
    });
  }

  const countryDistribution = db
    .prepare(
      `SELECT p.country, COUNT(*) as count
       FROM user_profiles p
       JOIN users u ON u.id = p.user_id
       GROUP BY p.country
       ORDER BY count DESC
       LIMIT 8`
    )
    .all() as Array<{ country: string; count: number }>;

  const auditLogs = db
    .prepare(
      `SELECT a.id, up.full_name as admin_name, a.action, a.target_type, a.target_id, a.details, a.created_at
       FROM admin_audit_logs a
       JOIN user_profiles up ON up.user_id = a.admin_id
       ORDER BY a.id DESC
       LIMIT 60`
    )
    .all();

  const interests = db.prepare('SELECT id, name, category FROM interests ORDER BY name ASC').all();

  res.json({
    stats,
    monthly_signups: monthlySignups,
    country_distribution: countryDistribution,
    audit_logs: auditLogs,
    users: usersRows,
    reports,
    verifications,
    payments,
    interests,
    plans: plans.map((p) => ({
      ...p,
      is_popular: Boolean(p.is_popular),
      active: Boolean(p.active),
      features: JSON.parse(String(p.features_json)),
    })),
    settings,
  });
});

app.get('/api/admin/export/:type', requireAdmin, (req: AuthenticatedRequest, res) => {
  const type = String(req.params.type || 'users');
  const csvEscape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  let headers: string[] = [];
  let rows: Array<Array<unknown>> = [];

  if (type === 'payments') {
    headers = ['Reference', 'Membre', 'Formule', 'Montant_FCFA', 'Passerelle', 'Statut', 'Date'];
    const data = db
      .prepare(
        `SELECT p.reference, up.full_name, sp.name, p.amount_fcfa, p.provider, p.status, p.created_at
         FROM payments p
         JOIN user_profiles up ON up.user_id = p.user_id
         JOIN subscription_plans sp ON sp.id = p.plan_id
         ORDER BY p.id DESC`
      )
      .all() as Array<Record<string, unknown>>;
    rows = data.map((r) => [r.reference, r.full_name, r.name, r.amount_fcfa, r.provider, r.status, r.created_at]);
  } else if (type === 'reports') {
    headers = ['ID', 'Signalant', 'Signale', 'Motif', 'Statut', 'Date'];
    const data = db
      .prepare(
        `SELECT r.id, pr.full_name as reporter, pd.full_name as reported, r.reason, r.status, r.created_at
         FROM reports r
         JOIN user_profiles pr ON pr.user_id = r.reporter_id
         JOIN user_profiles pd ON pd.user_id = r.reported_user_id
         ORDER BY r.id DESC`
      )
      .all() as Array<Record<string, unknown>>;
    rows = data.map((r) => [r.id, r.reporter, r.reported, r.reason, r.status, r.created_at]);
  } else {
    headers = ['ID', 'Nom', 'Email', 'Role', 'Statut', 'Verifie', 'Pays', 'Ville', 'Inscription'];
    const data = db
      .prepare(
        `SELECT u.id, p.full_name, u.email, u.role, u.status, u.is_verified, p.country, p.city, u.created_at
         FROM users u JOIN user_profiles p ON p.user_id = u.id ORDER BY u.id DESC`
      )
      .all() as Array<Record<string, unknown>>;
    rows = data.map((r) => [r.id, r.full_name, r.email, r.role, r.status, r.is_verified, r.country, r.city, r.created_at]);
  }

  recordAuditLog(req.auth!.userId, 'export_csv', type, type, `Export CSV (${rows.length} lignes)`);
  const csv = [headers.map(csvEscape).join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="zola-${type}.csv"`);
  res.send('\uFEFF' + csv);
});

app.get('/api/admin/verifications/:id/photo', requireAdmin, (req, res) => {
  const row = db
    .prepare('SELECT selfie_url FROM verification_requests WHERE id = ?')
    .get(Number(req.params.id)) as { selfie_url: string } | undefined;
  if (!row) {
    res.status(404).send('Not found');
    return;
  }
  const safeName = path.basename(row.selfie_url);
  const fullPath = path.join(VERIFICATION_DIR, safeName);
  if (!fs.existsSync(fullPath)) {
    res.status(404).send('Not found');
    return;
  }
  res.sendFile(fullPath);
});

app.patch('/api/admin/verifications/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const verifId = Number(req.params.id);
  const { status, admin_note } = req.body ?? {};
  if (!['approved', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'Statut invalide.' });
    return;
  }
  const row = db.prepare('SELECT user_id FROM verification_requests WHERE id = ?').get(verifId) as
    | { user_id: number }
    | undefined;
  if (!row) {
    res.status(404).json({ error: 'Demande introuvable.' });
    return;
  }

  db.transaction(() => {
    db.prepare(
      "UPDATE verification_requests SET status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?"
    ).run(status, String(admin_note || ''), req.auth!.userId, verifId);

    if (status === 'approved') {
      db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(row.user_id);
      db.prepare('INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)').run(
        row.user_id,
        'system',
        'Profil vérifié',
        'Félicitations ! Votre identité a été vérifiée et votre badge est actif.'
      );
    } else {
      db.prepare('INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)').run(
        row.user_id,
        'system',
        'Vérification refusée',
        admin_note ? `Motif : ${admin_note}` : 'Veuillez soumettre un selfie plus lisible avec le code demandé.'
      );
    }
    recordAuditLog(req.auth!.userId, `verification_${status}`, 'verification', verifId, `Membre #${row.user_id}`);
  })();

  res.json({ ok: true });
});

app.patch('/api/admin/users/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const targetId = Number(req.params.id);
  const { status, is_verified, role } = req.body ?? {};
  if (targetId === req.auth!.userId && status === 'suspended') {
    res.status(400).json({ error: 'Vous ne pouvez pas suspendre votre propre compte.' });
    return;
  }
  if (status && ['active', 'suspended'].includes(status)) {
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, targetId);
    recordAuditLog(req.auth!.userId, `user_status_${status}`, 'user', targetId);
  }
  if (typeof is_verified === 'boolean') {
    db.prepare('UPDATE users SET is_verified = ? WHERE id = ?').run(is_verified ? 1 : 0, targetId);
    recordAuditLog(req.auth!.userId, is_verified ? 'user_verify' : 'user_unverify', 'user', targetId);
  }
  if (role && ['user', 'moderator', 'admin', 'super_admin'].includes(role) && req.auth!.role === 'super_admin') {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetId);
    recordAuditLog(req.auth!.userId, 'user_role_change', 'user', targetId, `Nouveau rôle: ${role}`);
  }
  res.json({ ok: true });
});

app.delete('/api/admin/users/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.auth!.userId) {
    res.status(400).json({ error: 'Impossible de supprimer votre propre compte administrateur.' });
    return;
  }
  recordAuditLog(req.auth!.userId, 'user_delete', 'user', targetId);
  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  res.json({ ok: true });
});

app.patch('/api/admin/reports/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const reportId = Number(req.params.id);
  const { status, suspend_reported } = req.body ?? {};
  if (!['resolved', 'dismissed'].includes(status)) {
    res.status(400).json({ error: 'Statut de modération invalide.' });
    return;
  }
  const report = db.prepare('SELECT reported_user_id FROM reports WHERE id = ?').get(reportId) as
    | { reported_user_id: number }
    | undefined;
  if (!report) {
    res.status(404).json({ error: 'Signalement introuvable.' });
    return;
  }
  db.transaction(() => {
    db.prepare('UPDATE reports SET status = ?, reviewed_by = ? WHERE id = ?').run(
      status,
      req.auth!.userId,
      reportId
    );
    if (suspend_reported) {
      db.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").run(report.reported_user_id);
    }
    recordAuditLog(
      req.auth!.userId,
      `report_${status}`,
      'report',
      reportId,
      suspend_reported ? `Suspension membre #${report.reported_user_id}` : ''
    );
  })();
  res.json({ ok: true });
});

app.post('/api/admin/plans', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { name, slug, duration_months, price_fcfa, is_popular, active, features } = req.body ?? {};
  const cleanName = String(name || '').trim();
  const dur = Math.max(1, Number(duration_months || 1));
  const price = Number(price_fcfa || 0);
  if (!cleanName || price < 500) {
    res.status(400).json({ error: 'Nom ou tarif invalide (minimum 500 FCFA).' });
    return;
  }
  const cleanSlug =
    String(slug || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-') || `plan-${Date.now()}`;
  const featureList = Array.isArray(features)
    ? features.map((f) => String(f).trim()).filter(Boolean)
    : [];
  try {
    const info = db
      .prepare(
        'INSERT INTO subscription_plans (slug, name, duration_months, price_fcfa, is_popular, features_json, active) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        cleanSlug,
        cleanName,
        dur,
        price,
        is_popular ? 1 : 0,
        JSON.stringify(featureList),
        active === false ? 0 : 1
      );
    recordAuditLog(req.auth!.userId, 'plan_create', 'plan', Number(info.lastInsertRowid), cleanName);
    res.status(201).json({ ok: true, id: Number(info.lastInsertRowid) });
  } catch {
    res.status(400).json({ error: 'Slug déjà utilisé pour un autre forfait.' });
  }
});

app.put('/api/admin/plans/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const planId = Number(req.params.id);
  const existing = db
    .prepare('SELECT id, slug, name, duration_months, price_fcfa, is_popular, features_json, active FROM subscription_plans WHERE id = ?')
    .get(planId) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Formule introuvable.' });
    return;
  }
  const { name, slug, duration_months, price_fcfa, is_popular, active, features } = req.body ?? {};
  const nextPrice = price_fcfa !== undefined ? Number(price_fcfa) : Number(existing.price_fcfa);
  if (nextPrice < 500) {
    res.status(400).json({ error: 'Tarif invalide (minimum 500 FCFA).' });
    return;
  }
  const nextName = name !== undefined ? String(name).trim() : String(existing.name);
  const nextSlug =
    slug !== undefined
      ? String(slug).trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-') || String(existing.slug)
      : String(existing.slug);
  const nextDuration =
    duration_months !== undefined ? Math.max(1, Number(duration_months)) : Number(existing.duration_months);
  const nextPopular = is_popular !== undefined ? (is_popular ? 1 : 0) : Number(existing.is_popular);
  const nextActive = active !== undefined ? (active ? 1 : 0) : Number(existing.active);
  const nextFeatures = Array.isArray(features)
    ? JSON.stringify(features.map((f) => String(f).trim()).filter(Boolean))
    : String(existing.features_json);

  db.prepare(
    'UPDATE subscription_plans SET name = ?, slug = ?, duration_months = ?, price_fcfa = ?, is_popular = ?, features_json = ?, active = ? WHERE id = ?'
  ).run(nextName, nextSlug, nextDuration, nextPrice, nextPopular, nextFeatures, nextActive, planId);
  recordAuditLog(req.auth!.userId, 'plan_update', 'plan', planId, `${nextName} · ${nextPrice} FCFA`);
  res.json({ ok: true });
});

app.delete('/api/admin/plans/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const planId = Number(req.params.id);
  const usedInSubs = (db.prepare('SELECT COUNT(*) as c FROM subscriptions WHERE plan_id = ?').get(planId) as { c: number }).c;
  const usedInPay = (db.prepare('SELECT COUNT(*) as c FROM payments WHERE plan_id = ?').get(planId) as { c: number }).c;
  if (usedInSubs > 0 || usedInPay > 0) {
    db.prepare('UPDATE subscription_plans SET active = 0 WHERE id = ?').run(planId);
    recordAuditLog(req.auth!.userId, 'plan_archive', 'plan', planId, 'Désactivé (historique existant)');
    res.json({ ok: true, archived: true });
    return;
  }
  db.prepare('DELETE FROM subscription_plans WHERE id = ?').run(planId);
  recordAuditLog(req.auth!.userId, 'plan_delete', 'plan', planId);
  res.json({ ok: true, archived: false });
});

app.post('/api/admin/interests', requireAdmin, (req: AuthenticatedRequest, res) => {
  const name = String(req.body?.name || '').trim();
  const category = String(req.body?.category || 'Culture').trim() || 'Culture';
  if (!name) {
    res.status(400).json({ error: "Nom du centre d'intérêt requis." });
    return;
  }
  try {
    const info = db.prepare('INSERT INTO interests (name, category) VALUES (?, ?)').run(name, category);
    recordAuditLog(req.auth!.userId, 'interest_create', 'interest', Number(info.lastInsertRowid), name);
    res.status(201).json({ ok: true, id: Number(info.lastInsertRowid), name, category });
  } catch {
    res.status(400).json({ error: "Ce centre d'intérêt existe déjà." });
  }
});

app.put('/api/admin/interests/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const name = String(req.body?.name || '').trim();
  const category = String(req.body?.category || 'Culture').trim() || 'Culture';
  if (!name) {
    res.status(400).json({ error: "Nom du centre d'intérêt requis." });
    return;
  }
  try {
    db.prepare('UPDATE interests SET name = ?, category = ? WHERE id = ?').run(name, category, id);
    recordAuditLog(req.auth!.userId, 'interest_update', 'interest', id, name);
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: "Ce nom est déjà utilisé." });
  }
});

app.delete('/api/admin/interests/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM interests WHERE id = ?').run(id);
  recordAuditLog(req.auth!.userId, 'interest_delete', 'interest', id);
  res.json({ ok: true });
});

app.post('/api/admin/media', requireAdmin, uploadImage.single('image'), (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Aucune image reçue.' });
    return;
  }
  if (!validateMagicBytes(req.file.path, 'image')) {
    fs.unlinkSync(req.file.path);
    res.status(400).json({ error: 'Fichier image invalide.' });
    return;
  }
  stripJpegExifInPlace(req.file.path);
  const url = `/uploads/${req.file.filename}`;
  recordAuditLog(req.auth!.userId, 'cms_media_upload', 'media', req.file.filename, url);
  res.json({ url });
});

app.put('/api/admin/settings', requireAdmin, (req: AuthenticatedRequest, res) => {
  const updates = req.body?.settings;
  if (!updates || typeof updates !== 'object') {
    res.status(400).json({ error: 'Paramètres invalides.' });
    return;
  }
  const stmt = db.prepare(
    "INSERT INTO site_settings (setting_key, setting_value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at"
  );
  for (const [k, v] of Object.entries(updates)) {
    stmt.run(k, String(v ?? ''));
  }
  recordAuditLog(req.auth!.userId, 'settings_update', 'site_settings', 'global');
  res.json({ ok: true });
});

// ========================
// VITE / STATIC SERVING
// ========================
async function startServer() {
  const PORT = 3000;
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ZOLA server running on http://localhost:${PORT}`);
  });
}

startServer();
