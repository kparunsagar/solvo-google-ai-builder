import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initSecurityShield } from './lib/securityShield';
import { nativeMobileService } from './services/nativeMobile.service';

// Initialize Client-Side Ethical Hacker Defense Shield
initSecurityShield({
  disableRightClick: true,
  disableKeyShortcuts: true,
  enableConsoleWarning: true,
  enableClickjackProtection: true,
  enablePrototypeProtection: true
});

// Initialize Native Mobile Hardware & Platform Layer (Status Bar, Back Button, Deep Links)
nativeMobileService.initialize().catch(console.warn);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
