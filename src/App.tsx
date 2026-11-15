import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Heart } from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { AppShell } from './components/AppShell';
import { AuthViews } from './components/AuthViews';
import { DiscoverView } from './components/DiscoverView';
import { LandingPage } from './components/LandingPage';
import { MemberProfileView } from './components/MemberProfileView';
import { MessagesView, type WsSignalEvent } from './components/MessagesView';
import { PremiumView } from './components/PremiumView';
import {
  EditProfileView,
  NotificationsView,
  SettingsView,
} from './components/ProfileAndSettings';
import { ZolaLogo } from './components/ZolaLogo';
import { apiFetch, setCsrfToken } from './lib/api';
import type {
  AppRoute,
  Interest,
  MessageItem,
  NotificationItem,
  SiteSettings,
  SubscriptionPlan,
  UserProfile,
} from './types';

const DEFAULT_SETTINGS: SiteSettings = {
  hero_title: "Trouvez l'amour en Afrique",
  hero_subtitle: "Rencontrez des célibataires authentiques, près de chez vous ou partout en Afrique.",
  hero_cta_primary: 'Créer un compte',
  hero_cta_secondary: 'En savoir plus',
  footer_slogan: "Ensemble, trouvons l'amour",
  oauth_google_enabled: '0',
  oauth_facebook_enabled: '0',
  oauth_apple_enabled: '0',
  payment_provider_label: 'Paiement sécurisé',
};

