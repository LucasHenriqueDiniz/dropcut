use tauri::Emitter;

pub fn emit_log(app: &tauri::AppHandle, level: &str, message: &str) {
    let log_entry = serde_json::json!({
        "level": level,
        "message": message,
        "timestamp": chrono::Local::now().format("%H:%M:%S").to_string(),
    });
    let _ = app.emit("app-log", log_entry);
}
