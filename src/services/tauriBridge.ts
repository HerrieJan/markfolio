import type { FolderSettings } from '../types';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

export const tauriBridge = {
  async selectFolder(): Promise<string | null> {
    return invoke<string | null>('select_folder');
  },

  async validateFolderPath(path: string): Promise<string> {
    return invoke<string>('validate_folder_path', { path });
  },

  async loadFolderSettings(): Promise<FolderSettings> {
    return invoke<FolderSettings>('load_folder_settings');
  },

  async saveFolderSettings(settings: FolderSettings): Promise<void> {
    return invoke('save_folder_settings', { settings });
  },

  async openFileOrFolder(path: string): Promise<{ kind: string; path: string }> {
    return invoke('open_file_or_folder', { path });
  },

  async readDir(path: string): Promise<Array<{ name: string; path: string; isDirectory: boolean }>> {
    const { readDir } = await import('@tauri-apps/plugin-fs');
    const { join } = await import('@tauri-apps/api/path');
    const entries = await readDir(path);
    const result = [];
    for (const e of entries) {
      const name = e.name ?? '';
      result.push({
        name,
        path: await join(path, name),
        isDirectory: !!e.isDirectory,
      });
    }
    return result;
  },

  async readTextFile(path: string): Promise<string> {
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    return readTextFile(path);
  },

  async writeTextFile(path: string, contents: string): Promise<void> {
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    await writeTextFile(path, contents);
  },
};
