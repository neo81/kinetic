import { useEffect, useRef, useState, useTransition, type PointerEvent as ReactPointerEvent } from 'react';
import { Dumbbell, History, Home, Search } from 'lucide-react';
import type { View } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { ConfirmDialog } from './ConfirmDialog';
import { ProfileAvatar } from './ProfileAvatar';

let lastBottomNavIndex: number | null = null;
const DRAG_THRESHOLD_PX = 8;

type LensDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startIndex: number;
  currentPosition: number;
  hasStarted: boolean;
};

const clampLensPosition = (position: number, lastIndex: number) =>
  Math.min(lastIndex, Math.max(0, position));

const getActiveItemId = (active: View): View => {
  if (active === 'routine-creator' || active === 'routine-detail') return 'routines-list';
  if (active === 'exercise-list' || active === 'exercise-editor') return 'exercise-selector';
  return active;
};

export const BottomNav = ({
  active,
  setView,
  avatarUrl,
  hasUnsavedChanges = false,
}: {
  active: View;
  setView: (v: View) => void;
  avatarUrl?: string | null;
  hasUnsavedChanges?: boolean;
}) => {
  const { t } = useLanguage();
  const items = [
    { id: 'dashboard', icon: Home, label: t('nav.dashboard') },
    { id: 'routines-list', icon: Dumbbell, label: t('nav.routines') },
    { id: 'exercise-selector', icon: Search, label: t('nav.engine') },
    { id: 'history', icon: History, label: t('nav.history') },
    { id: 'settings', icon: null, label: t('settings.profile') },
  ];
  const activeItemId = getActiveItemId(active);
  const activeIndex = Math.max(0, items.findIndex((item) => item.id === activeItemId));
  const [animatedIndex, setAnimatedIndex] = useState(() => lastBottomNavIndex ?? activeIndex);
  const [isLensPressed, setIsLensPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const [isNavigating, startNavigation] = useTransition();
  const [pendingView, setPendingView] = useState<View | null>(null);
  const selectionTrackRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<LensDragState | null>(null);
  const dragTargetIndexRef = useRef<number | null>(null);
  const suppressNextClickRef = useRef(false);

  useEffect(() => {
    lastBottomNavIndex = activeIndex;
    const animationFrame = window.requestAnimationFrame(() => setAnimatedIndex(activeIndex));
    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeIndex]);

  const handleNavigate = (targetView: View) => {
    if (targetView === 'exercise-selector') {
      window.sessionStorage.setItem('kinetic.selectorSource', 'global');
    }

    startNavigation(() => setView(targetView));
  };

  const resetLensToActive = () => {
    if (selectionTrackRef.current) {
      selectionTrackRef.current.style.transition = '';
      selectionTrackRef.current.style.transform = `translate3d(${activeIndex * 100}%, 0, 0)`;
    }
    setAnimatedIndex(activeIndex);
    lastBottomNavIndex = activeIndex;
  };

  const requestNavigate = (targetView: View) => {
    if (targetView === active) return;

    if (hasUnsavedChanges) {
      setPendingView(targetView);
      resetLensToActive();
      return;
    }

    handleNavigate(targetView);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, itemId: string) => {
    if (itemId !== activeItemId || (event.pointerType === 'mouse' && event.button !== 0)) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startIndex: activeIndex,
      currentPosition: activeIndex,
      hasStarted: false,
    };
    setIsLensPressed(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (!dragState.hasStarted) {
      if (Math.abs(deltaX) < DRAG_THRESHOLD_PX) return;
      if (Math.abs(deltaY) >= Math.abs(deltaX)) return;

      dragState.hasStarted = true;
      suppressNextClickRef.current = true;
      setIsDragging(true);
      dragTargetIndexRef.current = activeIndex;
      setDragTargetIndex(activeIndex);
      if (selectionTrackRef.current) selectionTrackRef.current.style.transition = 'none';
    }

    event.preventDefault();
    const slotWidth = selectionTrackRef.current?.getBoundingClientRect().width ?? 1;
    const nextPosition = clampLensPosition(
      dragState.startIndex + deltaX / slotWidth,
      items.length - 1,
    );
    dragState.currentPosition = nextPosition;
    const nextTargetIndex = Math.round(nextPosition);
    if (dragTargetIndexRef.current !== nextTargetIndex) {
      dragTargetIndexRef.current = nextTargetIndex;
      setDragTargetIndex(nextTargetIndex);
    }

    if (selectionTrackRef.current) {
      selectionTrackRef.current.style.transform = `translate3d(${nextPosition * 100}%, 0, 0)`;
    }
  };

  const finishPointerGesture = (
    event: ReactPointerEvent<HTMLButtonElement>,
    cancelled = false,
  ) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    dragStateRef.current = null;
    setIsLensPressed(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!dragState.hasStarted) return;

    const targetIndex = cancelled
      ? activeIndex
      : clampLensPosition(Math.round(dragState.currentPosition), items.length - 1);

    if (selectionTrackRef.current) {
      selectionTrackRef.current.style.transition = '';
      selectionTrackRef.current.style.transform = `translate3d(${targetIndex * 100}%, 0, 0)`;
    }
    setIsDragging(false);
    setDragTargetIndex(null);
    dragTargetIndexRef.current = null;
    setAnimatedIndex(targetIndex);
    lastBottomNavIndex = targetIndex;

    window.setTimeout(() => {
      suppressNextClickRef.current = false;
    }, 0);

    if (!cancelled && targetIndex !== activeIndex) {
      requestNavigate(items[targetIndex].id as View);
    }
  };

  return (
    <>
      <nav aria-busy={isNavigating} className="theme-bottom-nav liquid-glass-bottom-nav fixed bottom-0 left-0 z-50 w-full px-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-2">
        <div className="theme-bottom-nav-inner liquid-glass-bottom-nav__surface mx-auto grid h-16 w-full max-w-[24rem] grid-cols-5 items-center rounded-[2rem] px-1.5">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-1.5 top-1/2 z-10 -translate-y-1/2">
          <div
            ref={selectionTrackRef}
            className={`liquid-glass-bottom-nav__selection-track flex justify-center ${isLensPressed ? 'is-pressed' : ''} ${isDragging ? 'is-dragging' : ''}`}
            style={{ transform: `translate3d(${animatedIndex * 100}%, 0, 0)` }}
          >
            <span className="liquid-glass-bottom-nav__selection block h-[3.25rem] w-[calc(100%-0.25rem)] max-w-[4.25rem] rounded-[1.625rem]" />
          </div>
        </div>
        {items.map((item, itemIndex) => {
          const shouldMagnify = isDragging && dragTargetIndex === itemIndex;

          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-current={activeItemId === item.id ? 'page' : undefined}
              title={item.label}
              onClick={(event) => {
                if (suppressNextClickRef.current) {
                  event.preventDefault();
                  suppressNextClickRef.current = false;
                  return;
                }
                requestNavigate(item.id as View);
              }}
              onPointerDown={(event) => handlePointerDown(event, item.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={(event) => finishPointerGesture(event)}
              onPointerCancel={(event) => finishPointerGesture(event, true)}
              onDragStart={(event) => event.preventDefault()}
              className={`group relative z-20 flex h-14 min-w-0 items-center justify-center rounded-[1.625rem] transition-all duration-500 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary/70 ${
                activeItemId === item.id
                  ? `touch-pan-y text-primary ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`
                  : 'liquid-glass-bottom-nav__item--inactive touch-manipulation'
                }`}
            >
              {item.icon ? (
                <item.icon
                  aria-hidden="true"
                  className={`pointer-events-none relative z-10 select-none transition-transform duration-200 ${
                    shouldMagnify ? 'scale-[1.16]' : activeItemId === item.id && !isDragging ? 'scale-105' : ''
                  }`}
                  size={28}
                  strokeWidth={activeItemId === item.id ? 2.5 : 2}
                />
              ) : (
                <span
                  className={`liquid-glass-bottom-nav__avatar pointer-events-none relative z-10 block h-9 w-9 select-none overflow-hidden rounded-full border transition-transform duration-200 ${
                    shouldMagnify ? 'scale-[1.16]' : activeItemId === item.id && !isDragging ? 'scale-105' : ''
                  }`}
                >
                  <ProfileAvatar avatarUrl={avatarUrl} />
                </span>
              )}
            </button>
          );
        })}
        </div>
      </nav>
      <ConfirmDialog
        isOpen={pendingView !== null}
        title={t('navigation.unsavedTitle')}
        message={t('navigation.unsavedMessage')}
        confirmText={t('navigation.leave')}
        cancelText={t('navigation.stay')}
        variant="warning"
        onCancel={() => {
          setPendingView(null);
          resetLensToActive();
        }}
        onConfirm={() => {
          const targetView = pendingView;
          setPendingView(null);
          if (targetView) handleNavigate(targetView);
        }}
      />
    </>
  );
};
