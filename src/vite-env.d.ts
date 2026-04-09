/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Browser API origin (skips `/api/kubeez` for JSON/SSE). Media downloads use `/api/kubeez/cdn/*`
   * (same-origin) because media.kubeez.com typically has no CORS for browser fetch(). Self-host: proxy
   * `/api/kubeez/cdn` → media and `/api/kubeez` → api (see vercel.json).
   */
  readonly VITE_KUBEEZ_BROWSER_API_URL?: string;
}
