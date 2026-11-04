import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share2, Globe, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const BotaoInstalarPWA: React.FC = () => {
  const [instalado, setInstalado] = useState<boolean>(false);
  const [modalAjudaVisivel, setModalAjudaVisivel] = useState<boolean>(false);
  const [bannerFechado, setBannerFechado] = useState<boolean>(false);
  const [ehIOS, setEhIOS] = useState<boolean>(false);
  const [descarregando, setDescarregando] = useState<boolean>(false);
  const [downloadConcluido, setDownloadConcluido] = useState<boolean>(false);

  useEffect(() => {
    // Se estiver no ambiente nativo do Capacitor, não mostra o banner
    const isCapacitor =
      typeof window !== 'undefined' &&
      (Boolean((window as any)?.Capacitor?.isNativePlatform?.()) ||
        Boolean((window.navigator as any)?.userAgent?.includes('wv')) ||
        window.location.protocol === 'capacitor:');

    // Se estiver a correr como app instalada (standalone)
    const emStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (emStandalone || isCapacitor) {
      setInstalado(true);
      return;
    }

    // Detetar se é iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setEhIOS(/iphone|ipad|ipod/.test(userAgent));
  }, []);

  const descarregarAPK = () => {
    setDescarregando(true);
    setDownloadConcluido(false);

    const link = document.createElement('a');
    link.href = '/BInov-Fitness.apk';
    link.setAttribute('download', 'BInov-Fitness.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDescarregando(false);
      setDownloadConcluido(true);
      setTimeout(() => setDownloadConcluido(false), 8000);
    }, 1500);
  };

  const handleInstalarClique = () => {
    if (ehIOS) {
      setModalAjudaVisivel(true);
      return;
    }

    // No Android e PC, descarrega o APK diretamente
    descarregarAPK();
  };

  // Se já estiver dentro do APK ou da App independente, não precisa de banner
  if (instalado) {
    return null;
  }

  return (
    <>
      {/* BANNER FLUTUANTE DE INSTALAÇÃO NO FUNDO */}
      {!bannerFechado && (
        <div className="fixed bottom-16 left-3 right-3 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-40 animate-bounce-in">
          <div className="bg-slate-900/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl p-3 sm:p-4 shadow-2xl shadow-emerald-950/60 text-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>Instalar App BInov</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40">
                    APK Nativo
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 truncate">
                  {downloadConcluido
                    ? 'Download concluído! Clica no ficheiro para instalar.'
                    : descarregando
                    ? 'A transferir ficheiro APK...'
                    : 'Instala no telemóvel para aceder via WireGuard'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={handleInstalarClique}
                disabled={descarregando}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-50"
              >
                {downloadConcluido ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Concluído</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>{descarregando ? 'A baixar...' : 'Instalar APK'}</span>
                  </>
                )}
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
                  <h3 className="text-sm font-black text-white">Instalar BInov no Telemóvel</h3>
                  <span className="text-xs text-slate-400">Instalação direta para Android ou iOS</span>
                </div>
              </div>
              <button
                onClick={() => setModalAjudaVisivel(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Opção Android (APK Nativo) */}
              {!ehIOS && (
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                    <Globe className="w-4 h-4" />
                    <span>Android (Ficheiro APK Nativo)</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Descarrega o pacote oficial da aplicação compilado para a tua rede WireGuard.
                  </p>
                  <button
                    onClick={descarregarAPK}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descarregar BInov-Fitness.apk</span>
                  </button>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 leading-relaxed pl-1 pt-1">
                    <li>Clica no botão acima para transferir o ficheiro.</li>
                    <li>Quando o download terminar, toca na notificação para abrir.</li>
                    <li>Confirma em <strong>"Instalar"</strong>. A app ficará no teu ecrã inicial.</li>
                  </ol>
                </div>
              )}

              {/* Opção iPhone (Safari) */}
              {ehIOS && (
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
              )}

              {/* Dica sobre WireGuard */}
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-200 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-sky-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                  Ligação Segura WireGuard:
                </span>
                <p className="text-[11px] leading-relaxed text-sky-200/90">
                  Depois de instalar o APK, liga o teu WireGuard no telemóvel e abre a app. O acesso é direto e privado.
                </p>
              </div>
            </div>

            <button
              onClick={() => setModalAjudaVisivel(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition border border-slate-700"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
