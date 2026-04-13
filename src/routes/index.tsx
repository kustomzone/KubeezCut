import { createFileRoute, redirect } from '@tanstack/react-router';
import { KubeezCutHomePage } from '@/components/marketing/kubeezcut-home-page';

const RETURNING_USER_KEY = 'kubeezcut:hasVisited';

function RootRoute() {
  // First visit: show landing, mark visited so next time we skip to /projects.
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(RETURNING_USER_KEY, '1');
    }
  } catch { /* private mode / quota */ }
  return <KubeezCutHomePage />;
}

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // Returning visitors skip the landing and go straight to their projects.
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem(RETURNING_USER_KEY) === '1') {
        throw redirect({ to: '/projects' });
      }
    } catch (e) {
      if (e && typeof e === 'object' && 'to' in e) throw e; // rethrow redirect
      /* ignore storage access errors */
    }
  },
  component: RootRoute,
});
