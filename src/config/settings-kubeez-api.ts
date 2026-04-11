/** Hash fragment for deep-linking to the Kubeez API key block (see generate dialog → Settings). */
export const SETTINGS_KUBEEZ_API_HASH = 'kubeez-api';

/**
 * Use on every Link / navigate to this section. TanStack Router defaults would otherwise
 * `resetScroll` to the top and `hashScrollIntoView` to the start of the target — both fight vertical centering.
 */
export const SETTINGS_KUBEEZ_API_LINK_PROPS = {
  to: '/settings' as const,
  hash: SETTINGS_KUBEEZ_API_HASH,
  resetScroll: false,
  hashScrollIntoView: false,
} as const;
