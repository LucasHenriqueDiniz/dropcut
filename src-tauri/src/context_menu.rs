use crate::presets::ClipPreset;

const VIDEO_ASSOCIATION_BASES: [&str; 7] = [
    "Software\\Classes\\SystemFileAssociations\\video\\shell",
    "Software\\Classes\\SystemFileAssociations\\.mp4\\shell",
    "Software\\Classes\\SystemFileAssociations\\.mkv\\shell",
    "Software\\Classes\\SystemFileAssociations\\.mov\\shell",
    "Software\\Classes\\SystemFileAssociations\\.webm\\shell",
    "Software\\Classes\\SystemFileAssociations\\.avi\\shell",
    "Software\\Classes\\SystemFileAssociations\\.wmv\\shell",
];

// "ClipShrink" was this product's old name before it was rebranded to DropCut.
// These entries stay here so uninstall/reinstall also cleans up registry keys
// left behind by installs that predate the rename.
const KNOWN_CONTEXT_KEYS: [&str; 11] = [
    "DropCut.Compress.discord_free",
    "DropCut.Compress.discord_nitro",
    "DropCut.Compress8",
    "DropCut.Compress25",
    "DropCut.OpenEditor",
    "ClipShrink.Compress8",
    "ClipShrink.Compress25",
    "ClipShrink.OpenEditor",
    "DropCut.Compress.discord_free_",
    "DropCut.Compress.discord_nitro_",
    "DropCut.Compress",
];

#[cfg(target_os = "windows")]
pub fn install_context_menu(presets: &[ClipPreset]) -> Result<bool, String> {
    use windows_registry::*;

    let hkcu = CURRENT_USER;
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;

    uninstall_context_menu()?;

    for base in VIDEO_ASSOCIATION_BASES {
        for preset in presets.iter().filter(|preset| preset.visible) {
            let key = format!("DropCut.Compress.{}", sanitize_key(&preset.id));
            let full = format!("{}\\{}", base, key);
            let shell = hkcu.create(&full).map_err(|e| e.to_string())?;
            shell
                .set_string("", format!("Compress with DropCut ({})", preset.label))
                .map_err(|e| e.to_string())?;
            shell
                .set_string("Icon", exe.display().to_string())
                .map_err(|e| e.to_string())?;

            let cmd = hkcu
                .create(format!("{}\\command", full))
                .map_err(|e| e.to_string())?;
            cmd.set_string(
                "",
                format!(
                    "\"{}\" --background-compress --preset-id \"{}\" --input \"%1\"",
                    exe.display(),
                    preset.id.replace('"', "")
                ),
            )
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(true)
}

#[cfg(target_os = "windows")]
fn sanitize_key(value: &str) -> String {
    value
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
        .collect()
}

#[cfg(target_os = "windows")]
pub fn uninstall_context_menu() -> Result<bool, String> {
    use windows_registry::*;
    let hkcu = CURRENT_USER;
    for base in VIDEO_ASSOCIATION_BASES {
        for key in KNOWN_CONTEXT_KEYS {
            let _ = hkcu.remove_tree(format!("{}\\{}", base, key));
        }
        if let Ok(shell) = hkcu.open(base) {
            for key in shell.keys().map_err(|e| e.to_string())? {
                if key.starts_with("DropCut.Compress")
                    || key.starts_with("DropCut.OpenEditor")
                    || key.starts_with("ClipShrink.")
                {
                    let _ = hkcu.remove_tree(format!("{}\\{}", base, key));
                }
            }
        }
    }
    Ok(true)
}

#[cfg(target_os = "windows")]
pub fn is_context_menu_installed() -> Result<bool, String> {
    use windows_registry::*;
    let hkcu = CURRENT_USER;
    for base in VIDEO_ASSOCIATION_BASES {
        if let Ok(shell) = hkcu.open(base) {
            for key in shell.keys().map_err(|e| e.to_string())? {
                if key.starts_with("DropCut.Compress") {
                    return Ok(true);
                }
            }
        }
    }
    Ok(false)
}

#[cfg(not(target_os = "windows"))]
pub fn install_context_menu(_presets: &[ClipPreset]) -> Result<bool, String> {
    Ok(false)
}
#[cfg(not(target_os = "windows"))]
pub fn uninstall_context_menu() -> Result<bool, String> {
    Ok(false)
}
#[cfg(not(target_os = "windows"))]
pub fn is_context_menu_installed() -> Result<bool, String> {
    Ok(false)
}