export default function App() {
  const [route, setRoute] = useState<AppRoute>('landing');
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  const [activeMembers, setActiveMembers] = useState(0);
  const [verifiedMembers, setVerifiedMembers] = useState(0);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);

  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const [wsLastMessage, setWsLastMessage] = useState<MessageItem | null>(null);
  const [wsReadConvId, setWsReadConvId] = useState<number | null>(null);
  const [wsSignalEvent, setWsSignalEvent] = useState<WsSignalEvent | null>(null);
  const [wsMatchAlert, setWsMatchAlert] = useState<{
    partner: UserProfile;
    conversationId: number;
  } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const loadLanding = useCallback(async () => {
    const data = await apiFetch<{
      active_members: number;
      verified_members: number;
      settings: SiteSettings;
      plans: SubscriptionPlan[];
      interests: Interest[];
    }>('/api/public/landing');
    setActiveMembers(data.active_members);
    setVerifiedMembers(data.verified_members);
    setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    setPlans(data.plans);
    setInterests(data.interests);
  }, []);

  const loadNotificationsAndUnread = useCallback(async () => {
    try {
      const [notifRes, convRes] = await Promise.all([
        apiFetch<{ notifications: NotificationItem[] }>('/api/notifications'),
        apiFetch<{ conversations: Array<{ unread_count: number }> }>('/api/messages/conversations'),
      ]);
      setNotifications(notifRes.notifications);
      const totalUnread = convRes.conversations.reduce((acc, c) => acc + c.unread_count, 0);
      setUnreadMessages(totalUnread);
    } catch {
      // Ignore if logged out
    }
  }, []);

  useEffect(() => {
    Promise.all([
      loadLanding(),
      apiFetch<{ user: UserProfile | null; csrfToken: string | null }>('/api/auth/me')
        .then((res) => {
          setCsrfToken(res.csrfToken);
          setUser(res.user);
        })
        .catch(() => setUser(null)),
    ]).finally(() => setBooting(false));
  }, [loadLanding]);

  useEffect(() => {
    if (!user) return;
    loadNotificationsAndUnread();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as { event: string; payload: unknown };
        if (msg.event === 'message:new') {
          setWsLastMessage(msg.payload as MessageItem);
          loadNotificationsAndUnread();
        } else if (msg.event === 'messages:read') {
          const p = msg.payload as { conversationId: number };
          setWsReadConvId(p.conversationId);
        } else if (msg.event === 'match:created') {
          const p = msg.payload as { partner: UserProfile; conversationId: number };
          setWsMatchAlert(p);
          loadNotificationsAndUnread();
        } else if (msg.event === 'notification:new') {
          loadNotificationsAndUnread();
        } else if (
          msg.event.startsWith('typing:') ||
          msg.event.startsWith('call:')
        ) {
          setWsSignalEvent({ event: msg.event, payload: msg.payload as Record<string, unknown> });
          if (msg.event === 'call:offer') {
            setRoute('messages');
          }
        }
      } catch {
        // Ignore malformed WS frame
      }
    };
    return () => {
      wsRef.current = null;
      ws.close();
    };
  }, [user?.id, loadNotificationsAndUnread]);

  const sendWsEvent = useCallback((event: string, payload: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, payload }));
    }
  }, []);

  const handleNavigate = (next: AppRoute) => {
    const protectedRoutes: AppRoute[] = [
      'discover',
      'messages',
      'notifications',
      'profile',
      'member-profile',
      'edit-profile',
      'premium',
      'settings',
      'admin',
    ];
    if (protectedRoutes.includes(next) && !user) {
      setRoute('login');
      return;
    }
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setCsrfToken(null);
    setUser(null);
    setNotifications([]);
    setUnreadMessages(0);
    setRoute('landing');
    loadLanding();
  };

  const handleMarkNotificationsRead = async () => {
    await apiFetch('/api/notifications/read', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-[#0B0909] flex items-center justify-center">
        <div className="animate-pulse">
          <ZolaLogo size="lg" />
        </div>
      </div>
    );
  }

  if (route === 'landing') {
    return (
      <LandingPage
        activeMembers={activeMembers}
        verifiedMembers={verifiedMembers}
        settings={settings}
        plans={plans}
        onNavigate={handleNavigate}
        isAuthenticated={Boolean(user)}
      />
    );
  }

  if (route === 'legal') {
    return (
      <div className="min-h-screen bg-[#0B0909] text-stone-200 px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <button
            type="button"
            onClick={() => setRoute(user ? 'discover' : 'landing')}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-stone-300 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div className="zola-card rounded-3xl p-8 space-y-5">
            <ZolaLogo />
            <h1 className="font-display text-2xl font-bold text-white">
              Conditions d'utilisation & Politique de confidentialité
            </h1>
            <p className="text-sm leading-relaxed text-stone-300">
              ZOLA est réservé aux personnes majeures (18 ans et plus). Les informations de profil et conversations privées sont protégées, accessibles uniquement aux participants autorisés, et jamais revendues à des tiers.
            </p>
            <p className="text-sm leading-relaxed text-stone-300">
              Tout comportement frauduleux, usurpation d'identité ou harcèlement peut être signalé et entraîne la suspension immédiate du compte par notre modération.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (route === 'register' || route === 'login' || route === 'forgot-password') {
    return (
      <AuthViews
        mode={route}
        settings={settings}
        onNavigate={handleNavigate}
        onAuthSuccess={(authedUser) => {
          setUser(authedUser);
          loadLanding();
          setRoute('discover');
        }}
      />
    );
  }

  if (!user) {
    return (
      <AuthViews
        mode="login"
        settings={settings}
        onNavigate={handleNavigate}
        onAuthSuccess={(authedUser) => {
          setUser(authedUser);
          setRoute('discover');
        }}
      />
    );
  }

  const unreadNotifications = notifications.filter((n) => !n.is_read).length;

  return (
    <AppShell
      user={user}
      activeRoute={route}
      unreadMessages={unreadMessages}
      unreadNotifications={unreadNotifications}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    >
      {route === 'discover' && (
        <DiscoverView
          currentUser={user}
          interests={interests}
          onViewProfile={(id) => {
            setSelectedMemberId(id);
            setRoute('member-profile');
          }}
          onOpenChat={(convId) => {
            setActiveConversationId(convId);
            setRoute('messages');
          }}
          onGoPremium={() => setRoute('premium')}
        />
      )}

      {route === 'messages' && (
        <MessagesView
          currentUser={user}
          initialConversationId={activeConversationId}
          onViewProfile={(id) => {
            setSelectedMemberId(id);
            setRoute('member-profile');
          }}
          onConversationsChanged={loadNotificationsAndUnread}
          wsLastMessage={wsLastMessage}
          wsReadConversationId={wsReadConvId}
          wsSignalEvent={wsSignalEvent}
          sendWsEvent={sendWsEvent}
        />
      )}

      {route === 'notifications' && (
        <NotificationsView
          notifications={notifications}
          onMarkAllRead={handleMarkNotificationsRead}
          onViewProfile={(id) => {
            setSelectedMemberId(id);
            setRoute('member-profile');
          }}
        />
      )}

      {route === 'profile' && (
        <MemberProfileView
          memberId={user.id}
          isOwnProfile
          onBack={() => setRoute('discover')}
          onEditOwn={() => setRoute('edit-profile')}
          onOpenChat={(convId) => {
            setActiveConversationId(convId);
            setRoute('messages');
          }}
          onMatched={(partner, conversationId) => setWsMatchAlert({ partner, conversationId })}
        />
      )}

      {route === 'member-profile' && selectedMemberId && (
        <MemberProfileView
          memberId={selectedMemberId}
          isOwnProfile={selectedMemberId === user.id}
          onBack={() => setRoute('discover')}
          onEditOwn={() => setRoute('edit-profile')}
          onOpenChat={(convId) => {
            setActiveConversationId(convId);
            setRoute('messages');
          }}
          onMatched={(partner, conversationId) => setWsMatchAlert({ partner, conversationId })}
        />
      )}

      {route === 'edit-profile' && (
        <EditProfileView
          user={user}
          interests={interests}
          onUpdated={(u) => setUser(u)}
          onBack={() => setRoute('profile')}
        />
      )}

      {route === 'premium' && <PremiumView onUserUpdated={(u) => setUser(u)} />}

      {route === 'settings' && (
        <SettingsView
          user={user}
          onUpdated={(u) => setUser(u)}
          onEditProfile={() => setRoute('edit-profile')}
          onLogout={handleLogout}
          onDeleted={() => {
            setUser(null);
            setCsrfToken(null);
            loadLanding();
            setRoute('landing');
          }}
        />
      )}

      {route === 'admin' && (
        <AdminDashboard
          currentUserRole={user.role}
          onSettingsUpdated={loadLanding}
        />
      )}

      {wsMatchAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-orange-500/30 bg-[#140E0D] p-8 text-center">
            <p className="font-display text-3xl font-extrabold text-white">
              C'est un <span className="text-orange-400">Match !</span>{' '}
              <Heart className="inline-block h-7 w-7 fill-red-500 text-red-500 mb-1" />
            </p>
            <div className="my-6 flex items-center justify-center">
              <img
                src={user.avatar_url}
                alt={user.first_name}
                className="h-24 w-24 rounded-full object-cover border-4 border-orange-500 -mr-3"
              />
              <div className="z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white animate-pulse">
                <Heart className="h-5 w-5 fill-red-500 text-red-500" />
              </div>
              <img
                src={wsMatchAlert.partner.avatar_url}
                alt={wsMatchAlert.partner.first_name}
                className="h-24 w-24 rounded-full object-cover border-4 border-orange-500 -ml-3"
              />
            </div>
            <p className="text-sm text-stone-200 mb-6">
              Vous vous plaisez mutuellement avec {wsMatchAlert.partner.first_name} !
            </p>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  const convId = wsMatchAlert.conversationId;
                  setWsMatchAlert(null);
                  setActiveConversationId(convId);
                  setRoute('messages');
                }}
                className="zola-gradient w-full rounded-full py-3 text-sm font-semibold text-white"
              >
                Envoyer un message
              </button>
              <button
                type="button"
                onClick={() => setWsMatchAlert(null)}
                className="w-full py-2 text-sm text-stone-300 hover:text-white"
              >
                Continuer à découvrir
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
