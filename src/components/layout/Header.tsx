import type React from 'react';

export const Header = ({
  children,
  showSettings = true,
  showProfile = true,
  onProfileClick,
  onSettingsClick,
}: {
  children?: React.ReactNode;
  showSettings?: boolean;
  showProfile?: boolean;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
}) => (
  <header className="fixed top-0 z-[60] w-full border-b border-white/6 bg-background/80 backdrop-blur-xl">
    <div className="mx-auto flex h-[4.5rem] w-full max-w-2xl items-center justify-between px-5 sm:px-6">
      <div className="flex items-center gap-3">
        {showProfile && (
          <button
            onClick={onProfileClick}
            className="h-11 w-11 overflow-hidden rounded-full border border-primary/20 shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-all hover:scale-105 hover:border-primary/40 active:scale-95"
          >
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAuqYV9qbg0rCc4Y0gOuw8otuKS9knc-zWENbCKGoRzL6fAiXLiaF1lN1lrficV_tLdzRxH6J4ZXR5XcJkNgvoGcDkABeNoHRZp7H6ozqMmYPXkqx4cfiqvyoUcU2VFIRWqCAnXPngkYdfqmcETDT8ims9mNLjEIbyey8GZMZoHJY58vBCrGGpes1pnyItWfYkoZxgNU3swRZiFCMl5dQ3fY2OU7wlGeCMpeX2tLFSjbsvSRyCPocDNFTpzfILn5XHaxZwWGCdLBRZM"
              alt="athlete profile photo"
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
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
        {showSettings && (
          <button
            onClick={onSettingsClick}
            className="material-symbols-outlined flex h-11 w-11 items-center justify-center rounded-2xl border border-white/6 bg-surface-container-high/80 text-primary transition-all active:scale-95 hover:bg-surface-container-highest"
          >
            settings
          </button>
        )}
      </div>
    </div>
  </header>
);
