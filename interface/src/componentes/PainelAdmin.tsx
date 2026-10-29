import React, { useState, useEffect } from 'react';
import { Users, Shield, ShieldCheck, UserCheck, Trash2, RefreshCw, AlertTriangle, CheckCircle2, Dumbbell, CalendarCheck } from 'lucide-react';
import { ServicoApi } from '../servicos/api';
import { UtilizadorAutenticado } from '../tipos/fitness';

interface PropsPainelAdmin {
  utilizadorAtual: UtilizadorAutenticado;
}

export const PainelAdmin: React.FC<PropsPainelAdmin> = ({ utilizadorAtual }) => {
  const [utilizadores, setUtilizadores] = useState<UtilizadorAutenticado[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'sucesso' | 'erro' } | null>(null);
  const [idUtilizadorEliminar, setIdUtilizadorEliminar] = useState<number | null>(null);

  useEffect(() => {
    carregarUtilizadores();
  }, []);

  const carregarUtilizadores = async () => {
    setCarregando(true);
    try {
      const res = await ServicoApi.listarUtilizadores();
      setUtilizadores(res.utilizadores);
    } catch (err: any) {
      setMensagem({ texto: err.message || 'Erro ao carregar utilizadores', tipo: 'erro' });
    } finally {
      setCarregando(false);
    }
  };

  const alternarPapel = async (alvo: UtilizadorAutenticado) => {
    const novoPapel = alvo.papel === 'admin' ? 'atleta' : 'admin';
    try {
      const res = await ServicoApi.alterarPapelUtilizador(alvo.id, novoPapel);
      setMensagem({ texto: res.mensagem, tipo: 'sucesso' });
      carregarUtilizadores();
    } catch (err: any) {
      setMensagem({ texto: err.message || 'Erro ao alterar papel', tipo: 'erro' });
    }
  };

  const confirmarEliminacao = async () => {
    if (!idUtilizadorEliminar) return;
    try {
      const res = await ServicoApi.eliminarUtilizador(idUtilizadorEliminar);
      setMensagem({ texto: res.mensagem, tipo: 'sucesso' });
      setIdUtilizadorEliminar(null);
      carregarUtilizadores();
    } catch (err: any) {
      setMensagem({ texto: err.message || 'Erro ao eliminar utilizador', tipo: 'erro' });
    }
  };

  const totalAtletas = utilizadores.filter((u) => u.papel === 'atleta').length;
  const totalAdmins = utilizadores.filter((u) => u.papel === 'admin').length;

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      {/* Cabeçalho do Painel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              Gestão de Utilizadores & Atletas
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Acesso de Administrador
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Administração de contas, níveis de permissão e monitorização de adesão dos atletas.
            </p>
          </div>
        </div>

        <button
          onClick={carregarUtilizadores}
          disabled={carregando}
          className="self-start sm:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
          <span>Atualizar Lista</span>
        </button>
      </div>

      {/* Cartões de Estatísticas Globais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Total de Contas</span>
            <span className="text-xl font-black text-white block">{utilizadores.length}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Atletas Ativos</span>
            <span className="text-xl font-black text-white block">{totalAtletas}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Administradores</span>
            <span className="text-xl font-black text-white block">{totalAdmins}</span>
          </div>
        </div>
      </div>

      {/* Mensagem de Feedback */}
      {mensagem && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 animate-fade-in ${
            mensagem.tipo === 'sucesso'
              ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/60 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {mensagem.tipo === 'sucesso' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            )}
            <span>{mensagem.texto}</span>
          </div>
          <button
            onClick={() => setMensagem(null)}
            className="text-slate-400 hover:text-white text-xs font-bold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Tabela de Utilizadores */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Contas de Utilizador Registadas
          </h2>
          <span className="text-xs text-slate-500 font-medium">{utilizadores.length} registos encontrados</span>
        </div>

        {carregando ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
            A carregar dados de utilizadores...
          </div>
        ) : utilizadores.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Nenhum utilizador encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Utilizador</th>
                  <th className="py-3 px-4">Papel & Nível</th>
                  <th className="py-3 px-4">Treinos</th>
                  <th className="py-3 px-4">Check-ins</th>
                  <th className="py-3 px-4">Registado em</th>
                  <th className="py-3 px-4">Último Acesso</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {utilizadores.map((u) => {
                  const eProprioAdmin = u.id === utilizadorAtual.id;
                  const eAdmin = u.papel === 'admin';

                  return (
                    <tr key={u.id} className="hover:bg-slate-850/50 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{u.nome}</span>
                          {eProprioAdmin && (
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-semibold">
                              Tu
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                      </td>

                      <td className="py-3 px-4">
                        {eAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            <Shield className="w-3 h-3 text-purple-400" />
                            Administrador
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <UserCheck className="w-3 h-3 text-emerald-400" />
                            Atleta
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-slate-300 font-semibold">
                          <Dumbbell className="w-3.5 h-3.5 text-slate-500" />
                          <span>{u.estatisticas?.total_treinos || 0}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-slate-300 font-semibold">
                          <CalendarCheck className="w-3.5 h-3.5 text-slate-500" />
                          <span>{u.estatisticas?.total_checkins || 0}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-400">{u.criado_em}</td>
                      <td className="py-3 px-4 text-slate-400">{u.ultimo_login}</td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão de Alternar Papel */}
                          <button
                            onClick={() => alternarPapel(u)}
                            disabled={eProprioAdmin}
                            title={eAdmin ? 'Rebaixar para Atleta' : 'Promover a Administrador'}
                            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition border active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                              eAdmin
                                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                                : 'bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25'
                            }`}
                          >
                            {eAdmin ? 'Tornar Atleta' : 'Promover Admin'}
                          </button>

                          {/* Botão de Eliminar Utilizador */}
                          {!eProprioAdmin && (
                            <button
                              onClick={() => setIdUtilizadorEliminar(u.id)}
                              title="Eliminar utilizador"
                              className="p-1.5 text-red-400/70 hover:text-red-300 hover:bg-red-500/15 rounded-lg border border-transparent hover:border-red-500/30 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Eliminação */}
      {idUtilizadorEliminar && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Confirmar Eliminação</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Tens a certeza de que desejas eliminar este utilizador? Todos os planos de treino, registos de dieta, biofeedback e check-ins associados serão eliminados permanentemente.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIdUtilizadorEliminar(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminacao}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-red-600/20"
              >
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
