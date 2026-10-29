import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';

export const BotaoInstalarPWA: React.FC = () => {
  const [promptInstalacao, setPromptInstalacao] = useState<any>(null);
  const [visivel, setVisivel] = useState<boolean>(false);
  const [instalado, setInstalado] = useState<boolean>(false);
  const [ehIOS, setEhIOS] = useState<boolean>(false);

  useEffect(() => {
    // Detetar se já está a correr como app instalada (standalone)
    const emStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (emStandalone) {
      setInstalado(true);
      return;
    }

    // Detetar dispositivo iOS / Apple
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setEhIOS(isIosDevice);

    // Capturar o evento nativo do Chrome/Edge/Android
    const tratarBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setPromptInstalacao(e);
      setVisivel(true);
    };

    window.addEventListener('beforeinstallprompt', tratarBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setInstalado(true);
      setVisivel(false);
      setPromptInstalacao(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', tratarBeforeInstallPrompt);
    };
  }, []);

  const handleInstalar = async () => {
    if (!promptInstalacao) return;
    promptInstalacao.prompt();
    const { outcome } = await promptInstalacao.userChoice;
    if (outcome === 'accepted') {
      setInstalado(true);
      setVisivel(false);
    }
    setPromptInstalacao(null);
  };

  if (instalado || (!visivel && !ehIOS)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-50 animate-bounce-in">
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-emerald-500/40 rounded-2xl p-4 shadow-2xl shadow-emerald-950/50 flex items-center justify-between gap-3 text-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
              <span>Instalar BInov App</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40">
                PWA
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 truncate">
              {ehIOS
                ? 'No Safari: Partilhar ➔ Adicionar ao Ecrã Principal'
                : 'Instala no ecrã do telemóvel para acesso rápido'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!ehIOS && promptInstalacao && (
            <button
              onClick={handleInstalar}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar</span>
            </button>
          )}

          <button
            onClick={() => setVisivel(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
