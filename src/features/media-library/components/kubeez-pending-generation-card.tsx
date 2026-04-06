import { Button } from '@/components/ui/button';
import type { KubeezPendingGeneration } from '@/features/media-library/types';
import { useMediaLibraryStore } from '@/features/media-library/stores/media-library-store';
import { cn } from '@/shared/ui/cn';
import { AlertCircle, FileAudio, Image as ImageIcon, Loader2, Video, X } from 'lucide-react';

function CategoryIcon({
  category,
  className,
}: {
  category: KubeezPendingGeneration['filterMimeCategory'];
  className?: string;
}) {
  const cls = cn('shrink-0', className);
  switch (category) {
    case 'video':
      return <Video className={cn('text-violet-400', cls)} aria-hidden />;
    case 'audio':
      return <FileAudio className={cn('text-amber-400', cls)} aria-hidden />;
    default:
      return <ImageIcon className={cn('text-sky-400', cls)} aria-hidden />;
  }
}

export function KubeezPendingGenerationCard({
  pending,
  viewMode = 'grid',
}: {
  pending: KubeezPendingGeneration;
  viewMode?: 'grid' | 'list';
}) {
  const dismiss = () => {
    useMediaLibraryStore.getState().removeKubeezPendingGeneration(pending.id);
  };

  const isError = pending.status === 'error';

  if (viewMode === 'list') {
    return (
      <div
        data-kubeez-pending-id={pending.id}
        className={cn(
          'panel-bg flex min-h-[3.25rem] items-stretch gap-3 overflow-hidden rounded-lg border border-dashed',
          isError ? 'border-destructive/45' : 'border-primary/35'
        )}
      >
        <div
          className={cn(
            'flex w-12 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-border/50 bg-muted/40',
            isError ? 'text-destructive' : 'text-primary'
          )}
        >
          {pending.status === 'generating' ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
          )}
          <CategoryIcon category={pending.filterMimeCategory} className="h-3.5 w-3.5 opacity-80" />
        </div>
        <div className="min-w-0 flex flex-1 flex-col justify-center gap-0.5 py-2 pr-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {isError ? 'Failed' : 'Generating'}
          </p>
          <p className="truncate text-xs font-medium text-foreground">{pending.modelDisplayName}</p>
          <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">{pending.label}</p>
          {isError && pending.errorMessage && (
            <p className="line-clamp-2 text-[10px] leading-snug text-destructive">{pending.errorMessage}</p>
          )}
        </div>
        {isError && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 self-center text-muted-foreground hover:text-foreground"
            onClick={dismiss}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      data-kubeez-pending-id={pending.id}
      className={cn(
        'group relative flex aspect-square flex-col overflow-hidden rounded-lg border-2 border-dashed panel-bg',
        isError ? 'border-destructive/45' : 'border-primary/35'
      )}
    >
      {/* Fixed-height status strip — avoids overlap with details below */}
      <div
        className={cn(
          'flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-2 py-1.5',
          isError ? 'bg-destructive/10' : 'bg-muted/40'
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {pending.status === 'generating' ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />
          )}
          <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {isError ? 'Failed' : 'Generating'}
          </span>
        </div>
        <CategoryIcon category={pending.filterMimeCategory} className="h-4 w-4 opacity-90" />
      </div>

      {/* Model + prompt — scroll if extremely long; no competing “Generating” line here */}
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-1.5 overflow-hidden px-2.5 py-2">
        <p className="line-clamp-2 text-left text-[11px] font-semibold leading-snug text-foreground">
          {pending.modelDisplayName}
        </p>
        <p className="line-clamp-3 text-left text-[10px] leading-snug text-muted-foreground">{pending.label}</p>
        {isError && pending.errorMessage && (
          <p className="line-clamp-2 text-left text-[10px] leading-snug text-destructive">{pending.errorMessage}</p>
        )}
      </div>

      {isError && (
        <div className="flex shrink-0 justify-end border-t border-border/50 px-1 py-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
