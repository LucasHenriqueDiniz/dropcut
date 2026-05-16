import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { App } from './app/App';
import { ProgressWindow } from './app/ProgressWindow';
import './styles/globals.css';

const root = document.getElementById('app');
const bootMode = (window as Window & { __DROPCUT_MODE__?: string }).__DROPCUT_MODE__;

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      {bootMode === 'progress' ? (
        <ProgressWindow />
      ) : (
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )}
    </React.StrictMode>
  );

  window.requestAnimationFrame(() => {
    void (async () => {
      try {
        if (bootMode !== 'progress') {
          const backgroundLaunch = await invoke<boolean>('is_background_launch');
          if (!backgroundLaunch) {
            await getCurrentWindow().show();
          }
        } else {
          return;
        }
      } finally {
        const splash = document.getElementById('boot-splash');
        splash?.classList.add('boot-splash--hide');
        window.setTimeout(() => splash?.remove(), 260);
      }
    })();
  });
} else {
  console.error('Root element #app not found');
}
