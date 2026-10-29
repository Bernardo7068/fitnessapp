import React, { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronUp, RefreshCw, Edit3, Save,
  ShieldCheck, Flame, Dumbbell, Utensils, CheckCircle2, Info, Clock, MessageSquare, Activity
} from 'lucide-react';
import { ServicoApi } from '../servicos/api';
import { MemoriaTreinoIA, MemoriaNutricaoIA } from '../tipos/fitness';

interface PainelMemoriaIAProps {
  tipo: 'treino' | 'nutricao';
  className?: string;
}

export const PainelMemoriaIA: React.FC<PainelMemoriaIAProps> = ({ tipo, className = '' }) => {
  const [carregando, setCarregando] = useState<boolean>(true);
  const [expandido, setExpandido] = useState<boolean>(false);
  const [memoriaTreino, setMemoriaTreino] = useState<MemoriaTreinoIA | null>(null);
  const [memoriaNutricao, setMemoriaNutricao] = useState<MemoriaNutricaoIA | null>(null);
  
  const [editandoNota, setEditandoNota] = useState<boolean>(false);
  const [textoNota, setTextoNota] = useState<string>('');
  const [salvandoNota, setSalvandoNota] = useState<boolean>(false);
  const [reanalisando, setReanalisando] = useState<boolean>(false);
  const [mensagemStatus, setMensagemStatus] = useState<string>('');

  const carregarMemoria = async () => {
    try {
      setCarregando(true);
      const res = await ServicoApi.obterMemoriaIA();
      if (res) {
        setMemoriaTreino(res.treino);
        setMemoriaNutricao(res.nutricao);
        if (tipo === 'treino') {
          setTextoNota(res.treino?.observacoes_atleta || '');
        } else {
          setTextoNota(res.nutricao?.observacoes_atleta || '');
        }
      }
    } catch (err) {
      console.error('Erro ao carregar diagnóstico:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarMemoria();
  }, [tipo]);

  const handleSalvarNota = async () => {
    try {
      setSalvandoNota(true);
      const res = await ServicoApi.atualizarMemoriaIA({
        tipo,
        observacoes_atleta: textoNota
      });
      if (tipo === 'treino') {
        setMemoriaTreino(res.memoria);
      } else {
        setMemoriaNutricao(res.memoria);
      }
      setEditandoNota(false);
      setMensagemStatus('Observações guardadas com sucesso.');
      setTimeout(() => setMensagemStatus(''), 3500);
    } catch (err) {
      console.error('Erro ao guardar observações:', err);
      setMensagemStatus('Erro ao guardar nota.');
      setTimeout(() => setMensagemStatus(''), 3500);
    } finally {
      setSalvandoNota(false);
    }
  };

  const handleReanalisar = async () => {
    try {
      setReanalisando(true);
      const res = await ServicoApi.reanalisarMemoriaIA(tipo);
      if (res) {
        if (tipo === 'treino') {
          setMemoriaTreino(res.treino);
          setTextoNota(res.treino?.observacoes_atleta || '');
        } else {
          setMemoriaNutricao(res.nutricao);
          setTextoNota(res.nutricao?.observacoes_atleta || '');
        }
        setMensagemStatus('Diagnóstico atualizado com os dados mais recentes.');
        setTimeout(() => setMensagemStatus(''), 3500);
      }
    } catch (err) {
      console.error('Erro ao atualizar diagnóstico:', err);
      setMensagemStatus('Falha ao atualizar diagnóstico.');
      setTimeout(() => setMensagemStatus(''), 3500);
    } finally {
      setReanalisando(false);
    }
  };

  if (carregando) {
    return null;
  }

  const memoria = tipo === 'treino' ? memoriaTreino : memoriaNutricao;
  if (!memoria) return null;

  const ehTreino = tipo === 'treino';

  return (
    <div className={`bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/70 rounded-xl transition-all duration-200 overflow-hidden ${className}`}>
      {/* BARRA DISCRETA (CABEÇALHO) COM APENAS UM BOTÃO DE EXPANSÃO */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1 rounded-md bg-slate-800 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs font-bold text-slate-200 truncate">
              {ehTreino ? 'Perfil de Resposta & Cargas' : 'Perfil Metabólico & Apetite'}
            </span>

            {/* Resumo compacto de 1 linha */}
            <span className="hidden sm:inline-block text-xs text-slate-400 font-normal truncate max-w-md">
              • {ehTreino
                ? `${(memoria as MemoriaTreinoIA).capacidade_forca.split('.')[0]}`
                : `${(memoria as MemoriaNutricaoIA).padrao_apetite.split('.')[0]}`}
            </span>
          </div>
        </div>

        {/* ÚNICO BOTÃO DE ACÇÃO: TOGGLE EXPANDIR / RECOLHER */}
        <div className="flex items-center gap-1.5 ml-auto">
          {expandido && (
            <button
              onClick={handleReanalisar}
              disabled={reanalisando}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 rounded-lg flex items-center gap-1 transition"
              title="Recalcular com as sessões e check-ins mais recentes"
            >
              <RefreshCw className={`w-3 h-3 ${reanalisando ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden md:inline">Recalcular</span>
            </button>
          )}

          <button
            onClick={() => setExpandido(!expandido)}
            className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition border border-slate-700/60"
          >
            <span>{expandido ? 'Recolher' : 'Ver Diagnóstico'}</span>
            {expandido ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {mensagemStatus && (
        <div className="mx-4 mb-2 p-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>{mensagemStatus}</span>
        </div>
      )}

      {/* MODO EXPANDIDO (DETALHADO E LIMPO) */}
      {expandido && (
        <div className="p-4 pt-2 border-t border-slate-800/60 space-y-4 bg-slate-950/30 animate-fade-in">
          {/* AS 4 DIMENSÕES ESTRUTURADAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {ehTreino ? (
              <>
                <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <Flame className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Capacidade de Força & Tensão Mecânica</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {(memoria as MemoriaTreinoIA).capacidade_forca}
                  </p>
                </div>

                <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                    <Dumbbell className="w-3.5 h-3.5 text-rose-400" />
                    <span>Volume de Treino & Necessidade de Pump</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {(memoria as MemoriaTreinoIA).tolerancia_volume_e_pump}
                  </p>
                </div>

                <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Recuperação & Saúde Articular</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {(memoria as MemoriaTreinoIA).perfil_recuperacao}
                  </p>
                </div>

                <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    <span>Pontos Fortes & Foco Biomecânico</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {(memoria as MemoriaTreinoIA).pontos_fortes_e_foco}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Padrão de Apetite & Horários</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {(memoria as MemoriaNutricaoIA).padrao_apetite}
                  </p>
                </div>

                <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Resposta Digestiva & Tolerância</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {(memoria as MemoriaNutricaoIA).resposta_digestiva}
                  </p>
                </div>

                <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Alimentos Blindados & Preferidos</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {(memoria as MemoriaNutricaoIA).alimentos_blindados}
                  </p>
                </div>

                <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400">
                    <Flame className="w-3.5 h-3.5 text-teal-400" />
                    <span>Metabolismo & Adesão à Fase</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {(memoria as MemoriaNutricaoIA).capacidade_metabolica}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* CRITÉRIOS DE ADAPTAÇÃO FISIOLÓGICA */}
          <div className="p-3.5 bg-slate-900/70 border border-emerald-500/20 rounded-lg space-y-2">
            <span className="font-bold text-emerald-400 text-xs block">
              Critérios de Prescrição Adaptativa
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {memoria.resumo_transparente}
            </p>
            <div className="text-xs text-emerald-300/90 bg-emerald-950/40 p-2 rounded border border-emerald-500/20">
              <strong>Diretriz do Motor:</strong> {memoria.diretriz_algoritmo}
            </div>
          </div>

          {/* HISTÓRICO DE FEEDBACKS GUARDADOS */}
          {memoria.historico_feedbacks && memoria.historico_feedbacks.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Info className="w-3 h-3 text-slate-500" />
                <span>Padrões e Feedbacks Registados:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {memoria.historico_feedbacks.map((fb, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-xs text-slate-300"
                  >
                    ✓ {fb}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* NOTAS E OBSERVAÇÕES PESSOAIS DO ATLETA */}
          <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-300">
                  Observações e Notas Pessoais
                </span>
              </div>
              {!editandoNota && (
                <button
                  onClick={() => setEditandoNota(true)}
                  className="px-2 py-0.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition flex items-center gap-1"
                >
                  <Edit3 className="w-2.5 h-2.5" />
                  <span>{textoNota ? 'Editar' : 'Adicionar'}</span>
                </button>
              )}
            </div>

            {editandoNota ? (
              <div className="space-y-2">
                <textarea
                  rows={2}
                  value={textoNota}
                  onChange={(e) => setTextoNota(e.target.value)}
                  placeholder={
                    ehTreino
                      ? 'Ex: Prefiro fazer 4 séries no supino mesmo quando cansado; desconforto com pegadas excessivamente abertas...'
                      : 'Ex: Pouca tolerância a ovos ao acordar; digestão ideal com batata e aveia...'
                  }
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setEditandoNota(false)}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSalvarNota}
                    disabled={salvandoNota}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition disabled:opacity-50"
                  >
                    <Save className="w-3 h-3" />
                    <span>{salvandoNota ? 'A guardar...' : 'Guardar Observações'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic bg-slate-950/60 p-2 rounded border border-slate-800/60">
                {textoNota || 'Nenhuma nota adicional do atleta registada. O perfil adaptativo está ativo com base nos teus registos e check-ins.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
