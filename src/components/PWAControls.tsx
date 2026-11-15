import React, { useState } from 'react';
import { Download, Smartphone, WifiOff } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { useI18n } from '../lib/i18n';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { t } = useI18n();

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/15 text-orange-300 hover:bg-orange-500/25 transition-colors font-semibold ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs sm:text-sm'
        }`}
      >
        <Download className="h-3.5 w-3.5" />
        {t('pwa.install')}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-stone-200 hover:bg-white/10"
        >
          <Smartphone className="h-3.5 w-3.5 text-orange-400" />
          {t('pwa.installIos')}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="zola-card w-full max-w-sm rounded-3xl p-6 space-y-4">
              <h3 className="font-display text-lg font-bold text-white">{t('pwa.iosTitle')}</h3>
              <p className="text-sm text-stone-300 leading-relaxed">
                {t('pwa.iosStep1')}
                <br />
                {t('pwa.iosStep2')}
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="zola-gradient w-full rounded-full py-2.5 text-sm font-semibold text-white"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { t } = useI18n();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-amber-400/40 bg-[#1B1310]/95 px-4 py-2 text-xs font-medium text-amber-200 shadow-lg">
      <WifiOff className="h-3.5 w-3.5 text-amber-400" />
      {t('pwa.offline')}
    </div>
  );
};
