import { cn } from '@/shared/ui/cn';

/**
 * Same-origin paths so logos load under COEP `require-corp` (see vite.config / vercel.json).
 * - KubeezCut: app chrome, favicon, in-app KubeezCut branding.
 * - Kubeez: use `KUBEEZ_BRAND_LOGO_URL` only for the control that opens Kubeez media generation.
 */
export const KUBEEZCUT_LOGO_URL = '/brand/kubeezcut-logo.png';

/** Kubeez product mark — reserved for the media-library control that opens generate-with-Kubeez. */
export const KUBEEZ_BRAND_LOGO_URL = '/brand/kubeez-logo.png';

interface KubeezCutLogoProps {
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeConfig = {
  sm: {
    full: 'h-7 max-w-[200px]',
    icon: 'h-5 max-w-20',
  },
  md: {
    full: 'h-9 max-w-[240px]',
    icon: 'h-7 max-w-28',
  },
  lg: {
    full: 'h-12 max-w-[min(100%,320px)]',
    icon: 'h-10 max-w-36',
  },
};

export function KubeezCutLogo({ variant = 'full', size = 'md', className }: KubeezCutLogoProps) {
  const config = sizeConfig[size];
  const imgClass = variant === 'icon' ? config.icon : config.full;

  return (
    <img
      src={KUBEEZCUT_LOGO_URL}
      alt="KubeezCut"
      decoding="async"
      loading="lazy"
      className={cn('w-auto object-contain object-left', imgClass, className)}
    />
  );
}
