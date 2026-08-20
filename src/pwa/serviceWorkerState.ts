export type PwaServiceWorkerState = {
  offlineReady: boolean;
  updateAvailable: boolean;
};

let state: PwaServiceWorkerState = {
  offlineReady: false,
  updateAvailable: false,
};
let activateUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null;
const listeners = new Set<() => void>();

export const updatePwaServiceWorkerState = (nextState: Partial<PwaServiceWorkerState>) => {
  state = { ...state, ...nextState };
  listeners.forEach((listener) => listener());
};

export const setPwaUpdateActivator = (
  nextActivator: (reloadPage?: boolean) => Promise<void>,
) => {
  activateUpdate = nextActivator;
};

export const getPwaServiceWorkerState = () => state;

export const subscribeToPwaServiceWorker = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const activatePwaUpdate = async () => {
  if (!activateUpdate) return;
  await activateUpdate(true);
};

export const dismissPwaStatus = (status: keyof PwaServiceWorkerState) => {
  updatePwaServiceWorkerState({ [status]: false });
};
