!macro NSIS_HOOK_POSTINSTALL
  ; Context menu entries are registered dynamically by the app itself on first
  ; launch (src-tauri/src/context_menu.rs), keyed to the user's actual presets
  ; instead of a fixed pair baked into the installer.
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; Generic video association
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\video\shell\DropCut.Compress.discord_free"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\video\shell\DropCut.Compress.discord_nitro"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\video\shell\DropCut.Compress8"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\video\shell\DropCut.Compress25"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\video\shell\DropCut.OpenEditor"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\video\shell\ClipShrink.Compress8"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\video\shell\ClipShrink.Compress25"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\video\shell\ClipShrink.OpenEditor"

  ; Explicit video extensions
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.mp4\shell\DropCut.Compress.discord_free"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.mp4\shell\DropCut.Compress.discord_nitro"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.mkv\shell\DropCut.Compress.discord_free"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.mkv\shell\DropCut.Compress.discord_nitro"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.mov\shell\DropCut.Compress.discord_free"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.mov\shell\DropCut.Compress.discord_nitro"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.webm\shell\DropCut.Compress.discord_free"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.webm\shell\DropCut.Compress.discord_nitro"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.avi\shell\DropCut.Compress.discord_free"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.avi\shell\DropCut.Compress.discord_nitro"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.wmv\shell\DropCut.Compress.discord_free"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.wmv\shell\DropCut.Compress.discord_nitro"

  ; Only the thumbnail cache is cleaned here. Presets, settings and history live
  ; in $APPDATA\com.dropcut.desktop and are deleted by Tauri's own uninstall
  ; section, which correctly honours the "delete application data" checkbox and
  ; skips deletion during an update. Removing them here would wipe user data on
  ; every upgrade, because this hook runs unguarded.
  RMDir /r "$TEMP\dropcut-thumbnails"
!macroend
