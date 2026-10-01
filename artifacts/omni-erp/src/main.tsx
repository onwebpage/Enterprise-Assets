import { createRoot } from 'react-dom/client';

import App from './App';
import NativeOfflineBanner from './components/app/NativeOfflineBanner';
import { initNativeApp } from './lib/native';

import './index.css';

// Android app shell (back button, links, downloads, connectivity). No-op on the web.
initNativeApp();

createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <NativeOfflineBanner />
  </>,
);
