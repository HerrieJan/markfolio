import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { FileNode, OpenDocument, ViewMode } from '../types';
import { isEditableViewerType } from '../types';
import { configService } from '../services/configService';
import { filteredFileSystemService } from '../services/filteredFileSystemService';
import { detectViewerType, isSupportedFile } from '../services/fileSorting';
import { tauriBridge } from '../services/tauriBridge';

interface AppState {
  docsRoot: string | null;
  tree: FileNode[];
  expanded: Record<string, boolean>;
  selectedPath: string | null;
  document: OpenDocument | null;
  /** Working buffer while editing (may differ from document.content) */
  draftContent: string;
  viewMode: ViewMode;
  isDirty: boolean;
  saving: boolean;
  searchQuery: string;
  /** Paths whose file content matched the current search (in addition to name matches). */
  contentMatchPaths: string[];
  sidebarOpen: boolean;
  /** Initial bootstrap / folder switch — may blank the main pane */
  loading: boolean;
  /** Soft reload of the tree — keep current document visible */
  treeLoading: boolean;
  error: string | null;
  warning: string | null;
}

const initialState: AppState = {
  docsRoot: null,
  tree: [],
  expanded: {},
  selectedPath: null,
  document: null,
  draftContent: '',
  viewMode: 'view',
  isDirty: false,
  saving: false,
  searchQuery: '',
  contentMatchPaths: [],
  sidebarOpen: true,
  loading: false,
  treeLoading: false,
  error: null,
  warning: null,
};

function bindDocument(state: AppState, doc: OpenDocument | null) {
  state.document = doc;
  state.selectedPath = doc?.path ?? null;
  state.draftContent = doc?.content ?? '';
  state.isDirty = false;
  // Why: opening a file should start in read mode; edit/split is opt-in via the toolbar
  state.viewMode = 'view';
}

