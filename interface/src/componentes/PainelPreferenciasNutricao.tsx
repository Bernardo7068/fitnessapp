import React, { useState } from 'react';
import {
  Heart,
  Ban,
  Clock,
  Utensils,
  Save,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { PreferenciasAlimentares } from '../tipos/fitness';
import { ServicoApi } from '../servicos/api';

interface PainelPreferenciasNutricaoProps {
  preferencias: PreferenciasAlimentares;
  aoAtualizarPreferencias: (novasPreferencias: PreferenciasAlimentares) => void;
  className?: string;
}

export const PainelPreferenciasNutricao: React.FC<PainelPreferenciasNutricaoProps> = ({
  preferencias,
  aoAtualizarPreferencias,
  className = ''
}) => {
  const [expandido, setExpandido] = useState<boolean>(false);
  const [dadosLocais, setDadosLocais] = useState<PreferenciasAlimentares>(preferencias);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');
  const [mensagemErro, setMensagemErro] = useState<string>('');

  // Sincronizar se o pai mudar
  React.useEffect(() => {
    setDadosLocais(preferencias);
  }, [preferencias]);

  const handleSalvar = async () => {
    try {
      setSalvando(true);
      setMensagemErro('');
      setMensagemSucesso('');

      const res = await ServicoApi.salvarPreferenciasNutricao(dadosLocais);
      aoAtualizarPreferencias(res.preferencias || dadosLocais);
      setMensagemSucesso('Preferências guardadas com sucesso! Serão aplicadas nas próximas prescrições e calibrações.');
      setTimeout(() => setMensagemSucesso(''), 4500);
    } catch (err: any) {
      console.error('Erro ao guardar preferências:', err);
      setMensagemErro(err.message || 'Erro ao guardar preferências alimentares.');
      setTimeout(() => setMensagemErro(''), 5000);
    } finally {
      setSalvando(false);
    }
  };

  const horarioLabel = (h: string) => {
    if (h === 'manha') return 'Manhã (08h-11h)';
    if (h === 'noite') return 'Noite (19h-22h)';
    return 'Tarde (14h-18h)';
  };

  return (
    <div className={`bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all ${className}`}>
      {/* CABEÇALHO DO CARD */}
      <div
        onClick={() => setExpandido(!expandido)}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Heart className="w-5 h-5 fill-emerald-500/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white">
                As Tuas Preferências Alimentares & Alergias
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 rounded-full">
                Perfil Nutricional
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Alimentos favoritos, intolerâncias, horário de treino e apetite respeitados pela IA e cálculos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label={expandido ? 'Recolher painel' : 'Expandir painel'}
          >
            {expandido ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* RESUMO RÁPIDO QUANDO RECOLHIDO */}
      {!expandido && (
        <div className="px-4 sm:px-5 pb-4 pt-1 flex flex-wrap gap-2 text-xs border-t border-slate-800/60 bg-slate-950/30">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
            <Heart className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Favoritos:</span>
            <span className="font-semibold text-emerald-300 truncate max-w-[200px] sm:max-w-[300px]">
              {dadosLocais.alimentos_preferidos ? dadosLocais.alimentos_preferidos : 'Não definido'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
            <Ban className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-slate-400">Alergias / Evitados:</span>
            <span className={`font-semibold truncate max-w-[180px] ${dadosLocais.alimentos_evitados ? 'text-rose-300' : 'text-slate-500'}`}>
              {dadosLocais.alimentos_evitados || 'Nenhum'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Treino:</span>
            <span className="font-semibold text-sky-300">
              {horarioLabel(dadosLocais.horario_treino)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
            <Utensils className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Refeições:</span>
            <span className="font-semibold text-amber-300">
              {dadosLocais.numero_refeicoes || 4}x / dia
            </span>
          </div>

          <button
            onClick={() => setExpandido(true)}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold ml-auto self-center hover:underline"
          >
            Editar preferências →
          </button>
        </div>
      )}

      {/* PAINEL EXPANDIDO PARA EDIÇÃO DIRETA */}
      {expandido && (
        <div className="p-4 sm:p-5 border-t border-slate-800 space-y-4 bg-slate-950/40 animate-fade-in text-xs">
          {mensagemSucesso && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-xl flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{mensagemSucesso}</span>
            </div>
          )}

          {mensagemErro && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/40 text-rose-300 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{mensagemErro}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Alimentos Preferidos */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-200 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-emerald-400" />
                <span>Alimentos que Mais Gostas & Consomes</span>
              </label>
              <textarea
                rows={3}
                value={dadosLocais.alimentos_preferidos}
                onChange={(e) => setDadosLocais({ ...dadosLocais, alimentos_preferidos: e.target.value })}
                placeholder="Ex: Arroz basmati, frango, carne picada de vaca, ovos, aveia, iogurte, banana, azeite, batata..."
                className="w-full bg-slate-900 border border-slate-750 rounded-xl p-3 text-slate-200 focus:border-emerald-500 focus:outline-none leading-relaxed resize-none text-xs"
              />
              <span className="text-[11px] text-slate-500 block">
                A IA e o motor heurístico darão sempre prioridade a estes alimentos na tua dieta.
              </span>
            </div>

            {/* 2. Alimentos Evitados & Alergias */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-200 flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5 text-rose-400" />
                <span>Alergias, Intolerâncias & O que NÃO Gostas</span>
              </label>
              <textarea
                rows={3}
                value={dadosLocais.alimentos_evitados}
                onChange={(e) => setDadosLocais({ ...dadosLocais, alimentos_evitados: e.target.value })}
                placeholder="Ex: Lactose, glúten, marisco, peixe cozido, claras cruas, brócolos..."
                className="w-full bg-slate-900 border border-slate-750 rounded-xl p-3 text-slate-200 focus:border-rose-500 focus:outline-none leading-relaxed resize-none text-xs"
              />
              <span className="text-[11px] text-slate-500 block">
                Estes alimentos são banidos das sugestões e prescrições automáticas.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 3. Horário habitual de treino */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>Horário Habitual de Treino</span>
              </label>
              <select
                value={dadosLocais.horario_treino}
                onChange={(e) => setDadosLocais({ ...dadosLocais, horario_treino: e.target.value })}
                className="w-full bg-slate-900 border border-slate-750 rounded-xl p-2.5 text-slate-200 text-xs focus:border-emerald-500 focus:outline-none"
              >
                <option value="manha">Manhã (ex: 08h - 11h)</option>
                <option value="tarde">Tarde (ex: 14h - 18h)</option>
                <option value="noite">Noite (ex: 19h - 22h)</option>
              </select>
              <span className="text-[11px] text-slate-500 block">
                Permite posicionar o pré e pós-treino e hidratos de carbono nas horas certas.
              </span>
            </div>

            {/* 4. Número de refeições */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-200 flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-amber-400" />
                <span>Número de Refeições por Dia</span>
              </label>
              <select
                value={dadosLocais.numero_refeicoes}
                onChange={(e) => setDadosLocais({ ...dadosLocais, numero_refeicoes: parseInt(e.target.value) || 4 })}
                className="w-full bg-slate-900 border border-slate-750 rounded-xl p-2.5 text-slate-200 text-xs focus:border-emerald-500 focus:outline-none"
              >
                <option value={3}>3 Refeições</option>
                <option value={4}>4 Refeições (Recomendado)</option>
                <option value={5}>5 Refeições</option>
                <option value={6}>6 Refeições</option>
              </select>
              <span className="text-[11px] text-slate-500 block">
                Quantas vezes no dia queres distribuir as tuas calorias.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 5. Hábitos de apetite e saciedade */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Hábitos de Apetite & Fome</span>
              </label>
              <input
                type="text"
                value={dadosLocais.habitos_apetite}
                onChange={(e) => setDadosLocais({ ...dadosLocais, habitos_apetite: e.target.value })}
                placeholder="Ex: Pouco apetite ao acordar; muita fome à tarde ou pós-treino"
                className="w-full bg-slate-900 border border-slate-750 rounded-xl p-2.5 text-slate-200 text-xs focus:border-emerald-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 block">
                A IA calibra o volume das refeições para os momentos em que tens mais apetite.
              </span>
            </div>

            {/* 6. Alimentos difíceis / Empanturramento */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-200 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Alimentos Difíceis / Digestão Pesada</span>
              </label>
              <input
                type="text"
                value={dadosLocais.alimentos_dificeis}
                onChange={(e) => setDadosLocais({ ...dadosLocais, alimentos_dificeis: e.target.value })}
                placeholder="Ex: Batata doce em grande volume; frango seco custa a engolir"
                className="w-full bg-slate-900 border border-slate-750 rounded-xl p-2.5 text-slate-200 text-xs focus:border-emerald-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 block">
                Permite evitar alimentos com excesso de volume quando o plano exigir mais densidade calórica.
              </span>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 italic">
              💡 As preferências são guardadas de forma permanente no teu perfil.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpandido(false)}
                className="px-3 py-2 text-slate-400 hover:text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition"
              >
                Recolher
              </button>

              <button
                type="button"
                onClick={handleSalvar}
                disabled={salvando}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20 disabled:opacity-50 active:scale-95"
              >
                {salvando ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>A guardar...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Preferências</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
