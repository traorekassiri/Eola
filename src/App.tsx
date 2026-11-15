import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Heart } from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { AppShell } from './components/AppShell';
import { AuthViews } from './components/AuthViews';
import { DiscoverView } from './components/DiscoverView';
import { FavoritesView } from './components/FavoritesView';
import { LandingPage } from './components/LandingPage';
import { MemberProfileView } from './components/MemberProfileView';
import { MessagesView, type WsSignalEvent } from './components/MessagesView';
import { PremiumView } from './components/PremiumView';
import { OfflineIndicator } from './components/PWAControls';
import {
  EditProfileView,
  NotificationsView,
  SettingsView,
} from './components/ProfileAndSettings';
import { LanguageToggle } from './components/LanguageToggle';
import { ZolaLogo } from './components/ZolaLogo';
import { apiFetch, getSessionToken, setCsrfToken, setSessionToken } from './lib/api';
import { DEFAULT_SITE_SETTINGS } from './lib/cms';
import { useI18n } from './lib/i18n';
import type {
  AppRoute,
  Interest,
  MessageItem,
  NotificationItem,
  PublicProfilePreview,
  RegisterPrefill,
  SiteSettings,
  SubscriptionPlan,
  UserProfile,
} from './types';

const isAdminRole = (role?: string | null) =>
  role === 'moderator' || role === 'admin' || role === 'super_admin';

