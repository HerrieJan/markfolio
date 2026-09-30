mod commands;

use tauri::{
    menu::{Menu, MenuItem, Submenu},
    Emitter,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Native menu matching original: ファイル > フォルダーを開く
            let open_folder =
                MenuItem::with_id(app, "open_folder", "フォルダーを開く", true, None::<&str>)?;
            let file_menu = Submenu::with_items(app, "ファイル", true, &[&open_folder])?;
            let menu = Menu::with_items(app, &[&file_menu])?;
            app.set_menu(menu)?;

            app.on_menu_event(|app, event| {
                if event.id() == "open_folder" {
                    let _ = app.emit("menu://open-folder", ());
                }
            });

            println!("Markfolio アプリケーションを起動しました");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::folder::select_folder,
            commands::folder::load_folder_settings,
            commands::folder::save_folder_settings,
            commands::folder::validate_folder_path,
            commands::folder::open_file_or_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
