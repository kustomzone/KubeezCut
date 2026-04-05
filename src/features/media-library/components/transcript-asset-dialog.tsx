import { useEffect, useState } from 'react';
import { Copy, Download, FileText, Loader2 } from 'lucide-react';
import type { MediaTranscript } from '@/types/storage';
import { mediaLibraryService } from '../services/media-library-service';
import {
  parseMediaTranscriptBlob,
  segmentsToSrt,
  triggerDownloadBlob,
} from '../utils/transcript-export';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMediaLibraryStore } from '../stores/media-library-store';

interface TranscriptAssetDialogProps {
  mediaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TranscriptAssetDialog({ mediaId, open, onOpenChange }: TranscriptAssetDialogProps) {
  const media = useMediaLibraryStore((s) => (mediaId ? s.mediaById[mediaId] : undefined));
  const showNotification = useMediaLibraryStore((s) => s.showNotification);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<MediaTranscript | null>(null);
  const [rawBlob, setRawBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (!open || !mediaId) {
      setTranscript(null);
      setRawBlob(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const blob = await mediaLibraryService.getMediaFile(mediaId);
        if (cancelled) return;
        if (!blob) {
          setError('Could not read transcript file from storage.');
          setTranscript(null);
          setRawBlob(null);
          return;
        }
        setRawBlob(blob);
        const parsed = await parseMediaTranscriptBlob(blob);
        if (cancelled) return;
        if (!parsed) {
          setError('This file is not valid transcript JSON.');
          setTranscript(null);
          return;
        }
        setTranscript(parsed);
        setError(null);
      } catch {
        if (!cancelled) {
          setError('Failed to load transcript.');
          setTranscript(null);
          setRawBlob(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, mediaId]);

  const fileBase = media?.fileName.replace(/\.json$/i, '') ?? 'transcript';

  const handleDownloadJson = () => {
    if (!rawBlob || !media) return;
    triggerDownloadBlob(rawBlob, media.fileName);
  };

  const handleDownloadSrt = () => {
    if (!transcript) return;
    const srt = segmentsToSrt(transcript.segments);
    triggerDownloadBlob(new Blob([srt], { type: 'text/plain;charset=utf-8' }), `${fileBase}.srt`);
  };

  const handleCopyText = async () => {
    if (!transcript?.text) return;
    try {
      await navigator.clipboard.writeText(transcript.text);
      showNotification({ type: 'success', message: 'Full transcript copied to clipboard.' });
    } catch {
      showNotification({ type: 'error', message: 'Could not copy to clipboard.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-amber-500" />
            Transcript export
          </DialogTitle>
          <DialogDescription className="text-left text-xs space-y-2">
            <span className="block">
              The JSON file stores timed segments for this app (captions). You can also download{' '}
              <strong className="text-foreground">SRT</strong> for other editors or players, or copy the
              plain text.
            </span>
            {media && (
              <span className="block text-muted-foreground truncate" title={media.fileName}>
                {media.fileName}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        )}

        {!loading && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {!loading && transcript && (
          <>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={handleDownloadJson}>
                <Download className="w-3.5 h-3.5" />
                JSON
              </Button>
              <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={handleDownloadSrt}>
                <Download className="w-3.5 h-3.5" />
                SRT
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void handleCopyText()}>
                <Copy className="w-3.5 h-3.5" />
                Copy text
              </Button>
            </div>
            <div className="rounded-md border border-border bg-muted/30 min-h-[120px] max-h-[40vh] overflow-y-auto p-3 text-xs font-mono whitespace-pre-wrap text-foreground/90">
              {transcript.text || '(empty)'}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Model: {transcript.model}
              {transcript.language ? ` · ${transcript.language}` : ''} · {transcript.segments.length} segments
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
