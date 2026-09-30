export type FileKind = 'file' | 'directory';

export interface FileNode {
  name: string;
  path: string;
  relativePath: string;
  kind: FileKind;
  children?: FileNode[];
}

export interface FolderSettings {
  last_selected_folder_path: string | null;
  recent_folders: string[];
}

export type ViewerType = 'markdown' | 'bpmn' | 'drawio' | 'text' | 'unsupported';

/** Document pane layout: preview only / editor only / side-by-side live preview */
export type ViewMode = 'view' | 'edit' | 'split';

export interface OpenDocument {
  path: string;
  relativePath: string;
  name: string;
  content: string;
  viewerType: ViewerType;
}

export function isEditableViewerType(viewerType: ViewerType): boolean {
  return viewerType === 'markdown' || viewerType === 'text';
}
