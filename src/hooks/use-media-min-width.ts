import { useSyncExternalStore } from 'react';

/** Minimum width for the desktop editor shell (below this, mobile-unavailable screen). */
const DESKTOP_MIN_PX = 1000;
const QUERY = `(min-width: ${DESKTOP_MIN_PX}px)`;

function subscribeMediaQuery(callback: () => void): () => void {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getMediaQuerySnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * Client-only: true when viewport width is at least 1000px.
 * Use to gate desktop-only UI (e.g. KubeezCut shell vs mobile message).
 */
export function useMediaMinDesktop(): boolean {
  return useSyncExternalStore(subscribeMediaQuery, getMediaQuerySnapshot, () => true);
}
