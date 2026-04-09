/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Browser API origin (skips `/api/kubeez`). Production builds for `editor.kubeez.com` default to
   * `https://api.kubeez.com` when unset (see vite.config). Set explicitly for other self-hosted DNS;
   * use nginx proxy + leave unset on non-editor hosts so `/api/kubeez` is used.
   */
  readonly VITE_KUBEEZ_BROWSER_API_URL?: string;
}
