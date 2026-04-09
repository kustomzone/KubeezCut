/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Browser API origin (skips `/api/kubeez` for JSON/SSE). When unset, media uses same-origin
   * `/api/kubeez/cdn/*` (see vercel.json / nginx). When set (e.g. editor.kubeez.com prod), media is
   * fetched from `https://media.kubeez.com` — that origin must allow CORS + CORP for the editor.
   */
  readonly VITE_KUBEEZ_BROWSER_API_URL?: string;
}
