import React from 'react';
import {
  Bell,
  Compass,
  Crown,
  Home,
  LogOut,
  MessageCircle,
  Settings,
  Shield,
  User,
} from 'lucide-react';
import type { AppRoute, UserProfile } from '../types';
import { ZolaLogo } from './ZolaLogo';

interface AppShellProps {
  user: UserProfile;
  activeRoute: AppRoute;
  unreadMessages: number;
  unreadNotifications: number;
  onNavigate: (route: AppRoute) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  user,
  activeRoute,
  unreadMessages,
  unreadNotifications,
  onNavigate,
  onLogout,
  children,
}) => {
  const isAdmin = ['moderator', 'admin', 'super_admin'].includes(user.role);

  const navItems: Array<{
    route: AppRoute;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    { route: 'discover', label: 'Découvrir', icon: <Compass className="h-5 w-5" /> },
    { route: 'messages', label: 'Messages', icon: <MessageCircle className="h-5 w-5" />, badge: unreadMessages },
    { route: 'notifications', label: 'Notifications', icon: <Bell className="h-5 w-5" />, badge: unreadNotifications },
    { route: 'profile', label: 'Mon profil', icon: <User className="h-5 w-5" /> },
    { route: 'premium', label: 'Premium', icon: <Crown className="h-5 w-5 text-amber-400" /> },
    { route: 'settings', label: 'Paramètres', icon: <Settings className="h-5 w-5" /> },
  ];

  if (isAdmin) {
    navItems.push({ route: 'admin', label: 'Administration', icon: <Shield className="h-5 w-5 text-orange-400" /> });
  }

  return (
    <div className="min-h-screen bg-[#0B0909] text-stone-100 flex flex-col">
      {/* Top App Bar matching mockup */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0B0909]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => onNavigate('discover')} className="focus-visible:outline-none">
              <ZolaLogo size="sm" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {!user.is_premium ? (
              <button
                type="button"
                onClick={() => onNavigate('premium')}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-400/10 px-3.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-400/20"
              >
                <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                Devenir Premium
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('premium')}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3.5 py-1.5 text-xs font-semibold text-amber-300"
              >
                <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                Premium actif
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-stone-300 hover:bg-white/10 hover:text-white"
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
              className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 p-1 pr-3 hover:bg-white/10"
            >
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="h-8 w-8 rounded-full object-cover"
              />
              <span className="hidden sm:inline text-xs font-medium text-white max-w-[110px] truncate">
                {user.first_name}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace: Desktop Sidebar + Content */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-3 py-5 sm:px-6 pb-24 lg:pb-8">
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
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
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
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-stone-400 hover:bg-white/5 hover:text-white"
            >
              <Home className="h-4 w-4" />
              <span>Page d'accueil</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Mobile Bottom Tab Bar matching mockup (Accueil, Découvrir, Messages, Notifications, Profil) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0F0B0A]/95 backdrop-blur-md">
        <div className="grid grid-cols-5 h-16 items-center">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] ${
              activeRoute === 'landing' ? 'text-orange-400' : 'text-stone-400'
            }`}
          >
            <Home className="h-5 w-5" />
            <span>Accueil</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('discover')}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] ${
              activeRoute === 'discover' ? 'text-orange-400' : 'text-stone-400'
            }`}
          >
            <Compass className="h-5 w-5" />
            <span>Découvrir</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('messages')}
            className={`relative flex flex-col items-center justify-center gap-1 text-[11px] ${
              activeRoute === 'messages' ? 'text-orange-400' : 'text-stone-400'
            }`}
          >
            <MessageCircle className="h-5 w-5" />
            <span>Messages</span>
            {unreadMessages > 0 && (
              <span className="absolute top-1.5 right-4 h-4 min-w-[16px] rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white tabular-nums">
                {unreadMessages}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('notifications')}
            className={`relative flex flex-col items-center justify-center gap-1 text-[11px] ${
              activeRoute === 'notifications' ? 'text-orange-400' : 'text-stone-400'
            }`}
          >
            <Bell className="h-5 w-5" />
            <span>Alertes</span>
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-4 h-4 min-w-[16px] rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white tabular-nums">
                {unreadNotifications}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] ${
              activeRoute === 'profile' || activeRoute === 'edit-profile' || activeRoute === 'settings'
                ? 'text-orange-400'
                : 'text-stone-400'
            }`}
          >
            <User className="h-5 w-5" />
            <span>Profil</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
