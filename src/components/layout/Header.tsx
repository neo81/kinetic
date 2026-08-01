import type React from 'react';
import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { SyncStatusIndicator } from '../SyncStatusIndicator';
import { useLanguage } from '../../i18n/LanguageContext';

const AvatarImage = ({ avatarUrl }: { avatarUrl?: string | null }) => {
  const { t } = useLanguage();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  if (!avatarUrl || hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-secondary/20">
        <User size={20} strokeWidth={1.5} className="text-on-surface-variant" />
      </div>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={t('header.profilePhoto')}
      className="block h-full w-full rounded-full object-cover"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
};

export const Header = ({
  children,
  showProfile = true,
  onProfileClick,
  avatarUrl,
}: {
  children?: React.ReactNode;
  showProfile?: boolean;
  onProfileClick?: () => void;
  avatarUrl?: string | null;
}) => (
  <header className="fixed top-0 z-[60] w-full border-b theme-hairline-border bg-background/80 backdrop-blur-xl">
    <div className="mx-auto flex h-[4.5rem] w-full max-w-2xl items-center justify-between px-5 sm:px-6">
      <div className="flex items-center gap-3">
        {showProfile && (
          <button
            onClick={onProfileClick}
            className="flex h-11 w-11 shrink-0 aspect-square items-center justify-center overflow-hidden rounded-full border border-primary/20 shadow-[0_10px_30px_color-mix(in_srgb,var(--strong-foreground)_18%,transparent)] transition-all hover:scale-105 hover:border-primary/40 active:scale-95"
          >
            <AvatarImage avatarUrl={avatarUrl} />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="theme-primary-indicator-glow h-2 w-2 rounded-full bg-primary"></div>
          <div className="leading-none">
            <span className="block font-headline text-[1.6rem] font-semibold uppercase tracking-[0.16em] text-primary">KINETIC</span>
            <span className="block text-[0.55rem] font-semibold uppercase tracking-[0.34em] text-on-surface-variant/70">Performance Engine</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <SyncStatusIndicator compact={true} />
        {children}
      </div>
    </div>
  </header>
);
