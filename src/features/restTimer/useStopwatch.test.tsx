import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStopwatch } from './useStopwatch';

let root: Root;
let host: HTMLDivElement;
let timer: ReturnType<typeof useStopwatch>;
let parentRenders: number;
function Counter({ open }: { open: boolean }) {
  timer = useStopwatch(open);
  return <span>{timer.elapsedMs}</span>;
}
function Parent({ open }: { open: boolean }) {
  parentRenders++;
  return <Counter open={open} />;
}
const render = (open: boolean) => act(() => root.render(<Parent open={open} />));
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  parentRenders = 0;
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('isolated stopwatch', () => {
  it('does not schedule refreshes when stopped and does not rerender the parent on ticks', () => {
    render(true);
    expect(vi.getTimerCount()).toBe(0);
    act(() => timer.toggleRunning());
    advance(1000);
    expect(timer.elapsedMs).toBeGreaterThanOrEqual(980);
    expect(parentRenders).toBe(1);
  });

  it('stops refreshes while closed and recovers elapsed wall time when reopened', () => {
    render(true);
    act(() => timer.toggleRunning());
    advance(100);
    render(false);
    expect(vi.getTimerCount()).toBe(0);
    advance(60_000);
    render(true);
    expect(timer.elapsedMs).toBe(60_100);
  });

  it('suspends animation while the document is hidden', () => {
    render(true);
    act(() => timer.toggleRunning());
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(vi.getTimerCount()).toBe(0);
    advance(30_000);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(timer.elapsedMs).toBe(30_000);
  });

  it('preserves pause, resume and reset and cleans up on unmount', () => {
    render(true);
    act(() => timer.toggleRunning());
    advance(1000);
    act(() => timer.toggleRunning());
    expect(timer.elapsedMs).toBe(1000);
    expect(vi.getTimerCount()).toBe(0);
    advance(2000);
    act(() => timer.toggleRunning());
    advance(500);
    act(() => timer.toggleRunning());
    expect(timer.elapsedMs).toBe(1500);
    act(() => timer.reset());
    expect(timer.elapsedMs).toBe(0);
    expect(timer.isRunning).toBe(false);
    act(() => timer.toggleRunning());
    act(() => root.render(null));
    expect(vi.getTimerCount()).toBe(0);
  });
});
