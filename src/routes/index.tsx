import { createFileRoute } from '@tanstack/react-router';
import { KubeezCutHomePage } from '@/components/marketing/kubeezcut-home-page';

export const Route = createFileRoute('/')({
  component: KubeezCutHomePage,
});
