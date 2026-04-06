import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/ui/cn';

interface EditorLoadingScreenProps {
  /** Shown under the spinner (e.g. project name when known). */
  subtitle?: string;
  className?: string;
}

/**
 * Loading UI for the editor route (pending navigation) and in-editor project open.
 */
export function EditorLoadingScreen({ subtitle, className }: EditorLoadingScreenProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center gap-4 px-6',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Loading project…</p>
        {subtitle ? (
          <p className="mt-1 max-w-md truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