function flattenFiles(nodes: FileNode[]): FileNode[] {
  const flat: FileNode[] = [];
  const walk = (list: FileNode[]) => {
    for (const n of list) {
      if (n.kind === 'file') flat.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return flat;
}

/** Prefer root-level docs, then shallower paths (avoid nested README.md winning). */
function pickInitialDocument(files: FileNode[]): FileNode | null {
  const preferNames = ['getting-started.md', 'readme.md'];
  for (const name of preferNames) {
    const candidates = files.filter((f) => f.name.toLowerCase() === name);
    if (candidates.length === 0) continue;
    candidates.sort(
      (a, b) =>
        a.relativePath.split('/').length - b.relativePath.split('/').length ||
        a.relativePath.localeCompare(b.relativePath, 'ja'),
    );
    return candidates[0];
  }
  return null;
}

async function toOpenDocument(node: FileNode): Promise<OpenDocument> {
  const content = await filteredFileSystemService.readFile(node.path);
  return {
    path: node.path,
    relativePath: node.relativePath,
    name: node.name,
    content,
    viewerType: detectViewerType(node.name),
  };
}

export const bootstrapApp = createAsyncThunk('app/bootstrap', async () => {
  const { root, warning } = await configService.resolveDocsRoot();
  const { tree, warning: treeWarning } = await filteredFileSystemService.loadTree(root);
  const files = flattenFiles(tree);
  const hit = pickInitialDocument(files);
  const initialDoc = hit ? await toOpenDocument(hit) : null;
  return {
    root,
    tree,
    initialDoc,
    warning: [warning, treeWarning].filter(Boolean).join(' ') || null,
  };
});

export const reloadTree = createAsyncThunk('app/reloadTree', async (_, { getState }) => {
  const state = getState() as { app: AppState };
  const root = state.app.docsRoot;
  if (!root) throw new Error('ドキュメントルートが設定されていません');
  const { tree, warning } = await filteredFileSystemService.loadTree(root);
  return { tree, warning };
});

export const openFolder = createAsyncThunk('app/openFolder', async () => {
  const root = await configService.selectAndSaveFolder();
  if (!root) return null;
  const { tree, warning } = await filteredFileSystemService.loadTree(root);
  return { root, tree, warning };
});

export const openDocument = createAsyncThunk('app/openDocument', async (node: FileNode) => {
  if (node.kind !== 'file') return null;
  return toOpenDocument(node);
});

export const saveDocument = createAsyncThunk(
  'app/saveDocument',
  async (_, { getState }) => {
    const state = getState() as { app: AppState };
    const doc = state.app.document;
    if (!doc) throw new Error('保存するドキュメントがありません');
    if (!isEditableViewerType(doc.viewerType)) {
      throw new Error('このファイル形式は編集・保存に対応していません');
    }
    const content = state.app.draftContent;
    await filteredFileSystemService.writeFile(doc.path, content);
    return { path: doc.path, content };
  },
);

function basename(path: string): string {
  const parts = path.replace(/[\\/]+$/, '').split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

function relativeToRoot(root: string, absolute: string): string {
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '');
  const r = norm(root);
  const a = norm(absolute);
  if (a.toLowerCase().startsWith(`${r.toLowerCase()}/`)) {
    return a.slice(r.length + 1);
  }
  return basename(absolute);
}

export const openDroppedPaths = createAsyncThunk(
  'app/openDroppedPaths',
  async (paths: string[]) => {
    if (!paths.length) return null;

    const inspected = await Promise.all(
      paths.map(async (path) => {
        const info = await tauriBridge.openFileOrFolder(path);
        return { path: info.path, kind: info.kind as 'file' | 'directory' };
      }),
    );

    const folder = inspected.find((p) => p.kind === 'directory');
    if (folder) {
      const root = await configService.setDocsRoot(folder.path);
      const { tree, warning } = await filteredFileSystemService.loadTree(root);
      return { root, tree, document: null as OpenDocument | null, warning };
    }

    const file = inspected.find(
      (p) => p.kind === 'file' && isSupportedFile(basename(p.path)),
    );
    if (!file) {
      throw new Error(
        '対応形式のファイル（.md / .bpmn / .drawio / .txt）またはフォルダをドロップしてください',
      );
    }

    const { dirname } = await import('@tauri-apps/api/path');
    const parent = await dirname(file.path);
    const root = await configService.setDocsRoot(parent);
    const { tree, warning } = await filteredFileSystemService.loadTree(root);
    const name = basename(file.path);
    const content = await filteredFileSystemService.readFile(file.path);
    const document: OpenDocument = {
      path: file.path,
      relativePath: relativeToRoot(root, file.path),
      name,
      content,
      viewerType: detectViewerType(name),
    };
    return { root, tree, document, warning };
  },
);

/** Search file contents (text-based formats) and return matching absolute paths. */
export const searchDocumentContents = createAsyncThunk(
  'app/searchDocumentContents',
  async (query: string, { getState }) => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [] as string[];

    const state = getState() as { app: AppState };
    const files = flattenFiles(state.app.tree).filter((f) =>
      /\.(md|markdown|txt|bpmn|drawio|dio)$/i.test(f.name),
    );

    // Cap work for large trees
    const limited = files.slice(0, 200);
    const matches: string[] = [];

    await Promise.all(
      limited.map(async (file) => {
        try {
          const content = await filteredFileSystemService.readFile(file.path);
          if (content.toLowerCase().includes(q)) {
            matches.push(file.path);
          }
        } catch {
          // skip unreadable files
        }
      }),
    );

    return matches;
  },
);

function applyTreeRoot(
  state: AppState,
  payload: { root: string; tree: FileNode[]; warning?: string | null },
) {
  state.docsRoot = payload.root;
  state.tree = payload.tree;
  state.warning = payload.warning ?? null;
  state.expanded = {};
  state.contentMatchPaths = [];
  for (const node of payload.tree) {
    if (node.kind === 'directory') state.expanded[node.path] = true;
  }
}

function clearDocument(state: AppState) {
  bindDocument(state, null);
  state.viewMode = 'view';
}

function expandAncestorsForDoc(state: AppState, tree: FileNode[], targetRel: string) {
  const walk = (nodes: FileNode[]) => {
    for (const n of nodes) {
      if (
        n.kind === 'directory' &&
        (targetRel === n.relativePath || targetRel.startsWith(`${n.relativePath}/`))
      ) {
        state.expanded[n.path] = true;
        if (n.children) walk(n.children);
      }
    }
  };
  walk(tree);
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
      if (!action.payload.trim()) state.contentMatchPaths = [];
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    toggleExpanded(state, action: PayloadAction<string>) {
      const key = action.payload;
      state.expanded[key] = !state.expanded[key];
    },
    setExpanded(state, action: PayloadAction<{ path: string; open: boolean }>) {
      state.expanded[action.payload.path] = action.payload.open;
    },
    clearError(state) {
      state.error = null;
    },
    clearWarning(state) {
      state.warning = null;
    },
    setViewMode(state, action: PayloadAction<ViewMode>) {
      if (state.document && !isEditableViewerType(state.document.viewerType)) {
        state.viewMode = 'view';
        return;
      }
      state.viewMode = action.payload;
    },
    setDraftContent(state, action: PayloadAction<string>) {
      state.draftContent = action.payload;
      state.isDirty = action.payload !== (state.document?.content ?? '');
    },
    discardDraft(state) {
      state.draftContent = state.document?.content ?? '';
      state.isDirty = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapApp.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.warning = null;
      })
      .addCase(bootstrapApp.fulfilled, (state, action) => {
        state.loading = false;
        applyTreeRoot(state, action.payload);
        bindDocument(state, action.payload.initialDoc);
      })
      .addCase(bootstrapApp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? '初期化に失敗しました';
      })
      .addCase(reloadTree.pending, (state) => {
        state.treeLoading = true;
      })
      .addCase(reloadTree.fulfilled, (state, action) => {
        state.treeLoading = false;
        state.tree = action.payload.tree;
        state.warning = action.payload.warning;
      })
      .addCase(reloadTree.rejected, (state, action) => {
        state.treeLoading = false;
        state.error = action.error.message ?? '再読み込みに失敗しました';
      })
      .addCase(openFolder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(openFolder.fulfilled, (state, action) => {
        state.loading = false;
        if (!action.payload) return;
        applyTreeRoot(state, action.payload);
        clearDocument(state);
      })
      .addCase(openFolder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'フォルダを開けませんでした';
      })
      .addCase(openDocument.fulfilled, (state, action) => {
        if (!action.payload) return;
        bindDocument(state, action.payload);
      })
      .addCase(openDocument.rejected, (state, action) => {
        state.error = action.error.message ?? 'ファイルを開けませんでした';
      })
      .addCase(openDroppedPaths.pending, (state) => {
        state.treeLoading = true;
        state.error = null;
      })
      .addCase(openDroppedPaths.fulfilled, (state, action) => {
        state.treeLoading = false;
        if (!action.payload) return;
        applyTreeRoot(state, action.payload);
        if (action.payload.document) {
          bindDocument(state, action.payload.document);
          expandAncestorsForDoc(state, action.payload.tree, action.payload.document.relativePath);
        } else {
          clearDocument(state);
        }
      })
      .addCase(openDroppedPaths.rejected, (state, action) => {
        state.treeLoading = false;
        state.error = action.error.message ?? 'ドロップした項目を開けませんでした';
      })
      .addCase(searchDocumentContents.fulfilled, (state, action) => {
        state.contentMatchPaths = action.payload;
      })
      .addCase(saveDocument.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveDocument.fulfilled, (state, action) => {
        state.saving = false;
        if (state.document && state.document.path === action.payload.path) {
          state.document.content = action.payload.content;
          state.draftContent = action.payload.content;
          state.isDirty = false;
        }
      })
      .addCase(saveDocument.rejected, (state, action) => {
        state.saving = false;
        state.error = action.error.message ?? '保存に失敗しました';
      });
  },
});

export const {
  setSearchQuery,
  toggleSidebar,
  toggleExpanded,
  setExpanded,
  clearError,
  clearWarning,
  setViewMode,
  setDraftContent,
  discardDraft,
} = appSlice.actions;
export default appSlice.reducer;
