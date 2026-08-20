import type React from 'react';
import { SyncStatusIndicator } from '../SyncStatusIndicator';

export const Header = ({
  children,
}: {
  children?: React.ReactNode;
}) => (
  <header className="fixed top-0 z-[60] w-full border-b theme-hairline-border bg-background/80 backdrop-blur-xl">
    <div className="mx-auto flex h-[4.5rem] w-full max-w-2xl items-center justify-between px-5 sm:px-6">
      <div className="flex items-center gap-3">
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
