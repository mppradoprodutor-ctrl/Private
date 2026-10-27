
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ExcelProvider } from './contexts/ExcelContext';

declare const __VERCEL_URL__: string;

const deploymentUrl = __VERCEL_URL__
  ? new URL(
      __VERCEL_URL__.startsWith('http')
        ? __VERCEL_URL__
        : `https://${__VERCEL_URL__}`,
    )
  : null;

const isProductionAlias = window.location.hostname === 'sistema-fretes-prado.vercel.app';

if (isProductionAlias && deploymentUrl && deploymentUrl.host !== window.location.host) {
  const targetUrl = new URL(window.location.href);
  targetUrl.protocol = deploymentUrl.protocol;
  targetUrl.host = deploymentUrl.host;
  window.location.replace(targetUrl.toString());
} else {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ExcelProvider>
        <App />
      </ExcelProvider>
    </React.StrictMode>,
  );
}
