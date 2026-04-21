import type React from 'react';
import { User } from 'lucide-react';

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
  <header className="fixed top-0 z-[60] w-full border-b border-white/6 bg-background/80 backdrop-blur-xl">
    <div className="mx-auto flex h-[4.5rem] w-full max-w-2xl items-center justify-between px-5 sm:px-6">
      <div className="flex items-center gap-3">
        {showProfile && (
          <button
            onClick={onProfileClick}
            className="h-11 w-11 overflow-hidden rounded-full border border-primary/20 shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-all hover:scale-105 hover:border-primary/40 active:scale-95 flex items-center justify-center"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="profile photo"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <User size={20} strokeWidth={1.5} className="text-on-surface-variant" />
              </div>
            )}
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(212,255,0,0.9)]"></div>
          <div className="leading-none">
            <span className="block font-headline text-[1.6rem] font-semibold uppercase tracking-[0.16em] text-primary">KINETIC</span>
            <span className="block text-[0.55rem] font-semibold uppercase tracking-[0.34em] text-on-surface-variant/70">Performance Engine</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {children}
      </div>
    </div>
  </header>
);
