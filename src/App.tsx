import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Wallet, Plus, Download, RotateCcw, LogIn, LogOut, ChevronDown, Cloud, RefreshCw, Bell, BellOff, Users, Trash2, CheckCircle, Calendar, Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { defaultData, STORAGE_KEY_MONTHS } from './constants';
import { OrcamentoData, MonthInfo } from './types';
import { showToast, fmt, round2 } from './utils';
import { TabsContainer } from './components/TabsContainer';
import { TabDetalhes } from './components/TabDetalhes';
import { TabCalendario } from './components/TabCalendario';
import { TabExtrato } from './components/TabExtrato';
import { TabMercado } from './components/TabMercado';
import { TabProvisoes } from './components/TabProvisoes';
import { TabDividas } from './components/TabDividas';
import { TabEvolucao } from './components/TabEvolucao';
import { LancamentoModal } from './components/LancamentoModal';
import { ResetMonthModal } from './components/ResetMonthModal';
import { DeleteMonthModal } from './components/DeleteMonthModal';
import { RenameMonthModal } from './components/RenameMonthModal';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { getRedirectResult } from 'firebase/auth';
import { useMonthManager } from './hooks/useMonthManager';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useNotifications } from './hooks/useNotifications';
import { useAuth } from './hooks/useAuth';
import { useExportData } from './hooks/useExportData';

