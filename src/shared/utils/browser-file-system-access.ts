/**
 * Brave ships with the File System Access API disabled; users must enable it via flags.
 * Web pages cannot turn this on programmatically.
 *
 * @see https://github.com/brave/brave-browser/issues/18979
 */
export const BRAVE_FILE_SYSTEM_ACCESS_FLAG_URL = 'brave://flags/#file-system-access-api';

export function isBraveBrowser(): boolean {
  return typeof navigator !== 'undefined' && 'brave' in navigator;
}

export function hasShowOpenFilePicker(): boolean {
  return typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function';
}

export function hasShowDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

/**
 * When the needed picker is missing, returns guidance (Brave flag URL is only for Brave).
 */
export function getFilePickerUnavailableHelp(
  which: 'openFile' | 'directory'
): { message: string; flagUrl: string | null } | null {
  const ok = which === 'openFile' ? hasShowOpenFilePicker() : hasShowDirectoryPicker();
  if (ok) return null;

  if (isBraveBrowser()) {
    return {
      message:
        'Brave disables the File System Access API by default. Copy the URL below, paste it in the address bar, set the flag to Enabled, and relaunch Brave.',
      flagUrl: BRAVE_FILE_SYSTEM_ACCESS_FLAG_URL,
    };
  }

  return {
    message:
      which === 'openFile'
        ? 'File picker not supported in this browser. Use Chrome or Edge.'
        : 'Folder picker not supported in this browser. Use Chrome or Edge.',
    flagUrl: null,
  };
}
