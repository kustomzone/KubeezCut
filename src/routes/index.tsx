import { createFileRoute, redirect } from '@tanstack/react-router';
import { KubeezCutHomePage } from '@/components/marketing/kubeezcut-home-page';
import { getAllProjects } from '@/infrastructure/storage/indexeddb';

const RETURNING_USER_KEY = 'kubeezcut:hasVisited';

function markVisited() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(RETURNING_USER_KEY, '1');
    }
  } catch { /* private mode / quota */ }
}

function RootRoute() {
  return <KubeezCutHomePage />;
}

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    // Fast path: localStorage flag avoids an IndexedDB round-trip for known returners.
    // IMPORTANT: `redirect()` throws a Response, so the throw MUST happen outside
    // any try/catch that could swallow it.
    let hasFlag = false;
    try {
      hasFlag = typeof localStorage !== 'undefined'
        && localStorage.getItem(RETURNING_USER_KEY) === '1';
    } catch { /* private mode / storage blocked */ }

    if (hasFlag) {
      throw redirect({ to: '/projects' });
    }

    // Fallback: users who predate the flag (or cleared localStorage) but already
    // have projects should still skip the landing page.
    let projectCount = 0;
    try {
      const projects = await getAllProjects();
      projectCount = projects.length;
    } catch { /* IndexedDB unavailable */ }

    if (projectCount > 0) {
      markVisited();
      throw redirect({ to: '/projects' });
    }

    // First-time visitor: mark the flag now (not during render) so the next
    // visit takes the fast path reliably even if they navigate away quickly.
    markVisited();
  },
  component: RootRoute,
});
