import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { EditorPage } from './routes/EditorPage';
import { HistoryPage } from './routes/HistoryPage';
import { SettingsPage } from './routes/SettingsPage';
import { PresetsPage } from './routes/PresetsPage';
import { PresetProvider } from '../lib/PresetProvider';
import { EditorSessionProvider } from '../lib/EditorSessionProvider';
import { LocaleProvider } from '../lib/LocaleProvider';

export function App() {
  return (
    <LocaleProvider>
      <PresetProvider>
        <EditorSessionProvider>
          <AppShell>
            <Routes>
              <Route path="/" element={<EditorPage />} />
              <Route path="/presets" element={<PresetsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </EditorSessionProvider>
      </PresetProvider>
    </LocaleProvider>
  );
}
