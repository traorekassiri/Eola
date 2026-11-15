import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(path.join(DATA_DIR, 'zola.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'active',
      is_verified INTEGER NOT NULL DEFAULT 0,
      is_online INTEGER NOT NULL DEFAULT 0,
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      notify_messages INTEGER NOT NULL DEFAULT 1,
      notify_matches INTEGER NOT NULL DEFAULT 1,
      profile_visible INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id INTEGER PRIMARY KEY,
      full_name TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      gender TEXT NOT NULL,
      seeking_gender TEXT NOT NULL DEFAULT 'Tous',
      country TEXT NOT NULL,
      country_code TEXT NOT NULL DEFAULT 'AF',
      city TEXT NOT NULL,
      profession TEXT NOT NULL DEFAULT '',
      height_cm INTEGER,
      zodiac_sign TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS profile_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      photo_url TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS interests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'Culture'
    );

    CREATE TABLE IF NOT EXISTS user_interests (
      user_id INTEGER NOT NULL,
      interest_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, interest_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (interest_id) REFERENCES interests(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(from_user_id, to_user_id),
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_one_id INTEGER NOT NULL,
      user_two_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_one_id, user_two_id),
      FOREIGN KEY (user_one_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (user_two_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      last_read_at TEXT,
      PRIMARY KEY (conversation_id, user_id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      related_user_id INTEGER,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscription_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      duration_months INTEGER NOT NULL,
      price_fcfa INTEGER NOT NULL,
      is_popular INTEGER NOT NULL DEFAULT 0,
      features_json TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      amount_fcfa INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'XOF',
      provider TEXT NOT NULL DEFAULT 'ZOLA Pay (Mobile Money / Carte)',
      reference TEXT NOT NULL UNIQUE,
      verification_hmac TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      verified_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL,
      reported_user_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS blocked_users (
      blocker_id INTEGER NOT NULL,
      blocked_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (blocker_id, blocked_id),
      FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      user_id INTEGER PRIMARY KEY,
      admin_role TEXT NOT NULL DEFAULT 'moderator',
      permissions_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS passes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(from_user_id, to_user_id),
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS verification_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      selfie_url TEXT NOT NULL,
      challenge_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_note TEXT NOT NULL DEFAULT '',
      reviewed_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      reviewed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Safe migrations for pre-existing local SQLite databases
  const msgCols = db.prepare("PRAGMA table_info('messages')").all() as Array<{ name: string }>;
  if (!msgCols.some((c) => c.name === 'audio_url')) {
    db.exec('ALTER TABLE messages ADD COLUMN audio_url TEXT');
  }
  const payCols = db.prepare("PRAGMA table_info('payments')").all() as Array<{ name: string }>;
  if (!payCols.some((c) => c.name === 'gateway')) {
    db.exec("ALTER TABLE payments ADD COLUMN gateway TEXT NOT NULL DEFAULT 'zola_hmac'");
  }
  if (!payCols.some((c) => c.name === 'webhook_payload')) {
    db.exec('ALTER TABLE payments ADD COLUMN webhook_payload TEXT');
  }

  seedInitialData();
}

function seedInitialData() {
  const interestCount = (db.prepare('SELECT COUNT(*) as c FROM interests').get() as { c: number }).c;
  if (interestCount === 0) {
    const insertInterest = db.prepare('INSERT INTO interests (name, category) VALUES (?, ?)');
    const defaultInterests = [
      ['Voyage', 'Découverte'],
      ['Musique', 'Culture'],
      ['Cuisine', 'Gastronomie'],
      ['Danse', 'Culture'],
      ['Sport', 'Bien-être'],
      ['Lecture', 'Culture'],
      ['Cinéma', 'Loisirs'],
      ['Entrepreneuriat', 'Carrière'],
      ['Photographie', 'Art'],
      ['Mode', 'Style'],
      ['Nature', 'Découverte'],
      ['Technologie', 'Carrière'],
    ];
    for (const [name, category] of defaultInterests) {
      insertInterest.run(name, category);
    }
  }

  const planCount = (db.prepare('SELECT COUNT(*) as c FROM subscription_plans').get() as { c: number }).c;
  if (planCount === 0) {
    const insertPlan = db.prepare(
      'INSERT INTO subscription_plans (slug, name, duration_months, price_fcfa, is_popular, features_json, active) VALUES (?, ?, ?, ?, ?, ?, 1)'
    );
    const sharedFeatures = JSON.stringify([
      'Voir qui vous a liké',
      'Envoyer des messages illimités',
      'Remonter son profil',
      'Accès aux filtres avancés',
    ]);
    insertPlan.run('1-mois', '1 mois', 1, 4900, 0, sharedFeatures);
    insertPlan.run('3-mois', '3 mois', 3, 12900, 1, sharedFeatures);
    insertPlan.run('6-mois', '6 mois', 6, 19900, 0, sharedFeatures);
  }

  const settingsCount = (db.prepare('SELECT COUNT(*) as c FROM site_settings').get() as { c: number }).c;
  if (settingsCount === 0) {
    const insertSetting = db.prepare('INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)');
    const defaults: Record<string, string> = {
      hero_title: "Trouvez l'amour en Afrique",
      hero_subtitle: "Rencontrez des célibataires authentiques, près de chez vous ou partout en Afrique.",
      hero_cta_primary: 'Créer un compte',
      hero_cta_secondary: 'En savoir plus',
      footer_slogan: "Ensemble, trouvons l'amour",
      oauth_google_enabled: process.env.GOOGLE_CLIENT_ID ? '1' : '0',
      oauth_facebook_enabled: process.env.FACEBOOK_APP_ID ? '1' : '0',
      oauth_apple_enabled: process.env.APPLE_CLIENT_ID ? '1' : '0',
      payment_provider_label: 'Paiement sécurisé Mobile Money & Carte',
    };
    for (const [k, v] of Object.entries(defaults)) {
      insertSetting.run(k, v);
    }
  }

  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    const defaultPass = hashPassword('Zola2026!');
    const insertUser = db.prepare(`
      INSERT INTO users (email, password_hash, role, status, is_verified, is_online)
      VALUES (?, ?, ?, 'active', ?, ?)
    `);
    const insertProfile = db.prepare(`
      INSERT INTO user_profiles (user_id, full_name, birth_date, gender, seeking_gender, country, country_code, city, profession, height_cm, zodiac_sign, bio, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertPhoto = db.prepare('INSERT INTO profile_photos (user_id, photo_url, is_primary) VALUES (?, ?, ?)');
    const insertUserInterest = db.prepare('INSERT OR IGNORE INTO user_interests (user_id, interest_id) VALUES (?, ?)');

    const seedProfiles = [
      {
        email: 'awa@zola.africa',
        role: 'user',
        verified: 1,
        online: 1,
        full_name: 'Awa Traoré',
        birth_date: '2000-08-12',
        gender: 'Femme',
        seeking: 'Homme',
        country: 'Burkina Faso',
        code: 'BF',
        city: 'Ouagadougou',
        profession: 'Étudiante en design',
        height: 170,
        zodiac: 'Lion',
        bio: "Je suis une fille simple, douce et aventureuse. J'aime voyager, danser et découvrir de nouvelles cultures.",
        avatar: '/media/zola_portrait_woman_2_1794726546703.jpg',
        interests: [1, 2, 3, 4, 5, 6],
      },
      {
        email: 'mamadou@zola.africa',
        role: 'user',
        verified: 1,
        online: 1,
        full_name: 'Mamadou Diallo',
        birth_date: '1997-04-21',
        gender: 'Homme',
        seeking: 'Femme',
        country: 'Mali',
        code: 'ML',
        city: 'Bamako',
        profession: 'Architecte logiciel',
        height: 183,
        zodiac: 'Taureau',
        bio: "Passionné de musique mandingue, d'architecture durable et de grands voyages à travers l'Afrique de l'Ouest.",
        avatar: '/media/zola_login_man_1794726545582.jpg',
        interests: [1, 2, 8, 12],
      },
      {
        email: 'fatou@zola.africa',
        role: 'user',
        verified: 1,
        online: 1,
        full_name: 'Fatou Ndiaye',
        birth_date: '1999-02-14',
        gender: 'Femme',
        seeking: 'Homme',
        country: 'Sénégal',
        code: 'SN',
        city: 'Dakar',
        profession: 'Styliste & Créatrice',
        height: 174,
        zodiac: 'Verseau',
        bio: "Amoureuse de l'océan, des tissus wax contemporains et des couchers de soleil sur les Almadies.",
        avatar: '/media/zola_register_woman_1794726545235.jpg',
        interests: [2, 4, 9, 10],
      },
      {
        email: 'issa@zola.africa',
        role: 'user',
        verified: 1,
        online: 0,
        full_name: 'Issa Konaté',
        birth_date: '1995-11-05',
        gender: 'Homme',
        seeking: 'Femme',
        country: "Côte d'Ivoire",
        code: 'CI',
        city: 'Abidjan',
        profession: 'Entrepreneur culturel',
        height: 180,
        zodiac: 'Scorpion',
        bio: "Entre Cocody et Bassam, j'apprécie les échanges sincères, le bon café et le cinéma africain.",
        avatar: '/media/zola_portrait_man_2_1794726546962.jpg',
        interests: [3, 7, 8, 11],
      },
      {
        email: 'admin@zola.africa',
        role: 'super_admin',
        verified: 1,
        online: 1,
        full_name: 'Aminata Kaboré',
        birth_date: '1994-06-18',
        gender: 'Femme',
        seeking: 'Tous',
        country: 'Burkina Faso',
        code: 'BF',
        city: 'Ouagadougou',
        profession: 'Responsable Communauté ZOLA',
        height: 171,
        zodiac: 'Gémeaux',
        bio: "Modération, sécurité et accompagnement des membres de la communauté ZOLA.",
        avatar: '/media/zola_register_woman_1794726545235.jpg',
        interests: [1, 6, 8],
      },
    ];

    const createdIds: number[] = [];
    for (const p of seedProfiles) {
      const info = insertUser.run(p.email, defaultPass, p.role, p.verified, p.online);
      const uid = Number(info.lastInsertRowid);
      createdIds.push(uid);
      insertProfile.run(
        uid,
        p.full_name,
        p.birth_date,
        p.gender,
        p.seeking,
        p.country,
        p.code,
        p.city,
        p.profession,
        p.height,
        p.zodiac,
        p.bio,
        p.avatar
      );
      insertPhoto.run(uid, p.avatar, 1);
      for (const iid of p.interests) {
        insertUserInterest.run(uid, iid);
      }
      if (p.role === 'super_admin') {
        db.prepare('INSERT INTO admin_users (user_id, admin_role, permissions_json) VALUES (?, ?, ?)').run(
          uid,
          'super_admin',
          JSON.stringify(['users', 'verify', 'reports', 'payments', 'plans', 'settings'])
        );
      }
    }

    // Seed one genuine mutual match & conversation between Awa (1) and Mamadou (2)
    if (createdIds.length >= 2) {
      const [awaId, mamadouId] = createdIds;
      db.prepare('INSERT INTO likes (from_user_id, to_user_id) VALUES (?, ?)').run(awaId, mamadouId);
      db.prepare('INSERT INTO likes (from_user_id, to_user_id) VALUES (?, ?)').run(mamadouId, awaId);
      const mInfo = db.prepare('INSERT INTO matches (user_one_id, user_two_id) VALUES (?, ?)').run(awaId, mamadouId);
      const matchId = Number(mInfo.lastInsertRowid);
      const cInfo = db.prepare('INSERT INTO conversations (match_id) VALUES (?)').run(matchId);
      const convId = Number(cInfo.lastInsertRowid);
      db.prepare('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)').run(convId, awaId);
      db.prepare('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)').run(convId, mamadouId);
      db.prepare('INSERT INTO messages (conversation_id, sender_id, content, is_read) VALUES (?, ?, ?, 1)').run(
        convId,
        awaId,
        'Salut Mamadou ! Ça va ? 😊'
      );
      db.prepare('INSERT INTO messages (conversation_id, sender_id, content, is_read) VALUES (?, ?, ?, 1)').run(
        convId,
        mamadouId,
        'Oui très bien et toi Awa ? Ravi de matcher avec toi !'
      );
      db.prepare('INSERT INTO notifications (user_id, type, title, body, related_user_id) VALUES (?, ?, ?, ?, ?)').run(
        mamadouId,
        'match',
        "C'est un Match !",
        'Awa et vous vous plaisez mutuellement.',
        awaId
      );
    }
  }
}
