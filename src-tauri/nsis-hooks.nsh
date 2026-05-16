!macro NSIS_HOOK_POSTINSTALL
  ; Generic video association
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\video\shell\DropCut.Compress.discord_free" "" "Compress with DropCut (10 MB)"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\video\shell\DropCut.Compress.discord_free" "Icon" "$INSTDIR\dropcut.exe"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\video\shell\DropCut.Compress.discord_free\command" "" '"$INSTDIR\dropcut.exe" --background-compress --preset-id "discord-free" --input "%1"'

  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\video\shell\DropCut.Compress.discord_nitro" "" "Compress with DropCut (50 MB)"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\video\shell\DropCut.Compress.discord_nitro" "Icon" "$INSTDIR\dropcut.exe"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\video\shell\DropCut.Compress.discord_nitro\command" "" '"$INSTDIR\dropcut.exe" --background-compress --preset-id "discord-nitro" --input "%1"'

  ; Explicit video extensions (improves compatibility on some Windows installs)
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.mp4\shell\DropCut.Compress.discord_free" "" "Compress with DropCut (10 MB)"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.mp4\shell\DropCut.Compress.discord_free" "Icon" "$INSTDIR\dropcut.exe"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.mp4\shell\DropCut.Compress.discord_free\command" "" '"$INSTDIR\dropcut.exe" --background-compress --preset-id "discord-free" --input "%1"'
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.mp4\shell\DropCut.Compress.discord_nitro" "" "Compress with DropCut (50 MB)"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.mp4\shell\DropCut.Compress.discord_nitro" "Icon" "$INSTDIR\dropcut.exe"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.mp4\shell\DropCut.Compress.discord_nitro\command" "" '"$INSTDIR\dropcut.exe" --background-compress --preset-id "discord-nitro" --input "%1"'

  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.mkv\shell\DropCut.Compress.discord_free" "" "Compress with DropCut (10 MB)"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.mkv\shell\DropCut.Compress.discord_free" "Icon" "$INSTDIR\dropcut.exe"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.mkv\shell\DropCut.Compress.discord_free\command" "" '"$INSTDIR\dropcut.exe" --background-compress --preset-id "discord-free" --input "%1"'
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.mkv\shell\DropCut.Compress.discord_nitro" "" "Compress with DropCut (50 MB)"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.mkv\shell\DropCut.Compress.discord_nitro" "Icon" "$INSTDIR\dropcut.exe"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.mkv\shell\DropCut.Compress.discord_nitro\command" "" '"$INSTDIR\dropcut.exe" --background-compress --preset-id "discord-nitro" --input "%1"'

  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.mov\shell\DropCut.Compress.discord_free" "" "Compress with DropCut (10 MB)"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.mov\shell\DropCut.Compress.discord_free" "Icon" "$INSTDIR\dropcut.exe"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.mov\shell\DropCut.Compress.discord_free\command" "" '"$INSTDIR\dropcut.exe" --background-compress --preset-id "discord-free" --input "%1"'
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.mov\shell\DropCut.Compress.discord_nitro" "" "Compress with DropCut (50 MB)"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.mov\shell\DropCut.Compress.discord_nitro" "Icon" "$INSTDIR\dropcut.exe"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.mov\shell\DropCut.Compress.discord_nitro\command" "" '"$INSTDIR\dropcut.exe" --background-compress --preset-id "discord-nitro" --input "%1"'

  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.webm\shell\DropCut.Compress.discord_free" "" "Compress with DropCut (10 MB)"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.webm\shell\DropCut.Compress.discord_free" "Icon" "$INSTDIR\dropcut.exe"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.webm\shell\DropCut.Compress.discord_free\command" "" '"$INSTDIR\dropcut.exe" --background-compress --preset-id "discord-free" --input "%1"'
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.webm\shell\DropCut.Compress.discord_nitro" "" "Compress with DropCut (50 MB)"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.webm\shell\DropCut.Compress.discord_nitro" "Icon" "$INSTDIR\dropcut.exe"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.webm\shell\DropCut.Compress.discord_nitro\command" "" '"$INSTDIR\dropcut.exe" --background-compress --preset-id "discord-nitro" --input "%1"'

  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.avi\shell\DropCut.Compress.discord_free" "" "Compress with DropCut (10 MB)"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.avi\shell\DropCut.Compress.discord_free" "Icon" "$INSTDIR\dropcut.exe"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.avi\shell\DropCut.Compress.discord_free\command" "" '"$INSTDIR\dropcut.exe" --background-compress --preset-id "discord-free" --input "%1"'
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.avi\shell\DropCut.Compress.discord_nitro" "" "Compress with DropCut (50 MB)"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.avi\shell\DropCut.Compress.discord_nitro" "Icon" "$INSTDIR\dropcut.exe"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.avi\shell\DropCut.Compress.discord_nitro\command" "" '"$INSTDIR\dropcut.exe" --background-compress --preset-id "discord-nitro" --input "%1"'

  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.wmv\shell\DropCut.Compress.discord_free" "" "Compress with DropCut (10 MB)"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.wmv\shell\DropCut.Compress.discord_free" "Icon" "$INSTDIR\dropcut.exe"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.wmv\shell\DropCut.Compress.discord_free\command" "" '"$INSTDIR\dropcut.exe" --background-compress --preset-id "discord-free" --input "%1"'
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.wmv\shell\DropCut.Compress.discord_nitro" "" "Compress with DropCut (50 MB)"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.wmv\shell\DropCut.Compress.discord_nitro" "Icon" "$INSTDIR\dropcut.exe"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.wmv\shell\DropCut.Compress.discord_nitro\command" "" '"$INSTDIR\dropcut.exe" --background-compress --preset-id "discord-nitro" --input "%1"'
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

  ; App data cleanup
  RMDir /r "$APPDATA\com.dropcut.desktop"
  RMDir /r "$LOCALAPPDATA\com.dropcut.desktop"
  RMDir /r "$TEMP\dropcut-thumbnails"
!macroend
