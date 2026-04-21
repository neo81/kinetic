import type React from 'react';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import type { View, UserProfile } from '../../types';

type PageShellProps = {
  activeView: View;
  setView: (view: View) => void;
  children: React.ReactNode;
  headerChildren?: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  showProfile?: boolean;
  showSettings?: boolean;
  containerClassName?: string;
  contentClassName?: string;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  profile?: UserProfile | null;
};

export const PageShell = ({
  activeView,
  setView,
  children,
  headerChildren,
  showHeader = true,
  showFooter = true,
  showProfile = true,
  showSettings = true,
  containerClassName = '',
  contentClassName = '',
  onProfileClick,
  onSettingsClick,
  profile,
}: PageShellProps) => (
  <div className={`relative min-h-screen overflow-hidden bg-background text-on-background ${showFooter ? 'pb-32' : ''} ${containerClassName}`.trim()}>
    <div className="pointer-events-none absolute inset-0 z-0 opacity-10">
      <div className="absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-primary blur-[150px]"></div>
      <div className="absolute -right-20 bottom-1/4 h-64 w-64 rounded-full bg-secondary/40 blur-[120px]"></div>
    </div>

    {showHeader && (
      <Header
        showProfile={showProfile}
        onProfileClick={onProfileClick}
        avatarUrl={profile?.avatarUrl}
      >
        {headerChildren}
      </Header>
    )}

    <main
      className={`relative z-10 mx-auto w-full max-w-2xl px-4 pb-24 ${showHeader ? 'pt-24' : 'pt-6'} sm:px-6 ${contentClassName}`.trim()}
    >
      {children}
    </main>

    {showFooter && <BottomNav active={activeView} setView={setView} />}
  </div>
);
