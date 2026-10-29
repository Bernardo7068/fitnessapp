import React from 'react';
import ReactDOM from 'react-dom/client';
import Aplicacao from './Aplicacao';
import './indice.css';

// Registo direto e fiável do Service Worker para suporte PWA offline e instalação
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker ativo com âmbito:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Falha ao registar Service Worker:', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Aplicacao />
  </React.StrictMode>,
);
