import type React from 'react';
import { SyncStatusIndicator } from '../SyncStatusIndicator';

export const Header = ({
  children,
}: {
  children?: React.ReactNode;
}) => (
  <header className="fixed top-0 z-[60] w-full border-b theme-hairline-border bg-background/80 backdrop-blur-xl">
    <div className="mx-auto flex h-[4.5rem] w-full max-w-2xl items-center justify-between gap-2 px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 min-[390px]:gap-3">
        <div className="flex min-w-0 items-center gap-2 min-[390px]:gap-3">
          <div className="theme-primary-indicator-glow h-2 w-2 rounded-full bg-primary"></div>
          <div className="min-w-0 leading-none">
            <span className="block font-headline text-[1.35rem] font-semibold uppercase tracking-[0.1em] text-primary min-[390px]:text-[1.6rem] min-[390px]:tracking-[0.16em]">KINETIC</span>
            <span className="hidden text-[0.55rem] font-semibold uppercase tracking-[0.34em] text-on-surface-variant/70 min-[390px]:block">Performance Engine</span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 min-[390px]:gap-3">
        <SyncStatusIndicator compact={true} />
        {children}
      </div>
    </div>
  </header>
);
