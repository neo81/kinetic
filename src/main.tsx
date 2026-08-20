import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import AppRoot from './AppRoot.tsx';
import './fonts.css';
import './index.css';
import { getStoredThemePreference, setDocumentTheme } from './theme/themeManager';
import { LanguageProvider } from './i18n/LanguageContext';

setDocumentTheme(getStoredThemePreference());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <AppRoot />
    </LanguageProvider>
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void import('./pwa/serviceWorker').then(({ registerServiceWorker }) => registerServiceWorker());
}
