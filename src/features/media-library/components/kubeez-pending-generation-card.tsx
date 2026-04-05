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
  const cls = cn('shrink-0 opacity-90', className);
  switch (category) {
    case 'video':
      return <Video className={cn('text-primary', cls)} aria-hidden />;
    case 'audio':
      return <FileAudio className={cn('text-green-500', cls)} aria-hidden />;
    default:
      return <ImageIcon className={cn('text-blue-500', cls)} aria-hidden />;
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
          'panel-bg flex items-center gap-3 overflow-hidden rounded border border-dashed p-2',
          isError ? 'border-destructive/50' : 'border-primary/40'
        )}
      >
        <div className="flex h-12 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded bg-secondary">
          {pending.status === 'generating' ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
          )}
          <CategoryIcon category={pending.filterMimeCategory} className="h-3 w-3" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">
            {isError ? 'Generation failed' : 'Generating with Kubeez…'}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">{pending.modelDisplayName}</p>
          <p className="truncate text-[10px] text-muted-foreground/90">{pending.label}</p>
          {isError && pending.errorMessage && (
            <p className="mt-0.5 line-clamp-2 text-[10px] text-destructive">{pending.errorMessage}</p>
          )}
        </div>
        {isError && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
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
        isError ? 'border-destructive/50' : 'border-primary/40'
      )}
    >
      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-secondary via-muted to-secondary" />
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-2 bg-gradient-to-br from-secondary to-panel-bg px-2">
        {pending.status === 'generating' ? (
          <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
        ) : (
          <AlertCircle className="h-10 w-10 text-destructive" aria-hidden />
        )}
        <CategoryIcon category={pending.filterMimeCategory} className="h-8 w-8" />
        <p className="text-center text-[10px] font-medium text-foreground px-1">
          {isError ? 'Generation failed' : 'Generating…'}
        </p>
      </div>
      <div className="flex-shrink-0 border-t border-border/60 bg-panel-bg/80 px-1.5 py-1">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-medium text-foreground">{pending.modelDisplayName}</p>
            <p className="line-clamp-2 text-[9px] text-muted-foreground">{pending.label}</p>
            {isError && pending.errorMessage && (
              <p className="mt-0.5 line-clamp-2 text-[9px] text-destructive">{pending.errorMessage}</p>
            )}
          </div>
          {isError && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                dismiss();
              }}
              aria-label="Dismiss"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
