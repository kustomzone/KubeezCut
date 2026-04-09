import type { KubeezPendingGeneration } from '@/features/media-library/types';
import { cn } from '@/shared/ui/cn';
import { FileAudio, Image as ImageIcon, Loader2, Video } from 'lucide-react';

function CategoryIcon({
  category,
  className,
}: {
  category: KubeezPendingGeneration['filterMimeCategory'];
  className?: string;
}) {
  switch (category) {
    case 'video':
      return <Video className={cn('text-violet-400', className)} aria-hidden />;
    case 'audio':
      return <FileAudio className={cn('text-amber-400', className)} aria-hidden />;
    default:
      return <ImageIcon className={cn('text-sky-400', className)} aria-hidden />;
  }
}

export function KubeezPendingGenerationCard({
  pending,
  viewMode = 'grid',
}: {
  pending: KubeezPendingGeneration;
  viewMode?: 'grid' | 'list';
}) {
  if (viewMode === 'list') {
    return (
      <div
        data-kubeez-pending-id={pending.id}
        className="panel-bg flex min-h-[3.25rem] items-stretch gap-3 overflow-hidden rounded-lg border border-dashed border-primary/35"
      >
        <div className="flex w-12 shrink-0 items-center justify-center border-r border-border/50 bg-muted/40">
          <div className="relative flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary/30" aria-hidden />
            <CategoryIcon category={pending.filterMimeCategory} className="absolute h-3.5 w-3.5" />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-2 pr-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Generating
          </p>
          <p className="truncate text-xs font-medium text-foreground">{pending.modelDisplayName}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-kubeez-pending-id={pending.id}
      className="panel-bg relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-primary/35 bg-muted/20"
    >
      <div className="relative flex items-center justify-center">
        <Loader2 className="h-14 w-14 animate-spin text-primary/25" aria-hidden />
        <CategoryIcon category={pending.filterMimeCategory} className="absolute h-6 w-6" />
      </div>
    </div>
  );
}
