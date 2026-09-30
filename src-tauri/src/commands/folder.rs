use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FolderSettings {
    pub last_selected_folder_path: Option<String>,
    pub recent_folders: Vec<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum FolderError {
    #[error("フォルダパスの変換に失敗しました")]
    PathConversion,
    #[error("指定されたパスはフォルダではありません: {0}")]
    NotAFolder(String),
    #[error("フォルダが見つかりません: {0}")]
    NotFound(String),
    #[error("フォルダへのアクセス権限がありません: {0}")]
    PermissionDenied(String),
    #[error("フォルダの読み込みに失敗 path={path} kind={kind} message={message}")]
    ReadFailed {
        path: String,
        kind: String,
        message: String,
    },
    #[error("設定ストアへのアクセスに失敗しました: {0}")]
    StoreAccess(String),
    #[error("設定のシリアライズに失敗しました: {0}")]
    Serialize(String),
    #[error("設定の保存に失敗しました: {0}")]
    SaveFailed(String),
    #[error("ファイル/フォルダを開けませんでした: {0}")]
    OpenFailed(String),
}

impl Serialize for FolderError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, FolderError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| FolderError::StoreAccess(e.to_string()))?;
    fs::create_dir_all(&dir).map_err(|e| FolderError::StoreAccess(e.to_string()))?;
    Ok(dir.join("folder_settings.json"))
}

#[tauri::command]
pub fn load_folder_settings(app: AppHandle) -> Result<FolderSettings, FolderError> {
    let path = settings_path(&app)?;
    if !path.exists() {
        return Ok(FolderSettings::default());
    }
    let raw = fs::read_to_string(&path).map_err(|e| FolderError::StoreAccess(e.to_string()))?;
    serde_json::from_str(&raw).map_err(|e| FolderError::Serialize(e.to_string()))
}

#[tauri::command]
pub fn save_folder_settings(app: AppHandle, settings: FolderSettings) -> Result<(), FolderError> {
    let path = settings_path(&app)?;
    let raw =
        serde_json::to_string_pretty(&settings).map_err(|e| FolderError::Serialize(e.to_string()))?;
    fs::write(&path, raw).map_err(|e| FolderError::SaveFailed(e.to_string()))
}

#[tauri::command]
pub fn validate_folder_path(path: String) -> Result<String, FolderError> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(FolderError::NotFound(path));
    }
    if !p.is_dir() {
        return Err(FolderError::NotAFolder(path));
    }
    // Probe readability
    fs::read_dir(&p).map_err(|e| match e.kind() {
        std::io::ErrorKind::PermissionDenied => FolderError::PermissionDenied(path.clone()),
        other => FolderError::ReadFailed {
            path: path.clone(),
            kind: format!("{other:?}"),
            message: e.to_string(),
        },
    })?;

    p.canonicalize()
        .map(|c| c.to_string_lossy().trim_start_matches(r"\\?\").to_string())
        .map_err(|_| FolderError::PathConversion)
}

#[tauri::command]
pub async fn select_folder(app: AppHandle) -> Result<Option<String>, FolderError> {
    // Why: blocking dialog on the async runtime can freeze the UI; run it on a worker thread.
    let folder = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title("フォルダーを選択")
            .blocking_pick_folder()
    })
    .await
    .map_err(|e| FolderError::OpenFailed(e.to_string()))?;

    Ok(folder
        .and_then(|f| f.into_path().ok())
        .map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub fn open_file_or_folder(path: String) -> Result<serde_json::Value, FolderError> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(FolderError::OpenFailed(format!(
            "ファイルまたはフォルダが見つかりません: {path}"
        )));
    }
    let kind = if p.is_dir() { "directory" } else { "file" };
    let normalized = p
        .canonicalize()
        .map(|c| c.to_string_lossy().trim_start_matches(r"\\?\").to_string())
        .unwrap_or(path);
    Ok(serde_json::json!({ "kind": kind, "path": normalized }))
}
