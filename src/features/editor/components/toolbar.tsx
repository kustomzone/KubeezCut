import { memo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Bug,
  ChevronDown,
  Download,
  FolderArchive,
  Keyboard,
  Save,
  Settings,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { LocalInferenceStatusPill } from './local-inference-status-pill';
import { ProjectDebugPanel } from './project-debug-panel';
import { SettingsDialog } from './settings-dialog';
import { ShortcutsDialog } from './shortcuts-dialog';
import { UnsavedChangesDialog } from './unsaved-changes-dialog';
import { EDITOR_LAYOUT_CSS_VALUES } from '@/shared/ui/editor-layout';
import { cn } from '@/shared/ui/cn';
import { useDebugStore } from '@/features/editor/stores/debug-store';

interface ToolbarProps {
  projectId: string;
  project: {
    id: string;
    name: string;
    width: number;
    height: number;
    fps: number;
  };
  isDirty?: boolean;
  onSave?: () => Promise<void>;
  onExport?: () => void;
  onExportBundle?: () => void;
}

export const Toolbar = memo(function Toolbar({
  projectId,
  project,
  isDirty = false,
  onSave,
  onExport,
  onExportBundle,
}: ToolbarProps) {
  const navigate = useNavigate();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  const handleBackClick = () => {
    if (isDirty) {
      setShowUnsavedDialog(true);
    } else {
      navigate({ to: '/projects' });
    }
  };

  const handleSave = async () => {
    if (onSave) {
      await onSave();
    }
  };

  return (
    <div
      className="panel-header flex flex-shrink-0 items-center gap-2.5 px-3"
      style={{ height: EDITOR_LAYOUT_CSS_VALUES.toolbarHeight }}
      role="toolbar"
      aria-label="Editor toolbar"
    >
      <div className="flex items-center gap-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleBackClick}
          data-tooltip="Back to Projects"
          data-tooltip-side="right"
          aria-label="Back to projects"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <UnsavedChangesDialog
          open={showUnsavedDialog}
          onOpenChange={setShowUnsavedDialog}
          onSave={handleSave}
          projectName={project?.name}
        />

        <Separator orientation="vertical" className="h-5" />

        <div className="flex flex-col -space-y-0.5">
          <h1 className="text-sm font-medium leading-none">
            {project?.name || 'Untitled Project'}
          </h1>
          <span className="font-mono text-[11px] text-muted-foreground">
            {project?.width}x{project?.height} | {project?.fps}fps
          </span>
        </div>
      </div>

      <div className="flex-1" />

      <LocalInferenceStatusPill />

      <ShortcutsDialog
        open={showShortcutsDialog}
        onOpenChange={setShowShortcutsDialog}
      />

      <SettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
      />

      <div className="flex items-center gap-1.5">
        {import.meta.env.DEV && import.meta.env.VITE_SHOW_DEBUG_PANEL !== 'false' && (
          <DebugPopover projectId={projectId} />
        )}
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <a
            href="https://discord.gg/kdc8s3nYPR"
            target="_blank"
            rel="noopener noreferrer"
            data-tooltip="Discord"
            data-tooltip-side="bottom"
            aria-label="Kubeez Discord"
          >
            <DiscordIcon className="h-4 w-4" />
          </a>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => setShowSettingsDialog(true)}
          data-tooltip="Settings"
          data-tooltip-side="bottom"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => setShowShortcutsDialog(true)}
          data-tooltip="Keyboard Shortcuts"
          data-tooltip-side="bottom"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleSave}
          aria-label="Save project"
        >
          <div className="relative">
            <Save className="h-4 w-4" />
            {isDirty && (
              <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-primary" />
            )}
          </div>
          Save
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1.5 glow-primary-sm">
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExport} className="gap-2">
              <Video className="h-4 w-4" />
              Export Video
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportBundle} className="gap-2">
              <FolderArchive className="h-4 w-4" />
              Download Project (.zip)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function DebugPopover({ projectId }: { projectId: string }) {
  const debugPanelOpen = useDebugStore((s) => s.debugPanelOpen);
  const setDebugPanelOpen = useDebugStore((s) => s.setDebugPanelOpen);

  return (
    <Popover open={debugPanelOpen} onOpenChange={setDebugPanelOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn('h-7 w-7', debugPanelOpen && 'bg-amber-500/20 border-amber-500/50 text-amber-400')}
          data-tooltip={debugPanelOpen ? undefined : 'Debug Panel'}
          data-tooltip-side="bottom"
          aria-label="Debug panel"
        >
          <Bug className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-64 p-0 bg-zinc-900 border-zinc-700 text-zinc-100"
      >
        <ProjectDebugPanel projectId={projectId} />
      </PopoverContent>
    </Popover>
  );
}
