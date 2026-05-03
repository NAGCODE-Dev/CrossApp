import React from 'react';
import { createRoot } from 'react-dom/client';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import App from './App';
import '../../packages/ui/styles.css';
import './styles.css';

inject();
injectSpeedInsights();

await ensureRuntimeConfig();

const rootNode = document.getElementById('athlete-react-root');
if (rootNode) {
  createRoot(rootNode).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

async function ensureRuntimeConfig(): Promise<void> {
  if (window.__RYXEN_CONFIG__) return;

  await new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src = '/config.js';
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}
