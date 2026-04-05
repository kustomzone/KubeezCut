import { GripVertical } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/shared/ui/cn"

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = ResizablePrimitive.Panel

const resizableHandleDefaultClassName =
  "relative flex w-px shrink-0 items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90"

/**
 * Invisible resize hit target (OpenCut-style): no line or grip — only the gap + cursor.
 * Wider `::after` keeps dragging easy without visible chrome.
 */
const resizableHandleGhostClassName =
  "relative flex w-px shrink-0 items-center justify-center bg-transparent outline-none cursor-col-resize data-[panel-group-direction=vertical]:cursor-row-resize focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 after:absolute after:z-10 after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:top-1/2 data-[panel-group-direction=vertical]:after:h-3 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0"

const ResizableHandle = ({
  withHandle,
  variant = "default",
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean
  /** `ghost` — no visible divider or grip; cursor shows resize in the gap (editor shell). */
  variant?: "default" | "ghost"
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      variant === "ghost" ? resizableHandleGhostClassName : resizableHandleDefaultClassName,
      className
    )}
    {...props}
  >
    {withHandle && variant === "default" && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }

