/**
 * Kubeez serves final audio/video at media.kubeez.com without CORS headers, so browser `fetch()` fails.
 * Dev (Vite) and production (Vercel) rewrite `/api/kubeez-media/*` to that CDN so requests stay same-origin.
 */
export const KUBEEZ_MEDIA_PROXY_PATH_PREFIX = '/api/kubeez-media';

export function rewriteKubeezMediaCdnUrlForFetch(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (parsed.hostname !== 'media.kubeez.com') {
    return url;
  }

  if (typeof globalThis.window === 'undefined') {
    return url;
  }

  return `${KUBEEZ_MEDIA_PROXY_PATH_PREFIX}${parsed.pathname}${parsed.search}`;
}
