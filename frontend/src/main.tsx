import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import App from './App';
import './index.css';
import './styles/globals.css';
import 'katex/dist/katex.min.css';

// Remove the initial loading spinner once React takes over
const removeLoader = () => {
  const loader = document.getElementById('root-loading');
  if (loader) {
    loader.classList.add('hidden');
    // Remove from DOM after transition ends
    loader.addEventListener('transitionend', () => loader.remove(), { once: true });
  }
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('[Rekha] Root element #root not found in the DOM.');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        gutter={8}
        containerStyle={{ zIndex: 9999 }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#2a2a2a',
            color: '#f1f3f5',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            fontSize: '0.875rem',
            fontFamily: 'Inter, Segoe UI, sans-serif',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
          success: {
            iconTheme: { primary: '#0d9488', secondary: '#f0fdfa' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff1f2' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
);

// Remove splash loader after first paint
removeLoader();
