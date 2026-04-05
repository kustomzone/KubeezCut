/**
 * Resolve the horizontal timeline scroll element used for pixel→frame mapping.
 * `Element.closest` can miss when DOM wrappers/portals differ; fall back to the main instance.
 */
export function getTimelineScrollContainer(startNode: Element | null): HTMLElement | null {
  if (startNode) {
    const fromTree = startNode.closest('.timeline-container');
    if (fromTree) {
      return fromTree as HTMLElement;
    }
  }
  return document.querySelector<HTMLElement>('.timeline-container');
}