export default function App() {
  const { lang, t, setCmsSettings } = useI18n();
  const [route, setRoute] = useState<AppRoute>('landing');
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  const [activeMembers, setActiveMembers] = useState(0);
  const [verifiedMembers, setVerifiedMembers] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [countriesCount, setCountriesCount] = useState(0);
  const [previewProfiles, setPreviewProfiles] = useState<PublicProfilePreview[]>([]);
  const [registerPrefill, setRegisterPrefill] = useState<RegisterPrefill | null>(null);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);

  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);

  const [wsLastMessage, setWsLastMessage] = useState<MessageItem | null>(null);
  const [wsReadConvId, setWsReadConvId] = useState<number | null>(null);
  const [wsSignalEvent, setWsSignalEvent] = useState<WsSignalEvent | null>(null);
  const [wsMatchAlert, setWsMatchAlert] = useState<{
    partner: UserProfile;
    conversationId: number;
  } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const loadLanding = useCallback(async () => {
    try {
      const data = await apiFetch<{
        active_members: number;
        verified_members: number;
        total_matches?: number;
        countries_count?: number;
        preview_profiles?: PublicProfilePreview[];
        settings: SiteSettings;
        plans: SubscriptionPlan[];
        interests: Interest[];
      }>('/api/public/landing');
      setActiveMembers(data.active_members);
      setVerifiedMembers(data.verified_members);
      setTotalMatches(data.total_matches ?? 0);
      setCountriesCount(data.countries_count ?? 0);
      setPreviewProfiles(data.preview_profiles ?? []);
      const merged: SiteSettings = { ...DEFAULT_SITE_SETTINGS, ...data.settings };
      setSettings(merged);
      setCmsSettings(merged);
      setPlans(data.plans);
      setInterests(data.interests);
    } catch {
      // Keep default CMS fallback settings if initial public fetch temporarily fails
    }
  }, [setCmsSettings]);

  const loadNotificationsAndUnread = useCallback(async () => {
    try {
      const [notifRes, convRes, favRes] = await Promise.all([
        apiFetch<{ notifications: NotificationItem[] }>('/api/notifications'),
        apiFetch<{ conversations: Array<{ unread_count: number }> }>('/api/messages/conversations'),
        apiFetch<{ count: number }>('/api/favorites'),
      ]);
      setNotifications(notifRes.notifications);
      const totalUnread = convRes.conversations.reduce((acc, c) => acc + c.unread_count, 0);
      setUnreadMessages(totalUnread);
      setFavoritesCount(favRes.count);
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
          if (!res.user) setSessionToken(null);
          setUser(res.user);
          if (res.user && new URLSearchParams(window.location.search).has('saspay_ref')) {
            setRoute('premium');
          }
        })
        .catch(() => {
          setCsrfToken(null);
          setSessionToken(null);
          setUser(null);
        }),
    ]).finally(() => setBooting(false));
  }, [loadLanding]);

  useEffect(() => {
    if (!user) return;
    loadNotificationsAndUnread();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsToken = getSessionToken();
    const wsUrl = wsToken
      ? `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(wsToken)}`
      : `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
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
          msg.event.startsWith('call:') ||
          msg.event === 'message:reaction' ||
          msg.event === 'user:blocked'
        ) {
          const payload = msg.payload as Record<string, unknown>;
          setWsSignalEvent({ event: msg.event, payload });
          if (msg.event === 'call:offer') {
            setRoute('messages');
          } else if (msg.event === 'user:blocked') {
            const blockedById = Number(payload.blockedByUserId || 0);
            const blockedId = Number(payload.blockedUserId || 0);
            loadNotificationsAndUnread();
            setWsMatchAlert((prev) =>
              prev && (prev.partner.id === blockedById || prev.partner.id === blockedId) ? null : prev
            );
            setSelectedMemberId((prev) => {
              if (prev && (prev === blockedById || prev === blockedId)) {
                setRoute((r) => (r === 'member-profile' ? 'discover' : r));
                return null;
              }
              return prev;
            });
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
      'favorites',
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
    if (next === 'admin' && !isAdminRole(user?.role)) {
      setRoute('discover');
      return;
    }
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Clear local session even if server request fails
    }
    setCsrfToken(null);
    setSessionToken(null);
    setUser(null);
    setNotifications([]);
    setUnreadMessages(0);
    setFavoritesCount(0);
    setRoute('landing');
    loadLanding();
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await apiFetch('/api/notifications/read', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Ignore transient notification read error
    }
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
      <>
        <LandingPage
          activeMembers={activeMembers}
          verifiedMembers={verifiedMembers}
          totalMatches={totalMatches}
          countriesCount={countriesCount}
          previewProfiles={previewProfiles}
          settings={settings}
          plans={plans}
          onNavigate={handleNavigate}
          onStartRegister={(prefill) => {
            setRegisterPrefill(prefill);
            handleNavigate(user ? (isAdminRole(user.role) ? 'admin' : 'discover') : 'register');
          }}
          isAuthenticated={Boolean(user)}
          isAdmin={isAdminRole(user?.role)}
        />
        <OfflineIndicator />
      </>
    );
  }

  if (route === 'legal') {
    return (
      <div className="min-h-screen bg-[#0B0909] text-stone-200 px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setRoute(user ? (isAdminRole(user.role) ? 'admin' : 'discover') : 'landing')}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-stone-300 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </button>
            <LanguageToggle compact />
          </div>
          <div className="zola-card rounded-3xl p-8 space-y-5">
            <ZolaLogo />
            <h1 className="font-display text-2xl font-bold text-white">
              {(lang === 'en' ? settings.legal_title_en : settings.legal_title_fr) || t('legal.title')}
            </h1>
            <p className="text-sm leading-relaxed text-stone-300 whitespace-pre-line">
              {(lang === 'en' ? settings.legal_p1_en : settings.legal_p1_fr) || t('legal.p1')}
            </p>
            <p className="text-sm leading-relaxed text-stone-300 whitespace-pre-line">
              {(lang === 'en' ? settings.legal_p2_en : settings.legal_p2_fr) || t('legal.p2')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (route === 'register' || route === 'login' || route === 'forgot-password') {
    return (
      <>
        <AuthViews
          mode={route}
          settings={settings}
          registerPrefill={registerPrefill}
          onNavigate={handleNavigate}
          onAuthSuccess={(authedUser) => {
            setUser(authedUser);
            setRegisterPrefill(null);
            loadLanding();
            setRoute(isAdminRole(authedUser.role) ? 'admin' : 'discover');
          }}
        />
        <OfflineIndicator />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <AuthViews
          mode="login"
          settings={settings}
          onNavigate={handleNavigate}
          onAuthSuccess={(authedUser) => {
            setUser(authedUser);
            setRoute(isAdminRole(authedUser.role) ? 'admin' : 'discover');
          }}
        />
        <OfflineIndicator />
      </>
    );
  }

  const unreadNotifications = notifications.filter((n) => !n.is_read).length;

  return (
    <AppShell
      user={user}
      activeRoute={route}
      unreadMessages={unreadMessages}
      unreadNotifications={unreadNotifications}
      favoritesCount={favoritesCount}
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
          onFavoritesChanged={(count) => setFavoritesCount(count)}
        />
      )}

      {route === 'favorites' && (
        <FavoritesView
          onViewProfile={(id) => {
            setSelectedMemberId(id);
            setRoute('member-profile');
          }}
          onOpenChat={(convId) => {
            setActiveConversationId(convId);
            setRoute('messages');
          }}
          onBrowseDiscover={() => setRoute('discover')}
          onFavoritesChanged={(count) => setFavoritesCount(count)}
          onMatched={(partner, conversationId) => setWsMatchAlert({ partner, conversationId })}
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
          onFavoritesChanged={(count) => setFavoritesCount(count)}
          onBlocked={(blockedUserId, updatedConvs) => {
            setSelectedMemberId(null);
            setActiveConversationId(null);
            setNotifications((prev) => prev.filter((n) => n.related_user_id !== blockedUserId));
            setWsMatchAlert((prev) => (prev && prev.partner.id === blockedUserId ? null : prev));
            if (Array.isArray(updatedConvs)) {
              setUnreadMessages(updatedConvs.reduce((acc, c) => acc + c.unread_count, 0));
            }
            loadNotificationsAndUnread();
          }}
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

      {route === 'admin' && isAdminRole(user.role) && (
        <AdminDashboard
          currentUserRole={user.role}
          onSettingsUpdated={loadLanding}
        />
      )}

      {wsMatchAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-orange-500/30 bg-[#140E0D] p-8 text-center">
            <p className="font-display text-3xl font-extrabold text-white">
              {t('match.itsAMatch')} <span className="text-orange-400">{t('match.matchWord')}</span>{' '}
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
              {t('match.mutualWith', { name: wsMatchAlert.partner.first_name })}
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
                {t('match.sendMessage')}
              </button>
              <button
                type="button"
                onClick={() => setWsMatchAlert(null)}
                className="w-full py-2 text-sm text-stone-300 hover:text-white"
              >
                {t('match.keepDiscovering')}
              </button>
            </div>
          </div>
        </div>
      )}
      <OfflineIndicator />
    </AppShell>
  );
}
