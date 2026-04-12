import { useState, useEffect, useMemo, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Video, FileAudio, Image as ImageIcon, Search, Loader2, Film } from 'lucide-react';
import type { MediaMetadata } from '@/types/storage';
import { useMediaLibraryStore } from '../stores/media-library-store';
import { mediaLibraryService } from '../services/media-library-service';
import { getMediaType, formatDuration } from '../utils/validation';

interface MediaPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (mediaId: string) => void;
  filterType?: 'video' | 'audio' | 'image';
  /** Extra filter (e.g. Kubeez reference MIME allow-list). Applied after `filterType`. */
  filterItem?: (media: MediaMetadata) => boolean;
  title?: string;
  description?: ReactNode;
}

const typeIcons: Record<string, typeof Video> = {
  video: Video,
  audio: FileAudio,
  image: ImageIcon,
  unknown: Film,
};

function MediaPickerItem({
  media,
  onSelect,
}: {
  media: MediaMetadata;
  onSelect: () => void;
}) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const mediaType = getMediaType(media.mimeType);
  const IconComponent = typeIcons[mediaType] || Film;

  useEffect(() => {
    let mounted = true;
    mediaLibraryService.getThumbnailBlobUrl(media.id).then((url) => {
      if (mounted) setThumbnailUrl(url);
    });
    return () => { mounted = false; };
  }, [media.id]);

  return (
    <button
      onClick={onSelect}
      className="group flex flex-col overflow-hidden rounded-lg border border-border/50 bg-card/50 transition-all hover:border-primary/50 hover:bg-card hover:shadow-md"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-secondary/50">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={media.fileName}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <IconComponent className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}
        {/* Duration / dimensions badge */}
        <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white/90">
          {mediaType === 'audio' || mediaType === 'video'
            ? formatDuration(media.duration)
            : media.width && media.height
              ? `${media.width}\u00d7${media.height}`
              : mediaType}
        </div>
      </div>
      {/* Label */}
      <div className="px-2 py-1.5">
        <p className="truncate text-[11px] font-medium leading-tight text-foreground/80 group-hover:text-foreground">
          {media.fileName}
        </p>
      </div>
    </button>
  );
}

export function MediaPickerDialog({
  open,
  onClose,
  onSelect,
  filterType,
  filterItem,
  title = 'Select Media',
  description,
}: MediaPickerDialogProps) {
  const mediaItems = useMediaLibraryStore((s) => s.mediaItems);
  const isLoading = useMediaLibraryStore((s) => s.isLoading);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) setSearchQuery('');
  }, [open]);

  const filteredItems = useMemo(() => {
    let items = mediaItems;
    if (filterType) {
      const mimePrefix = `${filterType}/`;
      items = items.filter((m) => m.mimeType.startsWith(mimePrefix));
    }
    if (filterItem) {
      items = items.filter(filterItem);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter((m) => m.fileName.toLowerCase().includes(query));
    }
    return items;
  }, [mediaItems, filterType, filterItem, searchQuery]);

  const handleSelect = (mediaId: string) => {
    onSelect(mediaId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="flex h-[min(70vh,520px)] w-[min(92vw,540px)] max-w-[540px] flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 space-y-3 border-b border-border/60 px-4 pb-3 pt-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-sm font-semibold">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-[11px]">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
          {isLoading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
              <Film className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">
                {searchQuery
                  ? 'No media matches your search.'
                  : filterType
                    ? `No ${filterType} files in library.`
                    : 'No media in library.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filteredItems.map((media) => (
                <MediaPickerItem
                  key={media.id}
                  media={media}
                  onSelect={() => handleSelect(media.id)}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
