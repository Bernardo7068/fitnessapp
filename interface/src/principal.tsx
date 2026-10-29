import React from 'react';
import ReactDOM from 'react-dom/client';
import Aplicacao from './Aplicacao';
import './indice.css';
import { registerSW } from 'virtual:pwa-register';

// Registo imediato do Service Worker para suportar instalação PWA e cache offline
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Aplicacao />
  </React.StrictMode>,
);
