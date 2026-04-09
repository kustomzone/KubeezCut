/**
 * Browser `fetch()` stays same-origin for **media** (`media.kubeez.com` → `/api/kubeez/cdn/...`) so downloads
 * work without CDN CORS (Vite, nginx, Vercel). The **API** may use `VITE_KUBEEZ_BROWSER_API_URL` for direct
 * `api.kubeez.com` when that origin allows your editor; the CDN often does not, so we never fetch media cross-origin.
 *
 * CDN traffic is nested under `/api/kubeez/` so self-hosted setups can pair one `location /api/kubeez/` story:
 * map `/api/kubeez/cdn/` → media host, everything else → api host (see `vercel.json`).
 */

/** Must match `vite.config` proxy + production reverse-proxy paths. */
export const KUBEEZ_API_PROXY_PATH_PREFIX = '/api/kubeez';
/** More specific than `/api/kubeez`; must be proxied to `https://media.kubeez.com` before the API catch-all. */
export const KUBEEZ_MEDIA_PROXY_PATH_PREFIX = '/api/kubeez/cdn';

/** Legacy same-origin path (older deploys). Normalize to {@link KUBEEZ_MEDIA_PROXY_PATH_PREFIX} when seen. */
const KUBEEZ_MEDIA_PROXY_LEGACY_PATH_PREFIX = '/api/kubeez-media';

/** Build-time: non-empty → browser uses this origin for **API** JSON/SSE only; media still uses `/api/kubeez/cdn`. */
export function kubeezBrowserDirectApiOrigin(): string {
  const v = import.meta.env.VITE_KUBEEZ_BROWSER_API_URL;
  if (typeof v !== 'string') return '';
  return v.trim().replace(/\/$/, '');
}

function kubeezPreferDirectKubeezHosts(): boolean {
  return kubeezBrowserDirectApiOrigin().length > 0;
}

function pathWithQueryAndHash(u: URL): string {
  return `${u.pathname}${u.search}${u.hash}`;
}

/**
 * Rewrites Kubeez production URLs (and dev same-origin proxy URLs) to relative paths that go
 * through the app proxy — mirrors how we call `POST /api/kubeez/v1/...` instead of `https://api.kubeez.com`.
 */
export function rewriteKubeezUrlForSameOriginFetch(url: string): string {
  if (typeof globalThis.window === 'undefined') {
    return url;
  }

  const raw = url.trim();
  if (!raw) return raw;

  let parsed: URL;
  try {
    if (raw.startsWith('//')) {
      parsed = new URL(`https:${raw}`);
    } else if (/^https?:\/\//i.test(raw)) {
      parsed = new URL(raw);
    } else if (raw.startsWith('/')) {
      // Root-relative: resolve against the correct Kubeez host, then map to our proxy prefix.
      if (raw.startsWith(`${KUBEEZ_API_PROXY_PATH_PREFIX}/`) || raw === KUBEEZ_API_PROXY_PATH_PREFIX) {
        return raw;
      }
      if (raw.startsWith(`${KUBEEZ_MEDIA_PROXY_LEGACY_PATH_PREFIX}/`) || raw === KUBEEZ_MEDIA_PROXY_LEGACY_PATH_PREFIX) {
        return `${KUBEEZ_MEDIA_PROXY_PATH_PREFIX}${raw.slice(KUBEEZ_MEDIA_PROXY_LEGACY_PATH_PREFIX.length)}`;
      }
      if (raw.startsWith('/v1/') || raw === '/health') {
        parsed = new URL(raw, 'https://api.kubeez.com/');
      } else {
        parsed = new URL(raw, 'https://media.kubeez.com/');
      }
    } else {
      return url;
    }
  } catch {
    return url;
  }

  // Already using our dev / prod same-origin proxy — keep as relative path for fetch.
  try {
    if (parsed.origin === window.location.origin) {
      const p = parsed.pathname.replace(/\/$/, '') || '/';
      if (p === KUBEEZ_API_PROXY_PATH_PREFIX || p.startsWith(`${KUBEEZ_API_PROXY_PATH_PREFIX}/`)) {
        return pathWithQueryAndHash(parsed);
      }
      if (p === KUBEEZ_MEDIA_PROXY_LEGACY_PATH_PREFIX || p.startsWith(`${KUBEEZ_MEDIA_PROXY_LEGACY_PATH_PREFIX}/`)) {
        const u = new URL(parsed.toString());
        u.pathname = `${KUBEEZ_MEDIA_PROXY_PATH_PREFIX}${u.pathname.slice(KUBEEZ_MEDIA_PROXY_LEGACY_PATH_PREFIX.length)}`;
        return `${u.pathname}${u.search}${u.hash}`;
      }
    }
  } catch {
    /* ignore */
  }

  if (parsed.hostname === 'api.kubeez.com' && !kubeezPreferDirectKubeezHosts()) {
    return `${KUBEEZ_API_PROXY_PATH_PREFIX}${parsed.pathname}${parsed.search}${parsed.hash}`;
  }
  if (parsed.hostname === 'media.kubeez.com') {
    return `${KUBEEZ_MEDIA_PROXY_PATH_PREFIX}${parsed.pathname}${parsed.search}${parsed.hash}`;
  }

  return url;
}

/** Media / CDN download URLs (images, audio, video files on media.kubeez.com). */
export function rewriteKubeezMediaCdnUrlForFetch(url: string): string {
  return rewriteKubeezUrlForSameOriginFetch(url);
}
