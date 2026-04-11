const SESSION_KEY = 'kubeezcut:reopen-kubeez-generate-project-id';

/** Call before navigating to Settings from the Kubeez generate flow so we can reopen the dialog when returning to the same project. */
export function markKubeezGenerateReopenAfterSettings(projectId: string): void {
  try {
    sessionStorage.setItem(SESSION_KEY, projectId);
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * If the user opened Settings from the generate dialog for this project, consume that intent once.
 * Returns whether the generate dialog should open.
 */
export function consumeKubeezGenerateReopenAfterSettings(projectId: string): boolean {
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    if (!v || v !== projectId) return false;
    sessionStorage.removeItem(SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}
