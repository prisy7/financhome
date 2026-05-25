import React, { useState } from 'react';
import { Item, OrcamentoData } from '../types';
import { showToast, unfmt, fmt, maskMoney } from '../utils';
import { Info, Plus, PlusCircle, Trash2, CheckCircle2, Circle, AlertCircle, CreditCard, Calendar } from 'lucide-react';
import { CurrencyInput } from './CurrencyInput';

interface TabDividasProps {
    data: OrcamentoData | null;
    setData: (data: OrcamentoData) => void;
    saveData: (data: OrcamentoData) => void;
}

export function TabDividas({ data, setData, saveData }: TabDividasProps) {
    const [desc, setDesc] = useState('');
    const [valor, setValor] = useState('');
    const [parcelas, setParcelas] = useState(10);
    const [parcelaAtual, setParcelaAtual] = useState(1);
    const [vencimento, setVencimento] = useState('');

    if (!data) return null;

    const addDivida = () => {
        const descTrimmed = desc.trim() || 'Nova Dívida';
        const v = unfmt(valor);
        if (v <= 0) return showToast('Valor deve ser maior que zero.', 'error');
        if (parcelas < 1 || parcelaAtual < 1 || parcelaAtual > parcelas) return showToast('Dados de parcelas inválidos.', 'error');

        let dayValue: number | undefined = undefined;
        if (vencimento) {
            const dateObj = new Date(vencimento + 'T00:00:00');
            dayValue = dateObj.getDate();
        }

        const newData = { ...data };
        if (!newData.dividas) newData.dividas = [];
        newData.dividas.push({
            id: crypto.randomUUID(),
            d: descTrimmed,
            v: v,
            paid: false,
            totalParcelas: parcelas,
            parcelaAtual: parcelaAtual,
            vencimento: dayValue
        });

        setData(newData);
        saveData(newData);
        showToast('Dívida adicionada!', 'success');
        setDesc('');
        setValor('');
        setVencimento('');
    };

    const togglePaid = (id: string | number) => {
        const newData = { ...data };
        const item = newData.dividas.find(d => d.id === id);
        if (item) {
            item.paid = !item.paid;
            setData(newData);
            saveData(newData);
        }
    };

    const deleteItem = (id: string | number) => {
        if (!confirm('Deseja excluir esta dívida definitivamente?')) return;
        const newData = { ...data };
        newData.dividas = newData.dividas.filter(d => d.id !== id);
        setData(newData);
        saveData(newData);
    };

    const dividas = (data.dividas || []).slice().sort((a, b) => {
        // Priority 1: Unpaid first
        if (a.paid !== b.paid) return a.paid ? 1 : -1;
        
        // Priority 2: Due date (ascending)
        const dayA = a.vencimento || 999;
        const dayB = b.vencimento || 999;
        
        if (dayA !== dayB) return dayA - dayB;
        
        // Priority 3: ID (stable)
        return a.id.toString().localeCompare(b.id.toString());
    });
    const totalMes = dividas.reduce((acc, item) => acc + item.v, 0);

    return (
        <div className="fade-in space-y-4 mb-10">
            <div className="bg-[#FFF8F8] p-4 md:p-6 rounded-2xl border border-rose-100/50 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                <div className="flex items-center gap-3 md:gap-5">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center border border-rose-50 shadow-sm">
                        <CreditCard size={20} md:size={28} className="text-rose-400" />
                    </div>
                    <div>
                        <h3 className="text-base md:text-base font-black text-slate-800 uppercase tracking-widest italic">Dívidas & Parcelas</h3>
                        <p className="text-sm font-black text-rose-300 uppercase tracking-widest leading-none">Controle o que ainda falta pagar</p>
                    </div>
                </div>
                <div className="w-full md:w-auto text-center md:text-right bg-white p-2.5 px-4 md:p-3 md:px-6 rounded-xl md:rounded-2xl border border-rose-50 shadow-sm">
                    <p className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest">TOTAL NO MÊS</p>
                    <p className="text-base md:text-base font-black text-rose-500 tracking-tight leading-none">{fmt(totalMes)}</p>
                </div>
            </div>

            <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 md:gap-3 mb-6">
                    <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg text-blue-500">
                        <Plus size={14} md:size={16} />
                    </div>
                    <h4 className="text-sm md:text-base font-black text-slate-500 uppercase tracking-widest">Cadastrar Nova Dívida</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5 items-end">
                    <div className="md:col-span-5">
                        <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2">Descrição</label>
                        <input type="text" value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-slate-50 border border-slate-100 h-10 md:h-12 px-3 md:px-4 rounded-xl text-sm md:text-base text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all" placeholder="Ex: Empréstimo, Cartão, etc" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2 text-center">Vencimento</label>
                        <input 
                            type="date" 
                            value={vencimento} 
                            onChange={e => {
                                setVencimento(e.target.value);
                            }} 
                            className="w-full bg-slate-50 border border-slate-100 h-10 md:h-12 px-2 md:px-3 rounded-xl text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all" 
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2 text-right">Valor Parcela</label>
                        <CurrencyInput inputMode="decimal" value={valor} onChangeValue={(val) => setValor(val.toString())} className="w-full bg-slate-50 border border-slate-100 h-10 md:h-12 px-3 md:px-4 rounded-xl text-sm md:text-base font-black text-slate-700 text-right outline-none focus:ring-4 focus:ring-blue-100 transition-all" placeholder="R$ 0,00" />
                    </div>
                    <div className="md:col-span-3 flex gap-2 md:gap-3">
                        <div className="w-1/2">
                            <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2 text-center">Atual</label>
                            <input type="text" inputMode="numeric" min="1" value={parcelaAtual} onFocus={(e) => e.target.select()} onChange={e => setParcelaAtual(parseInt(e.target.value) || 1)} className="w-full bg-slate-50 border border-slate-100 h-10 md:h-12 px-2 rounded-xl text-sm md:text-base font-black text-center text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                        </div>
                        <div className="w-1/2">
                            <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2 text-center">Total</label>
                            <input type="text" inputMode="numeric" min="1" value={parcelas} onFocus={(e) => e.target.select()} onChange={e => setParcelas(parseInt(e.target.value) || 1)} className="w-full bg-slate-50 border border-slate-100 h-10 md:h-12 px-2 rounded-xl text-sm md:text-base font-black text-center text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                        </div>
                    </div>
                </div>
                <div className="mt-4 md:mt-6 flex justify-end">
                    <button onClick={addDivida} className="w-full md:w-auto h-11 md:h-12 px-10 text-xs md:text-sm font-black uppercase tracking-widest text-white bg-blue-500 rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-blue-100 active:scale-95 flex items-center justify-center gap-2">
                        <PlusCircle size={16} /> Adicionar
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 md:px-8 py-4 md:py-5 bg-slate-50/50 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="text-base md:text-base font-black text-slate-800 uppercase tracking-widest italic flex items-center gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-rose-400 rounded-full animate-pulse"></div>
                        Minhas Dívidas
                    </h3>
                </div>
                {dividas.length === 0 ? (
                    <div className="p-10 md:p-16 text-center">
                        <p className="text-[11px] md:text-xs font-black text-slate-300 uppercase tracking-widest italic">Nenhuma dívida para este mês.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {dividas.map((item) => (
                            <div key={item.id} className="p-4 md:p-6 px-5 md:px-10 flex flex-col sm:flex-row items-center justify-between hover:bg-slate-50/50 transition-all group">
                                <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto">
                                    <button 
                                        onClick={() => togglePaid(item.id)} 
                                        className={`flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-all ${item.paid ? 'bg-emerald-500 text-white border-none' : 'bg-white text-slate-200 border border-slate-100 hover:text-emerald-400'}`}
                                    >
                                        {item.paid ? <CheckCircle2 size={16} md:size={18} /> : <Circle size={16} md:size={18} />}
                                    </button>
                                    <div className="min-w-0 flex-grow">
                                        <p className={`text-[12.5px] md:text-[13.5px] tracking-tight leading-tight ${item.paid ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                            {item.d}
                                        </p>
                                        <div className="flex items-center gap-2 md:gap-3 mt-1 md:mt-1.5 flex-wrap">
                                            <div className="flex items-center gap-1.5 bg-rose-50 px-2 md:px-3 py-1 rounded-lg border border-rose-100">
                                                <Calendar size={10} md:size={12} className="text-rose-400" />
                                                <span className="text-[10px] md:text-[11px] text-rose-600 uppercase tracking-widest leading-none">
                                                    Parcela {item.parcelaAtual} de {item.totalParcelas}
                                                </span>
                                            </div>
                                            {item.vencimento && (
                                                <span className="text-[10px] md:text-[11px] text-slate-400 uppercase tracking-widest">
                                                    DIA {item.vencimento}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-3 md:gap-10 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                                    <div className="text-right">
                                        <p className={`text-[12.5px] md:text-[13.5px] tracking-tight ${item.paid ? 'text-emerald-400' : 'text-rose-500'}`}>{fmt(item.v)}</p>
                                        {item.totalParcelas && item.parcelaAtual && (
                                            <p className="text-[10px] md:text-xs text-slate-300 uppercase tracking-widest leading-none mt-1">
                                                Restante: {fmt((item.totalParcelas - item.parcelaAtual + (item.paid ? 0 : 1)) * item.v)}
                                            </p>
                                        )}
                                    </div>
                                    <button onClick={() => deleteItem(item.id)} className="p-2 md:p-4 text-slate-200 hover:text-rose-500 transition sm:opacity-0 group-hover:opacity-100">
                                        <Trash2 size={18} md:size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function PlusCircle2({ size }: { size: number }) {
    return <Plus size={size} />;
}

