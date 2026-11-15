import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update(process.cwd() + '_zola_secret_2026').digest('hex');

export interface AuthSession {
  sessionId: string;
  userId: number;
  role: string;
  csrfToken: string;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthSession;
}

function signToken(payload: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

export function createSessionCookie(
  userId: number,
  role: string,
  rememberMe = false,
  userAgent = 'Navigateur Web',
  ipAddress = '0.0.0.0'
): { cookieValue: string; csrfToken: string; maxAgeMs: number; sessionId: string } {
  const maxAgeMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const csrfToken = crypto.randomBytes(24).toString('hex');
  const sessionId = crypto.randomBytes(16).toString('hex');

  db.prepare(
    'INSERT INTO user_sessions (session_id, user_id, user_agent, ip_address) VALUES (?, ?, ?, ?)'
  ).run(sessionId, userId, userAgent.slice(0, 180), ipAddress.slice(0, 64));

  const session: AuthSession = {
    sessionId,
    userId,
    role,
    csrfToken,
    exp: Date.now() + maxAgeMs,
  };
  const encoded = Buffer.from(JSON.stringify(session)).toString('base64url');
  const sig = signToken(encoded);
  return { cookieValue: `${encoded}.${sig}`, csrfToken, maxAgeMs, sessionId };
}

export function parseSessionCookie(cookieHeader: string | undefined): AuthSession | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(';').map((p) => p.trim());
  const sessionPair = pairs.find((p) => p.startsWith('zola_session='));
  if (!sessionPair) return null;
  const raw = decodeURIComponent(sessionPair.slice('zola_session='.length));
  const dotIdx = raw.indexOf('.');
  if (dotIdx <= 0) return null;
  const encoded = raw.slice(0, dotIdx);
  const sig = raw.slice(dotIdx + 1);
  const expectedSig = signToken(encoded);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as AuthSession;
    if (!parsed.userId || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    if (parsed.sessionId) {
      const sessRow = db
        .prepare('SELECT revoked FROM user_sessions WHERE session_id = ? AND user_id = ?')
        .get(parsed.sessionId, parsed.userId) as { revoked: number } | undefined;
      if (sessRow && sessRow.revoked === 1) {
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function attachAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const session = parseSessionCookie(req.headers.cookie);
  if (session) {
    const userRow = db.prepare('SELECT id, role, status FROM users WHERE id = ?').get(session.userId) as
      | { id: number; role: string; status: string }
      | undefined;
    if (userRow && userRow.status === 'active') {
      req.auth = { ...session, role: userRow.role };
      db.prepare("UPDATE users SET last_seen_at = datetime('now'), is_online = 1 WHERE id = ?").run(userRow.id);
      if (session.sessionId) {
        db.prepare("UPDATE user_sessions SET last_active_at = datetime('now') WHERE session_id = ?").run(
          session.sessionId
        );
      }
    }
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.auth) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }
  next();
}

export function requireCsrf(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }
  if (!req.auth) {
    next();
    return;
  }
  const headerToken = req.headers['x-csrf-token'];
  if (typeof headerToken !== 'string' || headerToken !== req.auth.csrfToken) {
    res.status(403).json({ error: 'Jeton CSRF invalide ou manquant.' });
    return;
  }
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.auth) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }
  const allowed = ['moderator', 'admin', 'super_admin'];
  if (!allowed.includes(req.auth.role)) {
    res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
    return;
  }
  next();
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxAttempts = 10, windowMs = 15 * 60 * 1000): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.count >= maxAttempts) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function resetRateLimit(key: string) {
  loginAttempts.delete(key);
}
