import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Bookmark,
  Compass,
  Crown,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  Shield,
  User,
  X,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import type { AppRoute, UserProfile } from '../types';
import { LanguageToggle } from './LanguageToggle';
import { PWAInstallButton } from './PWAControls';
import { ZolaLogo } from './ZolaLogo';

interface AppShellProps {
  user: UserProfile;
  activeRoute: AppRoute;
  unreadMessages: number;
  unreadNotifications: number;
  favoritesCount: number;
  onNavigate: (route: AppRoute) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  user,
  activeRoute,
  unreadMessages,
  unreadNotifications,
  favoritesCount,
  onNavigate,
  onLogout,
  children,
}) => {
  const { t, tCountry } = useI18n();
  const isAdmin = ['moderator', 'admin', 'super_admin'].includes(user.role);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; active: boolean } | null>(null);

  const openDrawer = () => {
    setDrawerMounted(true);
    setDragOffsetX(0);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setDrawerOpen(true));
    });
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDragOffsetX(0);
    setIsDraggingDrawer(false);
  };

  useEffect(() => {
    if (!drawerMounted) return;
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') closeDrawer();
      };
      window.addEventListener('keydown', onKey);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', onKey);
      };
    } else {
      document.body.style.overflow = '';
      const timer = setTimeout(() => setDrawerMounted(false), 280);
      return () => clearTimeout(timer);
    }
  }, [drawerMounted, drawerOpen]);

  const handleDrawerNavigate = (route: AppRoute) => {
    closeDrawer();
    onNavigate(route);
  };

  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY, active: false };
  };

  const handleDrawerTouchMove = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    const t = e.touches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    if (!start.active) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) && dx < 0) {
        start.active = true;
        setIsDraggingDrawer(true);
      } else if (Math.abs(dy) > 12) {
        touchStartRef.current = null;
        return;
      }
    }

    if (start.active) {
      setDragOffsetX(Math.min(0, dx));
    }
  };

  const handleDrawerTouchEnd = () => {
    if (touchStartRef.current?.active) {
      if (dragOffsetX < -72) {
        closeDrawer();
      } else {
        setDragOffsetX(0);
        setIsDraggingDrawer(false);
      }
    }
    touchStartRef.current = null;
  };

  const navItems: Array<{
    route: AppRoute;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    { route: 'discover', label: t('nav.discover'), icon: <Compass className="h-5 w-5" /> },
    { route: 'favorites', label: t('nav.favorites'), icon: <Bookmark className="h-5 w-5 text-amber-400" />, badge: favoritesCount },
    { route: 'messages', label: t('nav.messages'), icon: <MessageCircle className="h-5 w-5" />, badge: unreadMessages },
    { route: 'notifications', label: t('nav.notifications'), icon: <Bell className="h-5 w-5" />, badge: unreadNotifications },
    { route: 'profile', label: t('nav.profile'), icon: <User className="h-5 w-5" /> },
    { route: 'premium', label: t('nav.premium'), icon: <Crown className="h-5 w-5 text-amber-400" /> },
    { route: 'settings', label: t('nav.settings'), icon: <Settings className="h-5 w-5" /> },
  ];

  if (isAdmin) {
    navItems.push({ route: 'admin', label: t('nav.admin'), icon: <Shield className="h-5 w-5 text-orange-400" /> });
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-[#0B0909] text-stone-100 flex flex-col">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0B0909]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={openDrawer}
              aria-label={t('nav.openMenu')}
              aria-expanded={drawerOpen}
              className="lg:hidden flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-stone-200 active:scale-95 transition-transform hover:bg-white/10"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate(isAdmin ? 'admin' : 'discover')}
              className="focus-visible:outline-none active:scale-95 transition-transform"
            >
              <ZolaLogo size="sm" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                aria-label={t('nav.admin')}
                className={`inline-flex h-11 sm:h-auto items-center gap-1.5 rounded-full border px-3 sm:px-3.5 sm:py-1.5 text-xs font-semibold active:scale-95 transition-all ${
                  activeRoute === 'admin'
                    ? 'border-orange-400/60 bg-orange-500/20 text-orange-200'
                    : 'border-orange-500/35 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20'
                }`}
              >
                <Shield className="h-3.5 w-3.5 text-orange-400" />
                <span className="hidden sm:inline">{t('nav.admin')}</span>
              </button>
            )}
            <div className="hidden sm:inline-flex">
              <PWAInstallButton compact />
            </div>
            <LanguageToggle compact className="hidden sm:inline-flex" />
            {!user.is_premium ? (
              <button
                type="button"
                onClick={() => onNavigate('premium')}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-400/10 px-3.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-400/20 active:scale-95 transition-all"
              >
                <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {t('nav.becomePremium')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('premium')}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3.5 py-1.5 text-xs font-semibold text-amber-300 active:scale-95 transition-all"
              >
                <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {t('nav.premiumActive')}
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigate('favorites')}
              aria-label={t('nav.favorites')}
              title={t('nav.favorites')}
              className={`lg:hidden relative flex h-11 w-11 items-center justify-center rounded-full border active:scale-95 transition-all ${
                activeRoute === 'favorites'
                  ? 'border-amber-400/50 bg-amber-400/15 text-amber-300'
                  : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Bookmark className="h-4 w-4" />
              {favoritesCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-stone-950 tabular-nums">
                  {favoritesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              aria-label="Notifications"
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-stone-300 hover:bg-white/10 hover:text-white active:scale-95 transition-all"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white tabular-nums">
                  {unreadNotifications}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="flex min-h-[44px] items-center gap-2.5 rounded-full border border-white/10 bg-white/5 p-1 sm:pr-3 hover:bg-white/10 active:scale-95 transition-all"
            >
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="h-9 w-9 rounded-full object-cover"
              />
              <span className="hidden sm:inline text-xs font-medium text-white max-w-[110px] truncate">
                {user.first_name}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Native Slide-Over Lateral Drawer with Touch Swipe-to-Dismiss */}
      {drawerMounted && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.mainMenu')}
        >
          <div
            onClick={closeDrawer}
            className={`fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              drawerOpen ? 'opacity-100' : 'opacity-0'
            }`}
          />

          <aside
            onTouchStart={handleDrawerTouchStart}
            onTouchMove={handleDrawerTouchMove}
            onTouchEnd={handleDrawerTouchEnd}
            style={{
              transform: drawerOpen
                ? `translateX(${dragOffsetX}px)`
                : 'translateX(-100%)',
              transition: isDraggingDrawer
                ? 'none'
                : 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)',
              touchAction: 'pan-y',
            }}
            className="relative z-10 flex h-full w-[82vw] max-w-[300px] flex-col justify-between border-r border-white/12 bg-[#120D0C] p-4 shadow-2xl overscroll-contain will-change-transform"
          >
            <div className="space-y-4 overflow-y-auto pr-1">
              <div className="flex items-center justify-between border-b border-white/8 pb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="h-11 w-11 rounded-full object-cover border border-white/15 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold text-white truncate">{user.full_name}</p>
                    <p className="text-xs text-stone-400 truncate">
                      {user.city}, {tCountry(user.country) || user.country_code}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  aria-label={t('nav.closeMenu')}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-stone-300 active:scale-95 transition-transform"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const active =
                    activeRoute === item.route ||
                    (item.route === 'profile' && activeRoute === 'edit-profile');
                  return (
                    <button
                      key={item.route}
                      type="button"
                      onClick={() => handleDrawerNavigate(item.route)}
                      className={`flex min-h-[48px] w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all active:scale-[0.98] ${
                        active
                          ? 'zola-gradient text-white shadow-md shadow-orange-600/20'
                          : 'text-stone-200 hover:bg-white/5 active:bg-white/10'
                      }`}
                    >
                      <span className="flex items-center gap-3.5">
                        {item.icon}
                        <span>{item.label}</span>
                      </span>
                      {item.badge && item.badge > 0 ? (
                        <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-bold text-white tabular-nums">
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="space-y-2 border-t border-white/10 pt-3 pb-safe">
              <div className="flex flex-wrap items-center justify-center gap-2 pb-1">
                <LanguageToggle />
                <PWAInstallButton compact />
              </div>
              <button
                type="button"
                onClick={() => handleDrawerNavigate('landing')}
                className="flex min-h-[48px] w-full items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium text-stone-300 hover:bg-white/5 active:scale-[0.98] transition-all"
              >
                <Home className="h-5 w-5" />
                <span>{t('nav.home')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  onLogout();
                }}
                className="flex min-h-[48px] w-full items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 active:scale-[0.98] transition-all"
              >
                <LogOut className="h-5 w-5" />
                <span>{t('nav.logout')}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Workspace: Desktop Sidebar + Content */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-3 py-4 sm:px-6 sm:py-5 pb-24 lg:pb-8">
        <aside className="hidden lg:flex w-60 shrink-0 flex-col justify-between zola-card rounded-2xl p-4 h-[calc(100vh-96px)] sticky top-20">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active =
                activeRoute === item.route ||
                (item.route === 'profile' && activeRoute === 'edit-profile');
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => onNavigate(item.route)}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all active:scale-[0.98] ${
                    active
                      ? 'zola-gradient text-white shadow-md shadow-orange-600/20'
                      : 'text-stone-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {item.badge && item.badge > 0 ? (
                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="space-y-2 border-t border-white/8 pt-3">
            <button
              type="button"
              onClick={() => onNavigate('landing')}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-stone-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>{t('nav.home')}</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        </aside>

        <main className="min-w-0 w-full flex-1 overflow-x-clip">{children}</main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0F0B0A]/95 backdrop-blur-md pb-safe">
        <div className="grid grid-cols-5 h-16 items-center">
          <button
            type="button"
            onClick={() => onNavigate('discover')}
            className={`flex min-h-[48px] flex-col items-center justify-center gap-1 text-[11px] font-medium active:scale-90 transition-transform ${
              activeRoute === 'discover' ? 'text-orange-400' : 'text-stone-400'
            }`}
          >
            <Compass className="h-5 w-5" />
            <span>{t('nav.discover')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('favorites')}
            className={`relative flex min-h-[48px] flex-col items-center justify-center gap-1 text-[11px] font-medium active:scale-90 transition-transform ${
              activeRoute === 'favorites' ? 'text-amber-300' : 'text-stone-400'
            }`}
          >
            <Bookmark className={`h-5 w-5 ${activeRoute === 'favorites' ? 'fill-current' : ''}`} />
            <span>{t('nav.favorites')}</span>
            {favoritesCount > 0 && (
              <span className="absolute top-1.5 right-3.5 h-4 min-w-[16px] rounded-full bg-amber-400 px-1 text-[10px] font-bold text-stone-950 tabular-nums">
                {favoritesCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('messages')}
            className={`relative flex min-h-[48px] flex-col items-center justify-center gap-1 text-[11px] font-medium active:scale-90 transition-transform ${
              activeRoute === 'messages' ? 'text-orange-400' : 'text-stone-400'
            }`}
          >
            <MessageCircle className="h-5 w-5" />
            <span>{t('nav.messages')}</span>
            {unreadMessages > 0 && (
              <span className="absolute top-1.5 right-3.5 h-4 min-w-[16px] rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white tabular-nums">
                {unreadMessages}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('notifications')}
            className={`relative flex min-h-[48px] flex-col items-center justify-center gap-1 text-[11px] font-medium active:scale-90 transition-transform ${
              activeRoute === 'notifications' ? 'text-orange-400' : 'text-stone-400'
            }`}
          >
            <Bell className="h-5 w-5" />
            <span>{t('nav.alerts')}</span>
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-3.5 h-4 min-w-[16px] rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white tabular-nums">
                {unreadNotifications}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className={`flex min-h-[48px] flex-col items-center justify-center gap-1 text-[11px] font-medium active:scale-90 transition-transform ${
              activeRoute === 'profile' || activeRoute === 'edit-profile' || activeRoute === 'settings'
                ? 'text-orange-400'
                : 'text-stone-400'
            }`}
          >
            <User className="h-5 w-5" />
            <span>{t('nav.profileShort')}</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
