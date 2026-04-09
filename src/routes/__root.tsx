import { createRootRoute, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';

const DEFAULT_DOCUMENT_TITLE = 'KubeezCut — Free Open Source Browser Video Editor';

export const Route = createRootRoute({
  component: () => {
    useEffect(() => {
      document.title = DEFAULT_DOCUMENT_TITLE;
    }, []);

    return (
      <>
        <Outlet />
      </>
    );
  },
});
