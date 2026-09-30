import { isTauri, tauriBridge } from './tauriBridge';
import type { FolderSettings } from '../types';

const DEFAULT_WEB_ROOT = '/docs';

export type ResolveDocsRootResult = {
  root: string;
  warning: string | null;
};

class ConfigService {
  /** Resolve docs root: saved folder (Tauri) or bundled public/docs (web/dev). */
  async resolveDocsRoot(): Promise<ResolveDocsRootResult> {
    if (!isTauri()) return { root: DEFAULT_WEB_ROOT, warning: null };

    const bundled = await this.resolveBundledDocsRoot();

    try {
      const settings = await tauriBridge.loadFolderSettings();
      if (settings.last_selected_folder_path) {
        try {
          const saved = await tauriBridge.validateFolderPath(
            settings.last_selected_folder_path,
          );
          return { root: saved, warning: null };
        } catch {
          // fall through — saved path missing/unreadable
        }
      }
    } catch {
      // ignore store errors on first launch
    }

    if (bundled) {
      await this.persistRoot(bundled);
      return { root: bundled, warning: null };
    }

    const selected = await this.selectAndSaveFolder();
    if (selected) return { root: selected, warning: null };
    throw new Error('ドキュメントフォルダが見つかりません');
  }

  private async resolveBundledDocsRoot(): Promise<string | null> {
    const { resourceDir, join } = await import('@tauri-apps/api/path');
    const candidates: string[] = [];
    try {
      const base = await resourceDir();
      candidates.push(await join(base, 'docs'));
      candidates.push(await join(base, 'resources', 'docs'));
    } catch {
      // ignore
    }

    for (const candidate of candidates) {
      try {
        return await tauriBridge.validateFolderPath(candidate);
      } catch {
        // try next
      }
    }
    return null;
  }

  private async persistRoot(root: string): Promise<void> {
    const prev = await tauriBridge.loadFolderSettings().catch(
      (): FolderSettings => ({ last_selected_folder_path: null, recent_folders: [] }),
    );
    const recent = [root, ...prev.recent_folders.filter((p) => p !== root)].slice(0, 10);
    await tauriBridge
      .saveFolderSettings({
        last_selected_folder_path: root,
        recent_folders: recent,
      })
      .catch(() => undefined);
  }

  async selectAndSaveFolder(): Promise<string | null> {
    if (!isTauri()) {
      console.warn('フォルダー選択はデスクトップ版でのみ利用できます');
      return null;
    }

    const selected = await tauriBridge.selectFolder();
    if (!selected) return null;

    return this.setDocsRoot(selected);
  }

  /** Validate and remember a docs root (folder picker / drag-drop). */
  async setDocsRoot(path: string): Promise<string> {
    const validated = await tauriBridge.validateFolderPath(path);
    await this.persistRoot(validated);
    return validated;
  }
}

export const configService = new ConfigService();
