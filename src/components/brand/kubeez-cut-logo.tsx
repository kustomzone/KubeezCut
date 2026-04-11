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
  /** Renders the mark at icon size plus a visible “KubeezCut” wordmark (for headers and nav). */
  withWordmark?: boolean;
  /** Extra classes for the wordmark text (e.g. `text-white` on dark headers). */
  wordmarkClassName?: string;
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

const wordmarkSizeClass = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
} as const;

export function KubeezCutLogo({
  variant = 'full',
  size = 'md',
  className,
  withWordmark = false,
  wordmarkClassName,
}: KubeezCutLogoProps) {
  const config = sizeConfig[size];
  const imgClass = withWordmark ? config.icon : variant === 'icon' ? config.icon : config.full;

  const img = (
    <img
      src={KUBEEZCUT_LOGO_URL}
      alt={withWordmark ? '' : 'KubeezCut'}
      decoding="async"
      loading="lazy"
      className={cn(
        'w-auto shrink-0 object-contain object-left',
        imgClass,
        !withWordmark && className,
      )}
    />
  );

  if (!withWordmark) {
    return img;
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {img}
      <span
        className={cn(
          wordmarkSizeClass[size],
          'font-semibold tracking-tight text-foreground',
          wordmarkClassName,
        )}
      >
        KubeezCut
      </span>
    </span>
  );
}
