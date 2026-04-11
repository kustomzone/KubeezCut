import { createRootRoute, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { KubeezWelcomePromo } from '@/components/marketing/kubeez-welcome-promo';
import { MobileNotAvailableScreen } from '@/components/shell/mobile-not-available-screen';
import { useMediaMinDesktop } from '@/hooks/use-media-min-width';

const DEFAULT_DOCUMENT_TITLE = 'KubeezCut — Free Open Source Browser Video Editor';

function RootLayout() {
  const desktop = useMediaMinDesktop();

  useEffect(() => {
    document.title = DEFAULT_DOCUMENT_TITLE;
  }, []);

  if (!desktop) {
    return <MobileNotAvailableScreen />;
  }

  return (
    <>
      <KubeezWelcomePromo />
      <Outlet />
    </>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
