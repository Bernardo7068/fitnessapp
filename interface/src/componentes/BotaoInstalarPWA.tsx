import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, HelpCircle, Check, Share2, Globe, ShieldCheck } from 'lucide-react';

export const BotaoInstalarPWA: React.FC = () => {
  const [promptInstalacao, setPromptInstalacao] = useState<any>(null);
  const [instalado, setInstalado] = useState<boolean>(false);
  const [modalAjudaVisivel, setModalAjudaVisivel] = useState<boolean>(false);
  const [bannerFechado, setBannerFechado] = useState<boolean>(false);
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

    // Detetar se é iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setEhIOS(/iphone|ipad|ipod/.test(userAgent));

    // Capturar o evento nativo do navegador
    const tratarPrompt = (e: Event) => {
      e.preventDefault();
      setPromptInstalacao(e);
      setBannerFechado(false);
    };

    window.addEventListener('beforeinstallprompt', tratarPrompt);
    window.addEventListener('appinstalled', () => {
      setInstalado(true);
      setPromptInstalacao(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', tratarPrompt);
    };
  }, []);

  const handleInstalarClique = async () => {
    if (promptInstalacao) {
      promptInstalacao.prompt();
      const { outcome } = await promptInstalacao.userChoice;
      if (outcome === 'accepted') {
        setInstalado(true);
      }
      setPromptInstalacao(null);
    } else {
      // Se o navegador ainda não disparou o evento (ex: Safari ou HTTPS local), mostra o guia passo-a-passo
      setModalAjudaVisivel(true);
    }
  };

  // Se já estiver instalado como App independente, não precisa de banner
  if (instalado) {
    return null;
  }

  return (
    <>
      {/* BANNER FLUTUANTE DE INSTALAÇÃO NO FUNDO */}
      {!bannerFechado && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-50 animate-bounce-in">
          <div className="bg-slate-900/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl p-4 shadow-2xl shadow-emerald-950/60 text-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>Instalar BInov no Telemóvel</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40">
                    App
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 truncate">
                  Acede em ecrã inteiro sem barras de browser
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={handleInstalarClique}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/25 active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Instalar</span>
              </button>

              <button
                onClick={() => setBannerFechado(true)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INFORMATIVO / GUIA PASSO-A-PASSO DE INSTALAÇÃO */}
      {modalAjudaVisivel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Como Instalar a App no Telemóvel</h3>
                  <span className="text-xs text-slate-400">Guia rápido para Android e iOS</span>
                </div>
              </div>
              <button
                onClick={() => setModalAjudaVisivel(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Opção Android (Chrome) */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-400">
                  <Globe className="w-4 h-4" />
                  <span>No Android (Google Chrome)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed pl-1">
                  <li>Toca no menu dos <strong>3 pontinhos (⋮)</strong> no canto superior direito do Chrome.</li>
                  <li>Seleciona a opção <strong>"Instalar aplicação"</strong> ou <strong>"Adicionar ao ecrã principal"</strong>.</li>
                  <li>Confirma em <strong>"Instalar"</strong>. A app ficará com o ícone BInov no teu ecrã.</li>
                </ol>
              </div>

              {/* Opção iPhone (Safari) */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-400">
                  <Share2 className="w-4 h-4" />
                  <span>No iPhone (Apple Safari)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed pl-1">
                  <li>Toca no botão de <strong>Partilha</strong> (o quadrado com uma seta para cima na barra inferior).</li>
                  <li>Desce um pouco e clica em <strong>"Ecrã Principal"</strong> (Add to Home Screen).</li>
                  <li>Clica em <strong>"Adicionar"</strong> no canto superior direito.</li>
                </ol>
              </div>

              {/* Dica Importante sobre HTTPS / Localhost */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Dica de Instalação:
                </span>
                <p className="text-[11px] leading-relaxed text-amber-200/90">
                  Para o Chrome permitir a instalação, acede através do link seguro gerado por <code>iniciar_com_link_telemovel.bat</code> (com <strong>https://</strong>).
                </p>
              </div>
            </div>

            <button
              onClick={() => setModalAjudaVisivel(false)}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition shadow"
            >
              Compreendido, fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
