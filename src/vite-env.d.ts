/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Browser API origin (skips `/api/kubeez` for JSON/SSE). Media downloads still use `/api/kubeez-media`
   * (same-origin) because media.kubeez.com typically has no CORS for browser fetch(). Self-host: nginx
   * must proxy both paths unless you only use bundled defaults on Vercel.
   */
  readonly VITE_KUBEEZ_BROWSER_API_URL?: string;
}