export default function App() {
  const [data, setData] = useState<OrcamentoData | null>(null);
  const [activeTab, setActiveTab] = useState<string>('detalhes');
  const [showNovoMesModal, setShowNovoMesModal] = useState(false);
  const [showLancamentoModal, setShowLancamentoModal] = useState(false);
  const [showCalendarioModal, setShowCalendarioModal] = useState(false);
  const [lancamentoModalType, setLancamentoModalType] = useState<'gastos' | 'fixas' | 'variaveis'>('gastos');
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [householdCode, setHouseholdCode] = useState(localStorage.getItem('orcamento_household_code') || '');
  const [novoMesInputs, setNovoMesInputs] = useState({ mes: 'Janeiro', ano: '2025' });
  const debounceTimeoutRef = useRef<any>(null);
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const hasPendingChangesRef = useRef(false);

  const { availableMonths, setAvailableMonths, currentMonthId, setCurrentMonthId, loadLocalInitialData, mudarMes } = useMonthManager();
  const { user, syncing: isReadingData, authResolved, saveMonthToFirestore, deleteMonthFromFirestore } = useFirebaseSync(currentMonthId, setCurrentMonthId, setAvailableMonths, setData, () => loadLocalInitialData(setData), hasPendingChangesRef);
  const syncing = isReadingData || isSavingLocal;
  const [notifPermission, setNotifPermission] = useState<string>(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const { requestPermission } = useNotifications(data, availableMonths, currentMonthId);
  const { login, logout, isLoggingIn } = useAuth();
  const { exportData } = useExportData();

  useEffect(() => {
    // Carregamento inicial aqui
    getRedirectResult(auth).catch(err => {
        console.error("Redirect redirect result error:", err);
    });

    // Teste de integridade da conexão (Sync Check)
    const testConnection = async () => {
      try {
        const { doc, getDocFromServer } = await import('firebase/firestore');
        await getDocFromServer(doc(db, '_connection_test', 'status'));
        console.log("🚀 Sincronização Firestore: OK");
      } catch (error: any) {
        if (error?.message?.includes('offline')) {
          console.warn("App operando em modo offline. As alterações serão sincronizadas assim que houver internet.");
        }
      }
    };
    testConnection();
  }, []);

  const handleRequestNotif = async () => {
    const granted = await requestPermission();
    if (granted) setNotifPermission('granted');
  };

  useEffect(() => {
    // Left empty since we removed the auto-show logic that depended on bypassLogin
  }, []);

  const flushSaveData = () => {
      if (hasPendingChangesRef.current && debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
          debounceTimeoutRef.current = null;
          
          if (currentMonthIdRef.current && dataRef.current && user) {
              const monthName = availableMonthsRef.current.find(m => m.id === currentMonthIdRef.current)?.name || 'Mês';
              // Save right away
              saveMonthToFirestore(currentMonthIdRef.current, monthName, dataRef.current).catch(err => console.error(err));
          }
          hasPendingChangesRef.current = false;
          setIsSavingLocal(false);
      }
  };

  const handleMudarMes = (monthId: string) => {
      flushSaveData();
      mudarMes(monthId, user, setData);
  };

  const dataRef = useRef(data);
  const currentMonthIdRef = useRef(currentMonthId);
  const availableMonthsRef = useRef(availableMonths);

  useEffect(() => {
    dataRef.current = data;
    currentMonthIdRef.current = currentMonthId;
    availableMonthsRef.current = availableMonths;
  }, [data, currentMonthId, availableMonths]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingChangesRef.current) {
        e.preventDefault();
        e.returnValue = 'As alterações ainda estão sendo salvas. Tem certeza que deseja sair?';
        return e.returnValue;
      }
    };
    
    // We also want to save synchronously if possible on visibility hide, but we can't reliably await Firebase setDoc there.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && debounceTimeoutRef.current && user) {
        // Trigger the save immediately without waiting for debounce if they background the app
        clearTimeout(debounceTimeoutRef.current);
        if (dataRef.current && currentMonthIdRef.current) {
             const monthName = availableMonthsRef.current.find(m => m.id === currentMonthIdRef.current)?.name || 'Mês';
             saveMonthToFirestore(currentMonthIdRef.current, monthName, dataRef.current);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [user]);

  if (!authResolved) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="flex flex-col items-center gap-4">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Carregando...</p>
              </div>
          </div>
      );
  }

  if (!user) {
      return (
          <div className="text-slate-800 antialiased min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
              <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-2xl max-w-md w-full border border-slate-100 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                      <Wallet size={32} />
                  </div>
                  <h1 className="text-xl font-black tracking-tight text-slate-800 mb-2">Controle Financeiro</h1>
                  <p className="text-sm text-slate-500 mb-8">
                      Faça login para salvar seus lançamentos na nuvem com segurança.
                  </p>

                  <div className="flex flex-col w-full gap-3">
                      <button 
                          onClick={login}
                          disabled={isLoggingIn}
                          className="w-full h-14 bg-blue-600 text-white rounded-xl font-black tracking-widest text-sm uppercase flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
                      >
                          {isLoggingIn ? (
                              <RefreshCw size={20} className="animate-spin" />
                          ) : (
                              <LogIn size={20} />
                          )}
                          {isLoggingIn ? 'Processando...' : 'Fazer Login com Google'}
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const saveData = (newData: OrcamentoData) => {
      // Pega o ID em tempo real pra garantir que evitamos a closure stale
      const activeMonthId = currentMonthIdRef.current;
      if (activeMonthId) {
          localStorage.setItem('orcamento_data_' + activeMonthId, JSON.stringify(newData));
          if (user) {
              const monthNameObj = availableMonthsRef.current.find(m => m.id === activeMonthId);
              const monthName = monthNameObj ? monthNameObj.name : 'Mês';
              hasPendingChangesRef.current = true;
              setIsSavingLocal(true);
              
              if (debounceTimeoutRef.current) {
                  clearTimeout(debounceTimeoutRef.current);
              }
              debounceTimeoutRef.current = setTimeout(async () => {
                  debounceTimeoutRef.current = null;
                  try {
                      // Usa novamente os refs para ter absoluta certeza dde onde vai gravar
                      const latestMonthId = currentMonthIdRef.current;
                      if (!latestMonthId) return;
                      const activeMonthName = availableMonthsRef.current.find(m => m.id === latestMonthId)?.name || 'Mês';
                      
                      await saveMonthToFirestore(latestMonthId, activeMonthName, dataRef.current || newData);
                  } finally {
                      if (!debounceTimeoutRef.current) {
                          hasPendingChangesRef.current = false;
                          setIsSavingLocal(false);
                      }
                  }
              }, 800);
          }
      }
  };

  const handleNovoLancamento = (lancamento: { tipo: 'receitas' | 'fixas' | 'variaveis' | 'mercado' | 'gastosMes', descricao: string, valor: number, pago: boolean, semana?: number, vencimento?: number, categoriaLabel?: string }) => {
      if (!data) return;
      const newData = { ...data };
      const id = crypto.randomUUID();
      
      if (lancamento.tipo === 'mercado') {
          // If it's market, we update the weekly total AND add to history for the statement
          if (lancamento.semana && lancamento.semana >= 1) {
              while (newData.mercado.gastosReais.length < lancamento.semana) {
                  newData.mercado.gastosReais.push(0);
              }
              newData.mercado.gastosReais[lancamento.semana - 1] = round2(newData.mercado.gastosReais[lancamento.semana - 1] + lancamento.valor);
          }

          // Add to history so it appears in Extrato and Details
          if (!newData.gastosMesHistorico) newData.gastosMesHistorico = [];
          newData.gastosMesHistorico.push({
              id,
              d: lancamento.descricao || `[Mercado] Semana ${lancamento.semana || 1}`,
              v: lancamento.valor,
              paid: true, // Market expenses from modal are always paid
              vencimento: lancamento.vencimento,
              isMercado: true,
              semana: lancamento.semana
          });
      } else if (lancamento.tipo === 'gastosMes') {
          if (!newData.gastosMes) newData.gastosMes = [];
          if (!newData.gastosMesHistorico) newData.gastosMesHistorico = [];
          
          // Add detailed record to historico
          newData.gastosMesHistorico.push({
              id,
              d: lancamento.descricao,
              v: lancamento.valor,
              paid: lancamento.pago,
              vencimento: lancamento.vencimento
          });

          // Sum in category
          const labelMatch = lancamento.categoriaLabel || 'Outros';
          const matchItemIndex = newData.gastosMes.findIndex((i: any) => i.d === labelMatch);
          if (matchItemIndex !== -1) {
              newData.gastosMes[matchItemIndex].v = round2(newData.gastosMes[matchItemIndex].v + lancamento.valor);
          } else {
              newData.gastosMes.push({ id, d: labelMatch, v: lancamento.valor, paid: false });
          }
      } else {
          if (!newData[lancamento.tipo]) newData[lancamento.tipo] = [];
          newData[lancamento.tipo].push({
              id,
              d: lancamento.descricao,
              v: lancamento.valor,
              paid: lancamento.pago,
              vencimento: lancamento.vencimento,
              categoria: lancamento.categoriaLabel
          });
      }

      setData(newData);
      saveData(newData);
      setShowLancamentoModal(false);
      showToast('Lançamento adicionado!', 'success');
  };

  const handleExportData = () => {
      exportData(data, availableMonths.find(m => m.id === currentMonthId)?.name || 'Mês Atual');
  };

  const resetData = () => {
       if(currentMonthId) {
           const reset = JSON.parse(JSON.stringify(defaultData));
           setData(reset);
           saveData(reset);
           showToast('Mês resetado com sucesso!', 'success');
       }
  };

  const deletarMes = async () => {
    if (!currentMonthId || availableMonths.length <= 1) {
        showToast('Não é possível apagar o único mês.', 'error');
        return;
    }

    const monthToDelete = currentMonthId;
    const newMonths = availableMonths.filter(m => m.id !== monthToDelete);
    
    setAvailableMonths(newMonths);
    localStorage.setItem(STORAGE_KEY_MONTHS, JSON.stringify(newMonths));
    localStorage.removeItem('orcamento_data_' + monthToDelete);

    if (user) {
        try {
            await deleteMonthFromFirestore(monthToDelete);
        } catch (e) {
            console.error(e);
            showToast("Aviso: Apagado apenas localmente", 'error');
        }
    }

    // Switch to first available month
    const nextMonth = newMonths[0].id;
    handleMudarMes(nextMonth);
    showToast('Mês apagado com sucesso!', 'success');
  };

  const criarNovoMes = () => {
      setShowNovoMesModal(true);
  };

  const handleRenameMonth = async (newName: string) => {
      if (!currentMonthId) return;
      const newMonths = availableMonths.map(m => 
          m.id === currentMonthId ? { ...m, name: newName } : m
      );
      setAvailableMonths(newMonths);
      localStorage.setItem(STORAGE_KEY_MONTHS, JSON.stringify(newMonths));
      
      if (user && data) {
          try {
              setIsSavingLocal(true);
              await saveMonthToFirestore(currentMonthId, newName, data);
          } catch (e) {
              console.error(e);
              showToast("Aviso: Renomeado apenas localmente", 'error');
          } finally {
              setIsSavingLocal(false);
          }
      }
      setShowRenameModal(false);
      showToast('Mês renomeado com sucesso!', 'success');
  };

  const handleCreateMonth = async () => {
      const name = `${novoMesInputs.mes} ${novoMesInputs.ano}`;
      const id = 'mes_' + crypto.randomUUID();
      const newMonths = [...availableMonths, { id, name }];
      setAvailableMonths(newMonths);
      localStorage.setItem(STORAGE_KEY_MONTHS, JSON.stringify(newMonths));
      
      let initialData = JSON.parse(JSON.stringify(defaultData));
      // Carry over some data from previous month if it exists
      if (data) {
          const totalReceitas = data.receitas.filter((i: any) => i.paid).reduce((acc: number, curr: any) => acc + curr.v, 0);
          const totalSaidas = [
              ...data.fixas.filter((i: any) => i.paid),
              ...data.variaveis.filter((i: any) => i.paid),
              ...(data.gastosMesHistorico || []).filter((i: any) => i.paid),
              ...(data.dividas || []).filter((i: any) => i.paid)
          ].reduce((acc: number, curr: any) => acc + curr.v, 0);
          const saldoLiquido = round2(totalReceitas - totalSaidas);

          initialData = JSON.parse(JSON.stringify(data));
          
          // Reset paid status and cleanup
          const structuralReceiptIds = [1, 2, 39];
          // Keep only structural items for income, reset their values (except saldo anterior)
          initialData.receitas = initialData.receitas
            .filter((i: any) => structuralReceiptIds.includes(i.id))
            .map((i: any) => {
                if (i.id !== 1) return { ...i, v: 0, paid: false };
                return { ...i, paid: true }; // Saldo anterior is always "paid" conceptually
            });

          initialData.fixas.forEach((i: any) => i.paid = false);
          initialData.variaveis.forEach((i: any) => { 
              i.paid = false; 
              // Keep values for reserves and the special market meta item 19
              if (i.id !== 19 && !i.isReserva) {
                  i.v = 0; 
              }
          });

          // Handle structural items for next month
          const carryOverItem = initialData.receitas.find((r: any) => r.id === 1);
          const deficitItem = initialData.variaveis.find((v: any) => v.d === 'Saldo devedor anterior');

          if (saldoLiquido > 0) {
              if (carryOverItem) {
                  carryOverItem.v = saldoLiquido;
                  carryOverItem.paid = true;
              } else {
                  initialData.receitas.push({ id: 1, d: 'Saldo anterior', v: saldoLiquido, paid: true });
              }
              // Remove deficit item if it exists
              initialData.variaveis = initialData.variaveis.filter((v: any) => v.d !== 'Saldo devedor anterior');
          } else if (saldoLiquido < 0) {
              if (carryOverItem) {
                  carryOverItem.v = 0;
                  carryOverItem.paid = true;
              }
              if (deficitItem) {
                  deficitItem.v = Math.abs(saldoLiquido);
                  deficitItem.paid = true;
              } else {
                  initialData.variaveis.push({ id: crypto.randomUUID(), d: 'Saldo devedor anterior', v: Math.abs(saldoLiquido), paid: true });
              }
          } else {
              if (carryOverItem) {
                  carryOverItem.v = 0;
                  carryOverItem.paid = true;
              }
          }
          
          // Clear monthly spending values but keep categories
          if (initialData.gastosMes) {
              initialData.gastosMes.forEach((i: any) => {
                  // Keep meta supermercado value if it's the fixed meta (id 19)
                  if (i.id !== 19) i.v = 0;
                  i.paid = false;
              });
          }
          initialData.gastosMesHistorico = [];
          
          if (initialData.cronograma) initialData.cronograma = [];

          if (initialData.dividas) {
              const activeDividas: any[] = [];
              for (let d of initialData.dividas) {
                  d.paid = false;
                  if (d.parcelaAtual < d.totalParcelas) {
                      d.parcelaAtual += 1;
                      activeDividas.push(d);
                  }
              }
              initialData.dividas = activeDividas;
          }

          initialData.mercado.gastosReais = [0, 0, 0, 0];
          
          // Pass carry over for supermarket (mercado)
          const oldMetaSemanal = data.mercado.metaSemanal;
          const oldGastosReais = data.mercado.gastosReais;
          const oldOverflow = data.mercado.overflowAnterior || 0;
          const oldTotalReal = round2(oldGastosReais.reduce((a: number, b: number) => a + b, 0));
          const oldTotalPrevisto = round2(oldMetaSemanal * oldGastosReais.length);
          
          const newOverflow = round2(oldOverflow + (oldTotalReal - oldTotalPrevisto));
          initialData.mercado.overflowAnterior = newOverflow > 0 ? newOverflow : 0;
          initialData.mercado.totalEstouradoMesAnterior = newOverflow > 0 ? newOverflow : 0;
      }

      localStorage.setItem('orcamento_data_' + id, JSON.stringify(initialData));
      if (user) {
          try {
              await saveMonthToFirestore(id, name, initialData);
          } catch (e) {
              console.error("Failed to save to firestore", e);
              showToast("Aviso: Salvo apenas localmente (sem permissão)", 'error');
          }
      }
      setShowNovoMesModal(false);
      handleMudarMes(id);
      showToast('Novo mês criado!', 'success');
  };

  // Backup handlers
  const downloadBackup = () => {
      const backupData: any = {};
      backupData[STORAGE_KEY_MONTHS] = availableMonths;
      availableMonths.forEach(month => {
          const key = 'orcamento_data_' + month.id;
          const stored = localStorage.getItem(key);
          if (stored) backupData[key] = stored;
      });
      const json = JSON.stringify(backupData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orcamento_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Backup baixado!", 'success');
  };

  const uploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const result = JSON.parse(event.target?.result as string);
              const newMonths = result[STORAGE_KEY_MONTHS];
              if (newMonths && Array.isArray(newMonths)) {
                  // Clear old
                  for(let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i);
                      if (key?.startsWith('orcamento_data_') || key === 'orcamento_last_month_id') {
                          localStorage.removeItem(key);
                      }
                  }
                  localStorage.setItem(STORAGE_KEY_MONTHS, JSON.stringify(newMonths));
                  newMonths.forEach(m => {
                      if (result['orcamento_data_' + m.id]) {
                          localStorage.setItem('orcamento_data_' + m.id, result['orcamento_data_' + m.id]);
                      }
                  });
                  setAvailableMonths(newMonths);
                  const last = newMonths[newMonths.length-1].id;
                  handleMudarMes(last);
                  showToast("Restauração concluída", 'success');
              }
          } catch(err) {
              showToast("Erro ao restaurar", 'error');
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  return (
    <div className="text-slate-800 antialiased min-h-screen flex flex-col bg-slate-50">
      
      {/* Modals and fixed elements go here, outside the scaled container */}
      <div id="toast" className="fixed z-50 bottom-10 left-1/2 -translate-x-1/2 translate-y-20 opacity-0 bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-2xl transition-all duration-500 flex items-center gap-3 pointer-events-none">
          <div id="toast-icon" className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50 text-blue-600"></div>
          <p id="toast-msg" className="text-sm font-black text-slate-800"></p>
      </div>

       <LancamentoModal 
        isOpen={showLancamentoModal} 
        onClose={() => setShowLancamentoModal(false)} 
        onSave={handleNovoLancamento} 
        mercado={data?.mercado}
        initialType={lancamentoModalType}
      />

      {showCalendarioModal && (
          <TabCalendario 
              data={data} 
              setData={setData} 
              saveData={saveData} 
              monthName={availableMonths.find(m => m.id === currentMonthId)?.name || ''} 
              onClose={() => setShowCalendarioModal(false)}
          />
      )}

      <ResetMonthModal 
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={resetData}
        monthName={availableMonths.find(m => m.id === currentMonthId)?.name || ''}
      />

      <DeleteMonthModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={deletarMes}
        monthName={availableMonths.find(m => m.id === currentMonthId)?.name || ''}
        monthId={currentMonthId || ''}
      />

      <RenameMonthModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        onConfirm={handleRenameMonth}
        currentName={availableMonths.find(m => m.id === currentMonthId)?.name || ''}
      />

      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-2xl max-w-sm w-full border border-slate-100">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <RefreshCw size={24} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800">Sincronização Familiar</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        Para compartilhar os dados entre dispositivos de pessoas diferentes, use o mesmo código abaixo em todos os aparelhos.
                    </p>
                </div>
                
                <div className="space-y-4 mb-8">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1.5 block">Código da Família</label>
                        <input 
                            type="text" 
                            placeholder="Ex: familiaLemos2025"
                            value={householdCode}
                            onChange={(e) => setHouseholdCode(e.target.value)}
                            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                        />
                    </div>
                    
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100/50">
                        <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                            <span className="font-black">DICA:</span> Deixe em branco para usar apenas o seu e-mail individual.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => setShowSettingsModal(false)} 
                        className="h-12 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={() => {
                            if (householdCode.trim()) {
                                localStorage.setItem('orcamento_household_code', householdCode.trim());
                            } else {
                                localStorage.removeItem('orcamento_household_code');
                            }
                            window.location.reload(); // Recarrega para aplicar o novo grupo
                        }} 
                        className="h-12 text-sm font-extrabold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-100 active:scale-95 uppercase tracking-wider"
                    >
                        Salvar e Sincronizar
                    </button>
                </div>
            </div>
        </div>
      )}

      {showNovoMesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full border border-slate-100">
                <div className="text-center mb-4">
                    <h3 className="text-base font-bold text-slate-800">Adicionar Novo Mês</h3>
                    <p className="text-xs text-slate-500 mt-1">Escolha o mês e o ano.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <select value={novoMesInputs.mes} onChange={e => setNovoMesInputs({...novoMesInputs, mes: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2 font-semibold text-slate-700 text-sm outline-none">
                            {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <input type="number" value={novoMesInputs.ano} onChange={e => setNovoMesInputs({...novoMesInputs, ano: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2 text-center font-semibold text-slate-700 text-sm outline-none" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setShowNovoMesModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">Cancelar</button>
                    <button onClick={handleCreateMonth} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">Criar</button>
                </div>
            </div>
        </div>
      )}

      {/* Content wrapper */}
      <div className="w-full flex-grow flex flex-col">
          <header className="bg-slate-50 border-none sticky top-0 z-30 pt-2 pb-1">
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-10">
              <div className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2.2rem] border border-white h-auto md:h-[4.5rem] flex flex-col md:flex-row justify-between items-center py-3 md:py-0 px-4 md:px-10 shadow-xl shadow-slate-200/20 gap-3 md:gap-0">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <div className="flex items-center gap-4 md:gap-5">
                        <div className="bg-blue-600 text-white p-2.5 md:p-3 rounded-xl md:rounded-2xl shadow-sm">
                            <Wallet size={20} />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-[11px] md:text-sm font-black text-slate-800 tracking-tight leading-none">Finanças</h1>
                            <div className="flex items-center gap-2 md:gap-3 mt-1.5 md:mt-2 leading-none">
                                <div className="relative group/select">
                                    <select 
                                        value={currentMonthId}
                                        onChange={(e) => handleMudarMes(e.target.value)}
                                        className="text-[10px] md:text-[11px] font-black uppercase tracking-widest bg-slate-50 border border-slate-100 rounded-lg md:rounded-xl py-1.5 md:py-2 pl-3 md:pl-4 pr-10 md:pr-12 text-blue-600 cursor-pointer outline-none appearance-none hover:bg-blue-50/50 transition-all shadow-sm"
                                        disabled={syncing}
                                    >
                                        {availableMonths.map(m => (
                                            <option key={m.id} value={m.id}>{m.name} ({m.id.slice(-4).toUpperCase()})</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400">
                                        <ChevronDown size={10} />
                                    </div>
                                </div>

                                <button 
                                    onClick={criarNovoMes}
                                    disabled={syncing}
                                    className="flex w-8 h-8 items-center justify-center bg-blue-50 text-blue-600 rounded-xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90"
                                    title="Adicionar Novo Mês"
                                >
                                    <Plus size={14} />
                                </button>

                                <button 
                                    onClick={() => setShowRenameModal(true)}
                                    disabled={syncing}
                                    className="flex w-8 h-8 items-center justify-center bg-amber-50 text-amber-500 rounded-xl border border-amber-100 hover:bg-amber-500 hover:text-white transition-all shadow-sm active:scale-90"
                                    title="Renomear Mês"
                                >
                                    <Edit2 size={13} />
                                </button>

                                <button 
                                    onClick={() => setShowDeleteModal(true)}
                                    disabled={syncing}
                                    className="flex w-8 h-8 items-center justify-center bg-rose-50 text-rose-500 rounded-xl border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90"
                                    title="Apagar Mês Permanentemente"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="md:hidden flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full border border-slate-100">
                      <AnimatePresence mode="wait">
                        {syncing ? (
                          <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                        ) : (
                          <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </AnimatePresence>
                      <span className={`text-[8px] font-black uppercase tracking-tighter ${syncing ? 'text-blue-600' : 'text-emerald-600'}`}>
                        {syncing ? 'Sinc' : 'Ativa'}
                      </span>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center justify-center md:justify-end gap-2 md:gap-3 w-full md:w-auto">
                        {/* Sync Status Indicator (Desktop Only) */}
                        <div className="hidden md:flex items-center mr-3">
                          <div className="flex h-10 items-center gap-2 md:gap-3 px-3 md:px-4 bg-slate-50 rounded-full border border-slate-100">
                          <button 
                             onClick={async () => {
                                 if (data && currentMonthId) {
                                     const monthName = availableMonths.find(m => m.id === currentMonthId)?.name || 'Mês';
                                     hasPendingChangesRef.current = true;
                                     setIsSavingLocal(true);
                                     try {
                                         await saveMonthToFirestore(currentMonthId, monthName, data);
                                         showToast('Sincronizado com sucesso!', 'success');
                                     } finally {
                                         hasPendingChangesRef.current = false;
                                         setIsSavingLocal(false);
                                     }
                                 }
                             }}
                             className="hover:text-blue-600 transition p-0.5"
                             title="Sincronizar Agora"
                          >
                             <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-blue-500' : 'text-slate-400'}`} />
                          </button>
                       <AnimatePresence mode="wait">
                        {syncing ? (
                          <motion.div
                            key="syncing"
                            initial={{ opacity: 0, x: 5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -5 }}
                            className="flex items-center gap-1.5"
                          >
                            <Cloud className="w-4 h-4 text-blue-500 animate-pulse" />
                            <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Aguarde...</span>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="synced"
                            initial={{ opacity: 0, x: 5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -5 }}
                            className="flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">Salvo</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                    <button 
                      onClick={() => {
                        setLancamentoModalType('gastos');
                        setShowLancamentoModal(true);
                      }} 
                      disabled={syncing} 
                      className="flex h-10 items-center gap-2 px-3 md:px-6 text-[10px] font-black uppercase tracking-widest text-white bg-emerald-500 rounded-xl md:rounded-2xl hover:bg-emerald-600 transition shadow-lg shadow-emerald-100 active:scale-95 border border-emerald-400 italic"
                      title="Lançar Gastos"
                    >
                        <Plus size={18} strokeWidth={3} /> <span className="hidden md:inline">LANÇAR</span>
                    </button>
                    <div className="h-6 w-px bg-slate-100 mx-1 hidden md:block"></div>
                    
                    <div className="flex items-center gap-2 md:gap-3">
                        <button 
                            onClick={() => setShowCalendarioModal(true)}
                            className="flex h-10 items-center gap-2 px-3 md:px-5 bg-indigo-600 text-white rounded-xl md:rounded-2xl transition-all hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-200 border border-indigo-500"
                            title="Ver Calendário de Vencimentos"
                        >
                            <Calendar size={18} strokeWidth={3} />
                            <span className="hidden md:block text-[10px] font-black uppercase tracking-widest italic">Calendário</span>
                        </button>

                        <button 
                        onClick={handleRequestNotif}
                        className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl md:rounded-2xl transition border ${notifPermission === 'granted' ? 'text-emerald-500 bg-emerald-50 border-emerald-100' : 'text-slate-400 bg-slate-50 border-slate-100 hover:text-blue-500'}`}
                        title={notifPermission === 'granted' ? "Notificações Ativas" : "Ativar Lembretes de Vencimento"}
                        >
                            {notifPermission === 'granted' ? <Bell size={16} /> : <BellOff size={16} />}
                        </button>

                        <div className="flex items-center gap-2 md:gap-3">
                            {user?.email && (
                                <span className="hidden lg:block text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-40 mr-1 select-none pointer-events-none">
                                    {user.email}
                                </span>
                            )}
                            {user ? (
                                <button onClick={logout} disabled={syncing || isLoggingIn} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-slate-400 hover:text-rose-500 bg-slate-50 rounded-xl md:rounded-2xl transition border border-slate-100" title="Sair da Conta">
                                    <LogOut size={16} />
                                </button>
                            ) : (
                                <button onClick={login} disabled={syncing || isLoggingIn} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-blue-400 hover:text-blue-600 bg-blue-50 rounded-xl md:rounded-2xl transition border border-blue-100" title="Entrar com Google">
                                    {isLoggingIn ? <RefreshCw size={16} className="animate-spin" /> : <LogIn size={16} />}
                                </button>
                            )}
                        </div>
                        
                        <button onClick={handleExportData} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-slate-400 hover:text-blue-500 bg-slate-50 rounded-xl md:rounded-2xl transition border border-slate-100">
                            <Download size={16} />
                        </button>

                        <button 
                        onClick={() => setShowSettingsModal(true)}
                        className={`relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl md:rounded-2xl transition border ${
                            householdCode 
                            ? 'text-blue-600 bg-blue-50 border-blue-200 ring-2 ring-blue-100/50' 
                            : 'text-slate-400 bg-slate-50 border-slate-100 hover:border-blue-200'
                        }`}
                        title="Configurações de Sincronização Familiar"
                        >
                            <Users size={16} />
                            {householdCode && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 border-2 border-white rounded-full"></span>
                            )}
                            {(!householdCode || !user) && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>
                            )}
                        </button>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </header>

          <main className="flex-grow p-4 sm:p-5 lg:p-10 pt-20 md:pt-10 max-w-[1550px] mx-auto w-full space-y-4">
            <TabsContainer activeTab={activeTab} setActiveTab={setActiveTab}>
                {activeTab === 'detalhes' && (
                    <TabDetalhes 
                    data={data} 
                    setData={setData} 
                    saveData={saveData} 
                    monthName={availableMonths.find(m => m.id === currentMonthId)?.name || ''} 
                    onAdd={(type) => {
                        setLancamentoModalType(type);
                        setShowLancamentoModal(true);
                    }}
                    />
                )}
                {activeTab === 'extrato' && (
                    <TabExtrato 
                    data={data} 
                    setData={setData} 
                    saveData={saveData} 
                    monthName={availableMonths.find(m => m.id === currentMonthId)?.name || ''} 
                    />
                )}
                {activeTab === 'mercado' && (
                    <TabMercado 
                        data={data} 
                        setData={setData} 
                        saveData={saveData} 
                        monthName={availableMonths.find(m => m.id === currentMonthId)?.name || ''} 
                        onAdd={() => {
                            setLancamentoModalType('gastos');
                            setShowLancamentoModal(true);
                        }}
                    />
                )}
                {activeTab === 'provisoes' && <TabProvisoes data={data} setData={setData} saveData={saveData} />}
                {activeTab === 'dividas' && <TabDividas data={data} setData={setData} saveData={saveData} />}
                {activeTab === 'evolucao' && <TabEvolucao availableMonths={availableMonths} />}
            </TabsContainer>
          </main>

          <footer className="bg-white border-t border-slate-200 py-6 mt-8">
            <div className="text-center text-xs text-slate-400">
                <p>Controle Financeiro Pessoal &copy; {new Date().getFullYear()}</p>
                <p className="mt-1">Dados salvos localmente no seu navegador.</p>
            </div>
          </footer>

          {/* FAB Mobile */}
          <button 
            onClick={() => {
              setLancamentoModalType('gastos');
              setShowLancamentoModal(true);
            }} 
            disabled={syncing}
            className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 text-white rounded-2xl shadow-2xl flex items-center justify-center z-40 active:scale-95 transition-transform border-b-4 border-emerald-800"
          >
            <Plus size={28} />
          </button>
      </div>
{/* End of content wrapper */}
    </div>
  );
}
