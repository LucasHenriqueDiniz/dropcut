mod commands;
mod context_menu;
mod errors;
mod ffmpeg;
mod headless;
mod history;
mod log_util;
mod presets;
mod quality;
mod settings;
mod video_encode;
mod video_probe;

use tauri::webview::WebviewWindowBuilder;
use tauri::Manager;
use tauri::WebviewUrl;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(args: Vec<String>) {
    let background_launch = args.iter().any(|arg| arg == "--background-compress");
    let background_args = background_launch.then_some(args.clone());

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(background_launch)
        .manage(headless::BackgroundArgs(std::sync::Mutex::new(
            background_args.clone(),
        )))
        .manage(headless::BackgroundState::default())
        .setup(move |app| {
            if background_args.is_some() {
                let handle = app.app_handle().clone();

                std::thread::spawn(move || {
                    let progress_window = WebviewWindowBuilder::new(
                        &handle,
                        "progress",
                        WebviewUrl::App("index.html".into()),
                    )
                    .title("DropCut")
                    .inner_size(520.0, 320.0)
                    .resizable(false)
                    .decorations(false)
                    .skip_taskbar(true)
                    .always_on_top(true)
                    .visible(false)
                    .initialization_script("window.__DROPCUT_MODE__ = 'progress';")
                    .build();

                    if let Ok(window) = progress_window {
                        let _ = window.center();
                    }
                });
            } else if let Some(config) = app.config().app.windows.first() {
                WebviewWindowBuilder::from_config(app, config)?.build()?;

                let handle = app.app_handle().clone();
                std::thread::spawn(move || {
                    if matches!(context_menu::is_context_menu_installed(), Ok(false)) {
                        let presets = presets::load_presets(&handle);
                        let _ = context_menu::install_context_menu(&presets);
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::probe_video,
            commands::generate_video_thumbnails,
            commands::get_ffmpeg_status,
            commands::detect_available_encoders,
            commands::start_encode,
            commands::estimate_export,
            commands::load_presets,
            commands::save_presets,
            commands::get_settings,
            commands::save_settings,
            commands::install_context_menu,
            commands::uninstall_context_menu,
            commands::is_context_menu_installed,
            commands::is_background_launch,
            commands::start_background_compress,
            commands::cancel_background_compress,
            commands::load_history,
            commands::clear_history,
            commands::cleanup_user_data,
            commands::check_health,
            commands::open_export_folder,
            commands::open_external_link,
            commands::get_file_size
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
