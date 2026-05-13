import React, { useState } from 'react';
import { OrcamentoData } from '../types';
import { fmt, unfmt, showToast, maskMoney } from '../utils';
import { provisaoMetaData } from '../constants';
import { Info, HandCoins, X, Plus, Trash2, ArrowUpRight, ChevronDown } from 'lucide-react';
import { CurrencyInput } from './CurrencyInput';

interface TabProvisoesProps {
    data: OrcamentoData | null;
    setData: (data: OrcamentoData) => void;
    saveData: (data: OrcamentoData) => void;
}

export function TabProvisoes({ data, setData, saveData }: TabProvisoesProps) {
    const [modalInfo, setModalInfo] = useState<{ 
        open: boolean, 
        key: string, 
        title: string, 
        desc: string, 
        val: string,
        type: 'entrada' | 'saida' 
    }>({ 
        open: false, 
        key: '', 
        title: '', 
        desc: '', 
        val: '',
        type: 'saida'
    });

    const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

    const toggleExpand = (key: string) => {
        setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (!data) return null;

    const removerGasto = (key: string, id: string | number) => {
        const item = data.provisoes[key]?.gastos?.find(g => g.id === id);
        if (!window.confirm(`Excluir o resgate "${item?.d || ''}" de ${fmt(item?.v || 0)}?`)) return;

        const newData = { ...data };
        if (newData.provisoes[key]?.gastos) {
            newData.provisoes[key].gastos = newData.provisoes[key].gastos.filter(g => g.id !== id);
            setData(newData);
            saveData(newData);
            showToast("Gasto removido!", 'success');
        }
    };

    const updateEntrada = (key: string, typeList: 'fixas' | 'variaveis', entradaId: number | undefined, val: number) => {
        const newData = { ...data };
        
        if (entradaId) {
            // Search in both lists to be safe, but favor where it was intended
            let item = newData.fixas.find(i => i.id === entradaId);
            if (!item) item = newData.variaveis.find(i => i.id === entradaId);
            
            if (item) {
                item.v = val;
            } else {
                // If not found, create it in variables
                newData.variaveis.push({ id: entradaId, d: `Reserva: ${key}`, v: val, paid: false });
            }
        } else {
            if (!newData.provisoes[key]) {
                const meta = provisaoMetaData.find(p => p.key === key);
                newData.provisoes[key] = { 
                    title: meta?.title || key, 
                    meta: meta?.meta || 'Reserva R$ 0,00', 
                    saldoInicial: 0, 
                    gastos: [] 
                };
            }
            if (newData.provisoes[key]) {
                (newData.provisoes[key] as any).entradaManual = val;
            }
        }
        
        setData(newData);
        saveData(newData);
    };

    const updateProvisionField = (key: string, field: 'title' | 'meta' | 'prazo', val: string) => {
        const newData = { ...data };
        if (!newData.provisoes[key]) {
            const meta = provisaoMetaData.find(p => p.key === key);
            newData.provisoes[key] = { 
                title: meta?.title || key, 
                meta: meta?.meta || 'Reserva R$ 0,00', 
                saldoInicial: 0, 
                gastos: [] 
            };
        }
        (newData.provisoes[key] as any)[field] = val;
        setData(newData);
        saveData(newData);
    };

    const updateProvisionNumeric = (key: string, field: 'objetivo', val: number) => {
        const newData = { ...data };
        if (!newData.provisoes[key]) {
            const meta = provisaoMetaData.find(p => p.key === key);
            newData.provisoes[key] = { 
                title: meta?.title || key, 
                meta: meta?.meta || 'Reserva R$ 0,00', 
                saldoInicial: 0, 
                gastos: [] 
            };
        }
        newData.provisoes[key][field] = val;
        setData(newData);
        saveData(newData);
    };

    const addProvision = () => {
        const key = `custom_${crypto.randomUUID()}`;
        const newData = { ...data };
        newData.provisoes[key] = {
            title: 'Nova Reserva',
            meta: 'Defina sua reserva',
            saldoInicial: 0,
            gastos: []
        };
        setData(newData);
        saveData(newData);
        showToast("Nova reserva adicionada!", 'success');
    };

    const removeProvision = (key: string) => {
        const title = data.provisoes[key]?.title || key;
        if (!window.confirm(`Deseja excluir a reserva "${title}" e todo o seu histórico?\nEsta ação não poderá ser desfeita.`)) return;

        const newData = { ...data };
        delete newData.provisoes[key];
        setData(newData);
        saveData(newData);
        showToast("Reserva excluída.", 'success');
    };

    const updateSaldoInicial = (key: string, val: number) => {
        const newData = { ...data };
        if (!newData.provisoes[key]) newData.provisoes[key] = { title: key, meta: '', saldoInicial: 0, gastos: [] };
        newData.provisoes[key].saldoInicial = val;
        setData(newData);
        saveData(newData);
    };

    const salvarLancamento = () => {
        const valor = unfmt(modalInfo.val);
        if (valor <= 0) return showToast("Valor inválido", 'error');

        if (modalInfo.type === 'saida') {
            const descTrimmed = modalInfo.desc.trim();
            const finalDesc = descTrimmed || 'Gasto sem descrição';
            const newData = { ...data };
            if (!newData.provisoes[modalInfo.key]) newData.provisoes[modalInfo.key] = { saldoInicial: 0, gastos: [] };
            if (!newData.provisoes[modalInfo.key].gastos) newData.provisoes[modalInfo.key].gastos = [];
            
            newData.provisoes[modalInfo.key].gastos.push({ id: crypto.randomUUID(), d: finalDesc, v: valor });
            setData(newData);
            saveData(newData);
            showToast("Saída registrada!", 'success');
        } else {
            // Depósito
            const metaLegacy = provisaoMetaData.find(p => p.key === modalInfo.key);
            const typeList = (metaLegacy?.typeList === 'fixas' ? 'fixas' : 'variaveis') as 'fixas' | 'variaveis';
            updateEntrada(modalInfo.key, typeList, metaLegacy?.entradaId, valor);
            showToast("Depósito atualizado!", 'success');
        }

        setModalInfo({ open: false, key: '', title: '', desc: '', val: '', type: 'saida' });
    };

    const provisionKeys = Object.keys(data.provisoes);

    return (
        <div className="fade-in mb-10">
            {/* Header com info e botão */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm shrink-0">
                        <HandCoins size={24} />
                    </div>
                    <div>
                        <h2 className="text-base md:text-lg font-black text-slate-800 uppercase tracking-widest italic">Reservas</h2>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Gerencie seus fundos de longo prazo</p>
                    </div>
                </div>
                <button 
                    onClick={addProvision} 
                    className="w-full md:w-auto h-12 px-8 bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                >
                    <Plus size={20} /> Nova Reserva
                </button>
            </div>

            {/* Lista de Reservas */}
            <div className="flex flex-col gap-4 w-full md:w-[90%] mx-auto">
                {provisionKeys.map(key => {
                    const prov = data.provisoes[key];
                    const metaLegacy = provisaoMetaData.find(p => p.key === key);
                    const titleRaw = prov.title || metaLegacy?.title || key;
                    const title = titleRaw.replace(/^(?:nova\s+)?(?:provisão|reserva|meta)(?:\s+de)?\s+/i, '');
                    
                    let metaStrRaw = prov.meta || metaLegacy?.meta || '';
                    const metaStr = metaStrRaw.replace(/^(?:nova\s+)?(?:provisão|reserva|meta)(?:\s+de)?\s+/i, '').trim();
                    
                    // Tenta extrair objetivo do texto se estiver zerado
                    let objetivo = prov.objetivo || 0;
                    if (objetivo === 0 && metaStr) {
                        const matchValue = metaStr.match(/R\$\s*([\d.,]+)/);
                        if (matchValue) {
                            objetivo = unfmt(matchValue[1]);
                        }
                    }

                    const prazo = prov.prazo || '';
                    const entradaId = prov.entradaId || metaLegacy?.entradaId;
                    const typeList = metaLegacy?.typeList || 'fixas';

                    const list = typeList === 'variaveis' ? data.variaveis : data.fixas;
                    const entradaItem = list.find(f => f.id === entradaId);
                    const entrada = entradaItem ? entradaItem.v : ((prov as any).entradaManual || 0);
                    
                    const saldoIni = prov.saldoInicial || 0;
                    const gastosArray = prov.gastos || [];
                    const totalGastos = gastosArray.reduce((sum, g) => sum + g.v, 0);
                    const saldoFinal = saldoIni + entrada - totalGastos;

                    // Se não tiver objetivo mas tem saldo, mostra 100% (cheio)
                    const percent = objetivo > 0 
                        ? Math.min(100, Math.max(0, (saldoFinal / objetivo) * 100)) 
                        : (saldoFinal > 0 ? 100 : 0);

                    return (
                        <div key={key} className="bg-white rounded-[2rem] border border-slate-100 flex flex-col transition-all hover:shadow-xl hover:shadow-slate-200/40 relative overflow-hidden group/card shadow-sm">
                            {/* Bg Design Element */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -mr-16 -mt-16 transition-all group-hover/card:bg-indigo-50/50 pointer-events-none z-0"></div>
                            
                            <div className="p-5 md:p-6 flex flex-col lg:flex-row gap-5 lg:gap-6 lg:items-center relative z-10 w-full">
                                {/* Title / Name */}
                                <div className="flex-grow min-w-0 lg:w-[22%] xl:w-1/4 shrink-0 pr-8 lg:pr-0">
                                    <input 
                                        className="text-lg md:text-2xl font-black text-slate-800 bg-transparent border-none outline-none w-full focus:ring-0 p-0 mb-1 leading-tight uppercase tracking-tight"
                                        value={title}
                                        onChange={(e) => updateProvisionField(key, 'title', e.target.value)}
                                        placeholder="Nome"
                                    />
                                    <div className="flex flex-wrap gap-1.5 h-4">
                                        {metaStr && (
                                            <span className="text-[10px] font-black text-indigo-500 bg-indigo-50/80 px-2 py-0.5 rounded-md uppercase tracking-widest leading-none whitespace-nowrap">{metaStr}</span>
                                        )}
                                        {prazo && (
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic leading-none">{prazo}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Progress & Balances */}
                                <div className="flex-grow flex flex-col lg:w-1/3 xl:w-[35%] shrink-0 gap-2">
                                    <div className="flex justify-between items-end mb-1">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none">Saldo Atual</span>
                                            <span className={`text-xl font-black tracking-tight mt-0.5 leading-none ${saldoFinal >= 0 ? 'text-indigo-600' : 'text-rose-500'}`}>
                                                {fmt(saldoFinal)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-0.5 leading-none">Sua Meta</span>
                                            <CurrencyInput 
                                                className="bg-transparent border-none text-right text-sm font-black text-slate-500 p-0 w-28 outline-none focus:text-indigo-600 mt-0.5 leading-none"
                                                value={objetivo}
                                                onChangeValue={(val) => updateProvisionNumeric(key, 'objetivo', val)}
                                            />
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 md:h-2.5 rounded-full overflow-hidden relative">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${percent >= 100 ? 'bg-emerald-400' : 'bg-indigo-500'}`}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between px-1">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${saldoFinal >= objetivo && objetivo > 0 ? 'text-emerald-500' : 'text-indigo-400'}`}>
                                            {objetivo > 0 ? (percent >= 100 ? 'Meta Atingida! 🎉' : `${percent.toFixed(0)}% concluído`) : 'S/ meta definida'}
                                        </span>
                                        {objetivo > 0 && saldoFinal < objetivo && (
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Faltam {fmt(objetivo - saldoFinal)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Saldo Inicial */}
                                <div className="flex flex-col lg:w-24 shrink-0">
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Saldo Inicial</span>
                                    <CurrencyInput 
                                        className="bg-slate-50 border border-slate-100 text-slate-600 text-right text-[11px] font-black px-2 py-1.5 w-full rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                                        value={saldoIni}
                                        onChangeValue={(val) => updateSaldoInicial(key, val)}
                                    />
                                </div>

                                {/* ACTION BUTTONS */}
                                <div className="flex gap-2 lg:w-[220px] shrink-0 mt-2 lg:mt-0">
                                    <button 
                                        onClick={() => setModalInfo({ open: true, key: key, title: title, desc: '', val: entrada.toString(), type: 'entrada' })}
                                        className="flex-1 h-11 bg-white text-slate-600 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 active:scale-95 border border-slate-200 shadow-sm shrink-0"
                                    >
                                        <Plus size={14} className="text-indigo-500" /> DEPOSITO
                                    </button>
                                    <button 
                                        onClick={() => setModalInfo({ open: true, key: key, title: title, desc: '', val: '', type: 'saida' })}
                                        className="flex-1 h-11 bg-white text-slate-600 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 active:scale-95 border border-slate-200 shadow-sm shrink-0"
                                    >
                                        <ArrowUpRight size={14} className="text-rose-500" /> RESGATE
                                    </button>
                                </div>

                                {/* HISTORY & DELETE */}
                                <div className="flex gap-2 mt-2 lg:mt-0 w-full lg:w-auto lg:shrink-0 ml-auto items-center justify-end">
                                    {totalGastos > 0 && expandedKeys[key] === undefined && (
                                        <span className="text-[10px] font-black text-rose-400 lg:hidden">-{fmt(totalGastos)} resgatado</span>
                                    )}
                                    <button 
                                        onClick={() => toggleExpand(key)}
                                        className="flex items-center justify-center lg:w-11 lg:h-11 h-10 w-10 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all ml-auto lg:ml-0"
                                        title="Extrato Detalhado"
                                    >
                                        <div className={`transition-transform duration-300 ${expandedKeys[key] ? 'rotate-180' : ''}`}>
                                            <ChevronDown size={18} />
                                        </div>
                                    </button>
                                    <button 
                                        onClick={() => removeProvision(key)}
                                        className="absolute top-5 right-5 lg:relative lg:top-0 lg:right-0 flex items-center justify-center lg:w-11 lg:h-11 h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                        title="Excluir Reserva"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* COLLAPSIBLE DETAILS */}
                            {expandedKeys[key] && (
                                <div className="border-t border-slate-100 bg-slate-50/50 p-5 md:p-6 w-full animate-in slide-in-from-top-2 duration-300">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Extrato Detalhado</h5>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                                        {gastosArray.length === 0 ? (
                                            <div className="py-6 text-center border border-dashed border-slate-200 rounded-2xl w-full">
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Nenhum resgate registrado</p>
                                            </div>
                                        ) : (
                                            gastosArray.map(g => (
                                                <div key={g.id} className="flex flex-wrap md:flex-nowrap items-center justify-between p-3 px-5 bg-white rounded-2xl hover:bg-slate-50 border border-slate-100 transition-all shrink-0">
                                                    <p className="text-[12.5px] md:text-[13.5px] text-slate-600 flex-grow pr-4 leading-tight tracking-tight">{g.d}</p>
                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <span className="text-[12.5px] md:text-[13.5px] text-rose-500 shrink-0 tracking-tight">-{fmt(g.v)}</span>
                                                        <button 
                                                            onClick={() => removerGasto(key, g.id)}
                                                            className="text-slate-300 hover:text-rose-500 transition-all shrink-0 h-8 w-8 flex items-center justify-center rounded-lg hover:bg-rose-50"
                                                            title="Remover Gasto"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                
                <div className="flex items-center justify-between bg-emerald-500 text-white rounded-2xl p-5 md:p-6 mt-4 shadow-lg shadow-emerald-200/50">
                    <span className="text-xs md:text-sm font-black uppercase tracking-widest">Saldo Total Acumulado</span>
                    <span className="text-xl md:text-2xl font-black tracking-tighter">
                        {fmt(provisionKeys.reduce((acc, key) => {
                            const prov = data.provisoes[key];
                            const metaLegacy = provisaoMetaData.find(p => p.key === key);
                            const entradaId = prov.entradaId || metaLegacy?.entradaId;
                            const typeList = metaLegacy?.typeList || 'fixas';
                            
                            const list = typeList === 'variaveis' ? data.variaveis : data.fixas;
                            const entradaItem = list.find(f => f.id === entradaId);
                            const entrada = entradaItem ? entradaItem.v : ((prov as any).entradaManual || 0);
                            
                            const saldoIni = prov.saldoInicial || 0;
                            const gastos = prov.gastos || [];
                            const totalGastos = gastos.reduce((a, g) => a + g.v, 0);
                            return acc + (saldoIni + entrada - totalGastos);
                        }, 0))}
                    </span>
                </div>
            </div>

            {/* Modal de Lançamento (Depósito ou Saída) */}
            {modalInfo.open && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-sm md:text-lg font-black text-slate-800 uppercase tracking-widest italic">
                                    {modalInfo.type === 'saida' ? 'Registrar Saída' : 'Ajustar Depósito'}
                                </h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{modalInfo.title}</p>
                            </div>
                            <button onClick={() => setModalInfo({...modalInfo, open: false})} className="text-slate-300 hover:text-slate-600 transition">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {modalInfo.type === 'saida' && (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição do Gasto</label>
                                    <input 
                                        type="text" 
                                        autoFocus
                                        value={modalInfo.desc} 
                                        onChange={e => setModalInfo({...modalInfo, desc: e.target.value})} 
                                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm font-bold text-slate-800 focus:ring-4 focus:ring-blue-100 outline-none transition-all" 
                                        placeholder="Ex: Viagem, Reforma..." 
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    {modalInfo.type === 'saida' ? 'Valor da Saída' : 'Valor Mensal do Depósito'}
                                </label>
                                <CurrencyInput 
                                    inputMode="decimal" 
                                    value={modalInfo.val} 
                                    onChangeValue={(val) => setModalInfo({...modalInfo, val: val.toString()})} 
                                    className={`w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-lg font-black text-right outline-none focus:ring-4 transition-all ${modalInfo.type === 'saida' ? 'text-rose-500 focus:ring-rose-100' : 'text-emerald-600 focus:ring-emerald-100'}`} 
                                    placeholder="R$ 0,00" 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-8">
                            <button 
                                onClick={() => setModalInfo({...modalInfo, open: false})} 
                                className="h-12 bg-slate-50 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={salvarLancamento} 
                                className={`h-12 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg ${modalInfo.type === 'saida' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-100' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100'}`}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
