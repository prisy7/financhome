import React from 'react';
import { Tag, ShoppingCart, Trash2, Plus } from 'lucide-react';
import { OrcamentoData } from '../types';
import { fmt, unfmt, maskMoney } from '../utils';
import { CurrencyInput } from './CurrencyInput';

interface TabMercadoProps {
    data: OrcamentoData | null;
    setData: (data: OrcamentoData) => void;
    saveData: (data: OrcamentoData) => void;
    onAdd?: () => void;
}

export function TabMercado({ data, setData, saveData, onAdd }: TabMercadoProps) {
    if (!data) return null;

    const { metaSemanal, gastosReais, overflowAnterior, totalEstouradoMesAnterior } = data.mercado;
    const totalPrevisto = metaSemanal * gastosReais.length;
    const totalReal = gastosReais.reduce((a, b) => a + b, 0);
    const totalExtraAcumulado = (overflowAnterior || 0) + (totalReal - totalPrevisto);
    const saldo = (metaSemanal * gastosReais.length) - totalReal - (overflowAnterior || 0);

    const ranges = ["Dia 01 a 07", "Dia 08 a 14", "Dia 15 a 21", "Dia 22 a 28", "Dia 29 a 31"];

    // Calcula as metas dinâmicas
    const dynamicMetas: number[] = [];
    let runningExcess = overflowAnterior || 0;
    
    for (let i = 0; i < gastosReais.length; i++) {
        const remainingWeeks = gastosReais.length - i;
        const reduction = runningExcess / remainingWeeks;
        const currentMeta = metaSemanal - reduction;
        dynamicMetas.push(currentMeta);
        
        // Atualiza o excesso para a próxima iteração
        runningExcess += (gastosReais[i] - metaSemanal);
    }

    React.useEffect(() => {
        if (gastosReais.length > 5) {
            const newData = { ...data };
            newData.mercado.gastosReais = newData.mercado.gastosReais.slice(0, 5);                
            setData(newData);
            saveData(newData);
        }
    }, [gastosReais.length, data, setData, saveData]);

    const updateMetaSemanal = (meta: number) => {
        const newData = { ...data };
        newData.mercado.metaSemanal = meta;
        const mItem = newData.variaveis.find(i => i.id === 19);
        if (mItem) mItem.v = meta * newData.mercado.gastosReais.length;
        setData(newData);
        saveData(newData);
    };

    const updateGastoReal = (idx: number, val: number) => {
        const newData = { ...data };
        newData.mercado.gastosReais[idx] = val;
        setData(newData);
        saveData(newData);
    };

    return (
        <div className="fade-in mb-10 space-y-4 md:space-y-6">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm shrink-0">
                        <Tag size={24} />
                    </div>
                    <div>
                        <h2 className="text-base md:text-lg font-black text-slate-800 uppercase tracking-widest italic">Supermercado</h2>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Controle de gastos semanais</p>
                    </div>
                </div>

                {overflowAnterior && overflowAnterior > 0 && (
                    <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 p-3 px-5 rounded-2xl animate-pulse">
                        <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                        <p className="text-[10px] md:text-xs font-black text-rose-600 uppercase tracking-widest">
                            Estourou {fmt(overflowAnterior)} no mês anterior
                        </p>
                    </div>
                )}
            </div>

            <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 md:gap-8">
                <div className="flex flex-col md:flex-row gap-4 md:gap-8 w-full md:w-auto">
                    <div>
                        <label className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-400 block mb-2">
                            Meta Base Semanal (R$)
                        </label>
                        <div className="flex items-center gap-4">
                            <CurrencyInput 
                                inputMode="decimal"
                                className="bg-slate-50 border border-slate-100 p-2.5 md:p-3 rounded-xl text-center text-sm font-black w-32 md:w-36 focus:ring-4 focus:ring-orange-50 outline-none text-slate-800 transition-all font-sans" 
                                value={metaSemanal} 
                                onChangeValue={updateMetaSemanal} 
                            />
                        </div>
                        <p className="text-xs md:text-sm font-black text-slate-400 mt-3 md:mt-4 uppercase tracking-widest leading-none">Previsto Líquido: <span className="text-slate-900">{fmt(totalPrevisto - (overflowAnterior || 0))}</span></p>
                    </div>
                    <div className="flex flex-col justify-center gap-2 md:gap-3 md:border-l border-slate-100 md:pl-8">
                        <button onClick={() => {
                            if (gastosReais.length >= 5) {
                                alert("O mês pode ter no máximo 5 semanas.");
                                return;
                            }
                            const newData = { ...data };
                            newData.mercado.gastosReais.push(0);
                            const mItem = newData.variaveis.find(i => i.id === 19);
                            if (mItem) mItem.v = newData.mercado.metaSemanal * newData.mercado.gastosReais.length;
                            setData(newData);
                            saveData(newData);
                        }} className="text-xs md:text-sm font-black uppercase tracking-widest text-white bg-slate-800 hover:bg-slate-900 h-9 md:h-10 px-4 md:px-6 rounded-lg transition-all active:scale-95 flex items-center justify-center">
                            + Adicionar Semana
                        </button>
                        {gastosReais.length > 1 && (
                            <button onClick={() => {
                                if (!window.confirm("Deseja remover a última semana cadastrada?")) return;
                                const newData = { ...data };
                                newData.mercado.gastosReais.pop();
                                const mItem = newData.variaveis.find(i => i.id === 19);
                                if (mItem) mItem.v = newData.mercado.metaSemanal * newData.mercado.gastosReais.length;
                                setData(newData);
                                saveData(newData);
                            }} className="text-xs md:text-sm font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 px-4 py-1.5 md:px-6 md:py-2 rounded-lg transition-all text-center">
                                - Remover Semana
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="text-center md:text-right bg-slate-50 p-4 px-6 md:p-5 md:px-8 rounded-2xl border border-slate-100 w-full md:w-auto">
                    <p className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest mb-1">SALDO DO MÊS</p>
                    <p className={`text-lg md:text-xl font-black tracking-tight leading-none ${saldo >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{fmt(saldo)}</p>
                    <p className="text-xs md:text-sm font-black text-slate-300 uppercase tracking-widest mt-2 md:mt-2">Gasto Real: <span className="text-slate-500 font-black">{fmt(totalReal)}</span></p>
                </div>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Left: Weekly Cards */}
                <div className="w-full lg:w-[440px] space-y-4 shrink-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {gastosReais.map((gasto, i) => {
                            const currentMeta = dynamicMetas[i];
                            const diff = currentMeta - gasto;
                            const isNeg = diff < 0;
                            return (
                                <div key={i} className={`bg-white border ${isNeg ? 'border-rose-200 bg-rose-50/10' : 'border-slate-100'} p-3 rounded-xl shadow-sm transition-all group`}>
                                    <div className="mb-2 flex items-center justify-between">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Semana {i + 1}</p>
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{ranges[i] || ''}</p>
                                    </div>
                                    
                                    <div className="mb-2">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Meta:</span>
                                            <span className={`text-[13px] font-black ${currentMeta < metaSemanal ? 'text-rose-500' : 'text-slate-700'}`}>
                                                {fmt(currentMeta)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-50 p-2 rounded-lg mb-2">
                                        <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1 block">Gasto Real</label>
                                        <CurrencyInput 
                                            inputMode="decimal"
                                            value={gasto} 
                                            onChangeValue={(val) => updateGastoReal(i, val)}
                                            className="w-full bg-white border border-slate-200 rounded-md py-1 text-center text-[12.5px] md:text-[13.5px] font-black outline-none text-slate-800 transition-all font-sans" 
                                        />
                                    </div>
                                    
                                    <div className={`text-center py-1 rounded-md text-[11px] font-black uppercase tracking-widest border transition-all ${isNeg ? 'bg-rose-500 text-white border-rose-600 shadow-sm shadow-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                        {isNeg ? 'Estourou: ' : 'Sobrou: '} {fmt(Math.abs(diff))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Mercado Statement (Extrato de Mercado) */}
                <div className="flex-1 w-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center">
                                <ShoppingCart size={16} />
                            </div>
                            <div>
                                <h3 className="text-sm md:text-base font-black text-slate-800 uppercase tracking-widest italic">Extrato de Compras Mercado</h3>
                                <p className="text-[11px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Histórico Detalhado</p>
                            </div>
                        </div>

                        <button 
                            onClick={onAdd}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95 shadow-md shadow-slate-100"
                        >
                            <Plus size={12} strokeWidth={4} /> Lançar Compra
                        </button>
                    </div>

                    <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {data.gastosMesHistorico?.filter(i => (i as any).isMercado).length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Nenhum registro.</p>
                            </div>
                        ) : (
                            data.gastosMesHistorico?.filter(i => (i as any).isMercado)
                                .sort((a, b) => ((b as any).timestamp || 0) - ((a as any).timestamp || 0))
                                .map((item, idx) => (
                                    <div key={item.id} className="px-3 py-2 md:px-4 md:py-2.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 border border-slate-100/50">
                                                <span className="text-[11px] leading-none">{item.vencimento || '--'}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[12.5px] md:text-[13.5px] text-slate-700 uppercase tracking-tight leading-tight mb-1">{item.d}</p>
                                                <span className="px-1.5 py-0.5 rounded-[3px] bg-indigo-50 text-indigo-500 text-[10px] md:text-[11px] uppercase tracking-widest">
                                                    {(item as any).semana ? `S${(item as any).semana}` : 'Merc'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="text-[12.5px] md:text-[13.5px] text-slate-800 tracking-tight">{fmt(item.v)}</p>
                                            <button 
                                                onClick={() => {
                                                    if (window.confirm(`Deseja realmente excluir "${item.d}"?`)) {
                                                        const newData = { ...data };
                                                        newData.gastosMesHistorico = (newData.gastosMesHistorico || []).filter(i => i.id !== item.id);
                                                        const sem = (item as any).semana;
                                                        if (sem && newData.mercado.gastosReais[sem - 1] !== undefined) {
                                                            newData.mercado.gastosReais[sem - 1] = Math.max(0, newData.mercado.gastosReais[sem - 1] - item.v);
                                                        }
                                                        setData(newData);
                                                        saveData(newData);
                                                    }
                                                }}
                                                className="w-6 h-6 flex items-center justify-center text-slate-200 hover:text-rose-500 transition-all md:opacity-0 group-hover:opacity-100 bg-slate-50/50 rounded-md"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
