import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import AppRoot from './AppRoot.tsx';
import './index.css';
import { getStoredThemePreference, setDocumentTheme } from './theme/themeManager';

setDocumentTheme(getStoredThemePreference());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>,
);
