import React, { useState, useEffect } from 'react';
import { Item, OrcamentoData } from '../types';
import { fmt, unfmt, maskMoney, formatFullDate, MONTH_MAP, round2, calcularSaldoReal } from '../utils';
import { provisaoMetaData } from '../constants';
import { PlusCircle, Pin, Shuffle, CircleCheck, Circle, Trash2, Wallet, Plus, Calendar, ChevronDown, ChevronUp, Tag, Check, X, ArrowUpCircle, ArrowDownCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { CurrencyInput } from './CurrencyInput';

interface TabDetalhesProps {
    data: OrcamentoData | null;
    setData: (data: OrcamentoData) => void;
    saveData: (data: OrcamentoData) => void;
    monthName?: string;
    onAdd?: (type: 'receitas' | 'gastos') => void;
}

export function TabDetalhes({ data, setData, saveData, monthName = '', onAdd }: TabDetalhesProps) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        receitas: !isMobile,
        fixas: !isMobile,
        variaveis: !isMobile,
        gastosMes: true
    });
    const [originalValue, setOriginalValue] = useState<number | null>(null);
    const [addModalType, setAddModalType] = useState<'fixas' | 'variaveis' | null>(null);
    const [addModalNome, setAddModalNome] = useState('');

    if (!data) return null;
    
    // Calculate manual contributions for reserves (those not linked to an item)
    const manualReserves = Object.keys(data.provisoes).map(key => {
        const prov = data.provisoes[key];
        const aporte = (prov as any).entradaManual || 0;
        if (aporte > 0) {
            return {
                id: `reserva_${key}`,
                d: `Aporte: ${prov.title || key}`,
                v: aporte,
                paid: true, // Manual reserves are treated as planned/paid commitments
                isReserva: true
            } as Item;
        }
        return null;
    }).filter((i): i is Item => i !== null);

    // Saldo Anterior is ID 1 in receitas
    const saldoAnteriorItem = data.receitas.find(i => i.id === 1 || i.id === '1');
    const saldoAnterior = saldoAnteriorItem?.v || 0;

    // Entradas (Only new income this month)
    const novasReceitasList = data.receitas.filter(i => i.id !== 1 && i.id !== '1');
    const totalReceitasNovasReal = round2(novasReceitasList.reduce((acc, curr) => acc + curr.v, 0)); 
    const totalReceitasNovasPrev = totalReceitasNovasReal; // No longer distinct prediction for new income

    // Resgates from reserves
    const resgatesReservaTotal = round2(Object.keys(data.provisoes).reduce((acc, key) => {
        const prov = data.provisoes[key];
        return acc + (prov.gastos || []).reduce((s, g) => s + g.v, 0);
    }, 0));

    const totalMercadoReal = round2(data.mercado.gastosReais.reduce((a, b) => a + (b || 0), 0));

    // Reservas (Aportes)
    const itemsReservaPagos = [
        ...data.fixas.filter(i => i.paid && provisaoMetaData.some(pm => pm.entradaId === i.id)),
        ...data.variaveis.filter(i => i.paid && (provisaoMetaData.some(pm => pm.entradaId === i.id) || [9, 12, 32, 33, 34].includes(i.id as number)))
    ];
    const totalReservasReal = round2(itemsReservaPagos.reduce((acc, curr) => acc + curr.v, 0) + manualReserves.reduce((acc, curr) => acc + curr.v, 0));

    // Saídas (Puras - common expenses)
    // Filter out market-related historico items if we are going to add totalMercadoReal separately to avoid double counting
    // OR just use totalMercadoReal as the truth for ID 19
    const baseSaidasPuras = [
        ...data.fixas.filter(i => !provisaoMetaData.some(pm => pm.entradaId === i.id)),
        ...data.variaveis.filter(i => !provisaoMetaData.some(pm => pm.entradaId === i.id) && ![9, 12, 32, 33, 34, 19].includes(i.id as number)),
        // Filter out Mercado items from history here because we will add totalMercadoReal
        ...(data.gastosMesHistorico || []).filter(i => !(i as any).isMercado),
        ...(data.dividas || [])
    ];
    
    // We add totalMercadoReal to the "Real" total
    const totalSaidasPurasReal = round2(baseSaidasPuras.filter(i => i.paid).reduce((acc, curr) => acc + curr.v, 0) + totalMercadoReal);
    
    // For Previsto (Budget), we include the planned market budget (id 19)
    const mercadoBudget = round2(data.gastosMes.find(i => i.id === 19)?.v || (data.mercado.metaSemanal * data.mercado.gastosReais.length));
    const totalSaidasPurasPrev = round2(baseSaidasPuras.reduce((acc, curr) => acc + curr.v, 0) + mercadoBudget);
    
    const itemsReservaAll = [
        ...data.fixas.filter(i => provisaoMetaData.some(pm => pm.entradaId === i.id)),
        ...data.variaveis.filter(i => provisaoMetaData.some(pm => pm.entradaId === i.id) || [9, 12, 32, 33, 34].includes(i.id as number))
    ];
    const totalReservasPrev = round2(itemsReservaAll.reduce((acc, curr) => acc + curr.v, 0) + manualReserves.reduce((acc, curr) => acc + curr.v, 0));
    
    // Saldo Atual = (Saldo Anterior + Novas Entradas + Resgates) - Saidas - Reservas
    const saldoLiquido = calcularSaldoReal(data);
    const saldoPrevisto = round2((saldoAnterior + totalReceitasNovasPrev) - totalSaidasPurasPrev - totalReservasPrev);

    const handleAdd = (type: 'receitas' | 'fixas' | 'variaveis' | 'gastosMes' | 'dividas') => {
        if (type === 'fixas' || type === 'variaveis') {
            setAddModalType(type);
            setAddModalNome('');
            return;
        }
        const nome = window.prompt(`Nome do item:`);
        if (!nome || nome.trim() === '') return;

        const newData = { ...data };
        const id = crypto.randomUUID();
        if (!newData[type]) newData[type] = [];
        (newData[type] as any).push({ id, d: nome.trim(), v: 0, paid: type === 'receitas' });
        setData(newData);
        saveData(newData);
    };

    const confirmAddModal = () => {
        if (!addModalNome.trim() || !addModalType) return;
        const newData = { ...data };
        const id = crypto.randomUUID();
        if (!newData[addModalType]) newData[addModalType] = [];
        (newData[addModalType] as any).push({ id, d: addModalNome.trim(), v: 0, paid: false });
        setData(newData);
        saveData(newData);
        setAddModalType(null);
        setAddModalNome('');
    };

    const updateItem = (type: 'receitas' | 'fixas' | 'variaveis' | 'gastosMes' | 'dividas', id: string | number, field: string, val: string | boolean | number, skipConfirm: boolean = false) => {
        const newData = { ...data };
        
        let item: any = null;
        if (newData[type]) {
            item = (newData[type] as any[]).find(i => i.id === id);
        }

        // If not found in the primary type and it's variable, check debts
        if (!item && type === 'variaveis') {
            item = (newData.dividas || []).find(i => i.id === id);
        }
        
        if (!item && type === 'receitas' && [1, 2, 39].includes(id as number)) {
            item = { 
                id, 
                d: id === 1 ? 'Saldo anterior' : id === 2 ? 'Receita principal' : 'Extras', 
                v: 0, 
                paid: id === 1 
            };
            newData[type].push(item);
        }

        if (!item && type === 'gastosMes' && [19, 241, 245].includes(id as number)) {
            const defaults: Record<number, string> = {
                19: 'Mercado / Feira',
                241: 'Bilhete Único',
                245: 'Terreiro Pri'
            };
            item = { id, d: defaults[id as number], v: 0, paid: false };
            if (id === 19) (item as any).isMercado = true;
            newData[type].push(item);
        }

        if (item) {
            if (field === 'v') {
                const newVal = typeof val === 'number' ? val : unfmt(val as string);
                item.v = newVal;
            }
            else if (field === 'd') item.d = val as string;
            else if (field === 'paid') item.paid = val as boolean;
            else if (field === 'vencimento') item.vencimento = (val as number) || undefined;
            else if (field === 'reagendado') item.reagendado = val as boolean;
        }
        setData(newData);
        saveData(newData);
    };

    const toggleStatus = (type: 'receitas' | 'fixas' | 'variaveis' | 'gastosMes' | 'dividas', id: string | number, field: 'paid' | 'reagendado') => {
        const newData = { ...data };
        
        let item: any = null;
        if (newData[type]) {
            item = (newData[type] as any[]).find(i => i.id === id);
        }

        // If not found in the primary type and it's variable, check debts
        if (!item && type === 'variaveis') {
            item = (newData.dividas || []).find(i => i.id === id);
        }

        if (!item && type === 'receitas' && [1, 2, 39].includes(id as number)) {
            item = { 
                id, 
                d: id === 1 ? 'Saldo anterior' : id === 2 ? 'Receita principal' : 'Extras', 
                v: 0, 
                paid: id === 1 
            };
            newData[type].push(item);
        }

        if (!item && type === 'gastosMes' && [19, 241, 245].includes(id as number)) {
            const defaults: Record<number, string> = {
                19: 'Mercado / Feira',
                241: 'Bilhete Único',
                245: 'Terreiro Pri'
            };
            item = { id, d: defaults[id as number], v: 0, paid: false };
            if (id === 19) (item as any).isMercado = true;
            newData[type].push(item);
        }

        if (item) {
            if (field === 'paid') {
                item.paid = !item.paid;
                if (item.paid) item.reagendado = false;
            } else if (field === 'reagendado') {
                item.reagendado = !item.reagendado;
                if (item.reagendado) item.paid = false;
            }
        }
        setData(newData);
        saveData(newData);
    };

    const remove = (type: 'receitas' | 'fixas' | 'variaveis' | 'gastosMes' | 'dividas', id: string | number) => {
        const structuralIds = {
            receitas: [1, 2, 39],
            variaveis: [32, 9, 12, 33, 34],
            gastosMes: [201, 204, 205, 212, 214, 228, 19, 241, 245]
        };
        
        if (type in structuralIds && (structuralIds[type as keyof typeof structuralIds] as (string | number)[]).includes(id)) return;

        const newData = { ...data };
        const foundInType = newData[type]?.some(i => i.id === id);
        
        if (foundInType) {
            newData[type] = (newData[type] as any[]).filter(i => i.id !== id);
        } else if (type === 'variaveis') {
            newData.dividas = (newData.dividas || []).filter(i => i.id !== id);
        } else {
            return;
        }

        if(type === 'fixas' || type === 'variaveis' || type === 'gastosMes') {
            newData.cronograma = newData.cronograma.filter(i => i.id !== id);
        }
        setData(newData);
        saveData(newData);
    };

    const toggleSection = (type: string) => {
        setOpenSections(prev => ({ ...prev, [type]: !prev[type] }));
    };

    const renderList = (type: 'receitas' | 'fixas' | 'variaveis' | 'gastosMes' | 'dividas', list: Item[] = [], title: string, Icon: any, color: string) => {
        // For 'receitas', we want to group items by name if they are not the structural ones
        let displayList: Item[] = [];
        
        if (type === 'receitas') {
            // Structural IDs for Receitas
            const structuralIds = [1, 2, 39]; // Saldo anterior, Receita principal, Extras
            
            let rawStructuralItems = list.filter(item => structuralIds.includes(item.id as number));
            const individualItems = list.filter(item => !structuralIds.includes(item.id as number));
            
            // Ensure we have the basic structural items (ensuring they exist)
            const baseItemsMap = [
                rawStructuralItems.find(i => i.id === 1) || { id: 1, d: 'Saldo anterior', v: 0, paid: true },
                rawStructuralItems.find(i => i.id === 2) || { id: 2, d: 'Receita principal', v: 0, paid: false },
                rawStructuralItems.find(i => i.id === 39) || { id: 39, d: 'Extras', v: 0, paid: false }
            ];

            displayList = [
                ...baseItemsMap,
                ...individualItems
            ];
        } else if (type === 'variaveis') {
            // Remove items that should be in other sections or special handling
            displayList = list.filter(item => ![19, 241, 245].includes(item.id as number));
        } else if (type === 'gastosMes') {
            // Structural IDs for Gastos Mes
            const structuralIds = [19, 241, 245, 201, 204, 205, 212, 214, 228]; 
            
            let rawStructuralItems = list.filter(item => structuralIds.includes(item.id as number));
            const individualItems = list.filter(item => !structuralIds.includes(item.id as number));

            const baseItemsMap = [
                rawStructuralItems.find(i => i.id === 19) || { id: 19, d: 'Mercado / Feira', v: 0, paid: false, isMercado: true },
                rawStructuralItems.find(i => i.id === 241) || { id: 241, d: 'Bilhete Único', v: 0, paid: false },
                rawStructuralItems.find(i => i.id === 245) || { id: 245, d: 'Terreiro Pri', v: 0, paid: false },
                ...rawStructuralItems.filter(i => ![19, 241, 245].includes(i.id as number))
            ];

            displayList = [
                ...baseItemsMap,
                ...individualItems
            ];
        } else {
            displayList = list;
        }

        const sortedList = displayList.slice().sort((a, b) => {
            // Priority 0: Saldo anterior (ID 1) always first
            if (a.id === 1 || a.id === '1') return -1;
            if (b.id === 1 || b.id === '1') return 1;

            // Priority 1: Unpaid first
            if (a.paid !== b.paid) return a.paid ? 1 : -1;
            
            // Priority 2: Due date (ascending)
            const dayA = a.vencimento || 999;
            const dayB = b.vencimento || 999;
            
            if (dayA !== dayB) return dayA - dayB;
            
            // Priority 3: Original ID (for stable sort)
            return a.id.toString().localeCompare(b.id.toString());
        });

        const totalMercadoReal = round2(data.mercado.gastosReais.reduce((acc, curr) => acc + (curr || 0), 0));
        const totalBase = round2(displayList.reduce((acc, curr) => {
            if (curr.id === 19) return acc + totalMercadoReal;
            return acc + curr.v;
        }, 0));
        
        // "Saldo 2x" fix: The total in the header/footer of Receipts should probably reflect ONLY new revenue
        // if it's the recettes section and has saldo anterior.
        const isReceitas = type === 'receitas';
        const finalTotalDisplay = round2(isReceitas 
            ? displayList.filter(i => i.id !== 1 && i.id !== '1').reduce((acc, curr) => acc + curr.v, 0)
            : totalBase);
        
        const isOpen = openSections[type];
        
        let iconBg = 'bg-slate-50';
        if (color === 'text-emerald-500') { iconBg = 'bg-emerald-50'; }
        else if (color === 'text-purple-500') { iconBg = 'bg-purple-50'; }
        else if (color === 'text-amber-500') { iconBg = 'bg-amber-50'; }
        else if (color === 'text-blue-500') { iconBg = 'bg-blue-50'; }
        
        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-all">
                <div 
                    className={`${type === 'receitas' ? 'px-5 py-2 md:px-7 md:py-3' : 'px-5 py-3 md:px-7 md:py-4'} border-b border-slate-50 flex items-center justify-between bg-slate-50/30 cursor-pointer`}
                    onClick={() => toggleSection(type)}
                >
                    <div className="flex items-center gap-3 md:gap-5">
                        <div className={`${type === 'receitas' ? 'w-8 h-8 md:w-10 md:h-10' : 'w-10 h-10 md:w-12 md:h-12'} rounded-2xl flex items-center justify-center border border-slate-100 ${iconBg} ${color}`}>
                            <Icon size={type === 'receitas' ? 16 : 20} />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-[11px] md:text-[13px] font-black uppercase tracking-widest text-slate-600 italic leading-none">{title}</h3>
                            <div className="h-px bg-slate-200/50 w-full mt-1.5"></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end mr-2 md:mr-4">
                            <p className="text-[8px] font-black text-slate-400 tracking-widest uppercase mb-0.5">Total</p>
                            <p className={`text-[12.5px] md:text-[14.5px] font-medium tracking-tight leading-none ${color}`}>{fmt(finalTotalDisplay)}</p>
                        </div>
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                if (onAdd && (type === 'gastosMes' || type === 'receitas')) {
                                    onAdd(type === 'receitas' ? 'receitas' : 'gastos');
                                } else {
                                    handleAdd(type);
                                }
                            }} 
                            className={`flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full transition-all ${color} hover:bg-slate-100 hover:scale-110 active:scale-95`}
                            title="Adicionar Item"
                        >
                            <Plus size={16} strokeWidth={3} />
                        </button>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                            {isOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </div>
                    </div>
                </div>

                {isOpen && (
                    <>
                        <div className="flex-grow">
                            {sortedList.length === 0 ? (
                                <div className="p-10 md:p-12 text-center">
                                    <p className="text-[11px] md:text-xs font-black text-slate-300 uppercase tracking-[0.2em] italic">Nenhum item lançado</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {sortedList.map(item => {
                                            const structuralIds: Record<string, (string | number)[]> = {
                                                receitas: [1, 2, 39],
                                                variaveis: [32, 9, 12, 33, 34],
                                                gastosMes: [201, 204, 205, 212, 214, 228, 19, 241, 245]
                                            };
                                            
                                            const isProtected = type in structuralIds && structuralIds[type].includes(item.id);
                                            const isMarketMeta = item.id === 19;
                                            const isSaldoAnterior = item.id === 1 && type === 'receitas';
                                            const isGastosMes = type === 'gastosMes';
                                            const isPaid = item.paid;
                                            const isReagendado = !!item.reagendado;
                                            const applyPaidStyle = isPaid && !isSaldoAnterior && type !== 'receitas';
                                            const today = new Date().getDate();
                                            
                                            // Status Logic:
                                            // 1. Paid (OK) -> Green
                                            // 2. Reagendado (X) -> Yellow
                                            // 3. Overdue (Nothing marked) -> Red
                                            const hasDate = !!item.vencimento && item.vencimento > 0;
                                            const isOverdue = !isPaid && !isReagendado && (hasDate && item.vencimento < today);
                                            
                                            const bgRowColor = isPaid 
                                                ? 'bg-emerald-50/20' 
                                                : isReagendado 
                                                    ? 'bg-amber-50/20' 
                                                    : isOverdue 
                                                        ? 'bg-rose-50/20' 
                                                        : 'hover:bg-slate-50/30';

                                            const dateDivColor = isPaid
                                                ? 'bg-emerald-50 border-emerald-100 text-emerald-500 shadow-sm'
                                                : isReagendado
                                                    ? 'bg-amber-50 border-amber-100 text-amber-500 shadow-sm shadow-amber-100'
                                                    : isOverdue
                                                        ? 'bg-rose-50 border-rose-100 text-rose-500 shadow-sm shadow-rose-100'
                                                        : 'bg-white border-slate-200 text-slate-500 shadow-sm';
                                            const isGastosMesItem = type === 'gastosMes';
                                            const isReserva = (item as any).isReserva;
                                            const isReceitas = type === 'receitas';
                                            const rowPadding = isReceitas ? 'px-3 py-0.5 md:px-5 md:py-1' : isGastosMesItem ? 'px-3 py-1.5 md:px-4 md:py-2' : 'px-4 py-1.5 md:px-5 md:py-2';

                                            return (
                                                <div key={item.id} className={`${rowPadding} flex flex-wrap md:flex-nowrap items-center justify-between gap-3 md:gap-4 group transition-all duration-300 ${bgRowColor} ${isPaid ? 'opacity-70' : ''} border-b border-slate-50 last:border-b-0`}>
                                                    {type !== 'receitas' && !isGastosMes && (
                                                        <div className="flex items-center bg-white border border-slate-200 p-0.5 rounded-lg shadow-sm gap-0.5 flex-shrink-0">
                                                            <button 
                                                                disabled={isReserva}
                                                                onClick={() => toggleStatus(type, item.id, 'paid')}
                                                                className={`w-8 h-8 rounded flex items-center justify-center transition-all duration-300 ${isPaid ? 'bg-emerald-500 text-white shadow-sm' : 'bg-transparent text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'} ${isReserva ? 'cursor-default opacity-50' : ''}`}
                                                                title={isReserva ? "Aporte de Reserva (Gerenciado na aba Reservas)" : "Confirmar Pagamento"}
                                                            >
                                                                <Check size={14} strokeWidth={isPaid ? 4 : 2} />
                                                            </button>
                                                            <button 
                                                                disabled={isReserva}
                                                                onClick={() => toggleStatus(type, item.id, 'reagendado')}
                                                                className={`w-8 h-8 rounded flex items-center justify-center transition-all duration-300 ${isReagendado ? 'bg-amber-400 text-white shadow-sm' : 'bg-transparent text-slate-400 hover:text-amber-500 hover:bg-amber-50'} ${isReserva ? 'cursor-default opacity-50' : ''}`}
                                                                title={isReserva ? "Aporte de Reserva (Gerenciado na aba Reservas)" : "Adiar / Mudar Data"}
                                                            >
                                                                <X size={14} strokeWidth={isReagendado ? 4 : 2} />
                                                            </button>
                                                        </div>
                                                    )}
                                                                                                   {((type === 'fixas' || type === 'variaveis') && !isSaldoAnterior) && (
                                                        <div 
                                                            className={`flex flex-col items-center justify-center p-0.5 rounded-lg border bg-white ${dateDivColor} w-[55px] md:w-[75px] flex-shrink-0 ${isReserva ? 'opacity-40' : ''} relative overflow-hidden cursor-text group/date transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100`}
                                                            onClick={(e) => {
                                                                const input = e.currentTarget.querySelector('input');
                                                                if (input && !isReserva) {
                                                                    input.focus();
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex flex-col items-center leading-none w-full relative">
                                                                <span className="text-[6px] md:text-[8px] font-black uppercase tracking-tighter opacity-70 mb-0.5 pointer-events-none">Venc.</span>
                                                                {!item.vencimento && (
                                                                    <div className="absolute inset-0 top-3 flex items-center justify-center gap-1 pointer-events-none opacity-100 group-focus-within/date:opacity-0 transition-opacity">
                                                                        <Calendar size={10} className="text-slate-400 group-hover/date:text-blue-500" />
                                                                        <span className="text-[11px] md:text-[13px] font-black tracking-tighter text-slate-400 group-hover/date:text-blue-500">S/D</span>
                                                                    </div>
                                                                )}
                                                                <input 
                                                                    type="number" 
                                                                    min="1" max="31"
                                                                    disabled={isReserva}
                                                                    className={`w-full bg-transparent text-center text-[11px] md:text-[13px] font-black tracking-tighter focus:outline-none appearance-none m-0 p-0 ${!item.vencimento ? 'opacity-0 focus:opacity-100' : ''} [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                                                                    style={{ MozAppearance: 'textfield' }}
                                                                    value={item.vencimento || ''}
                                                                    onChange={(e) => {
                                                                        let val = parseInt(e.target.value);
                                                                        if (isNaN(val)) {
                                                                            updateItem(type, item.id, 'vencimento', 0, false);
                                                                        } else {
                                                                            val = Math.min(31, Math.max(1, val));
                                                                            updateItem(type, item.id, 'vencimento', val, false);
                                                                        }
                                                                    }}
                                                                    onFocus={(e) => e.target.select()}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                        <div className="flex-grow min-w-[100px] md:min-w-[140px]">
                                                            {isProtected || isReserva ? (
                                                                <p className={`text-[12.5px] md:text-[13.5px] px-1 md:px-2 transition-all tracking-tight leading-tight ${applyPaidStyle ? 'text-emerald-500 line-through decoration-emerald-500/50 decoration-2' : 'text-slate-800'} ${isReserva ? 'text-indigo-600' : ''}`}>
                                                                    {isReserva && <span className="text-[10px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-md mr-2 uppercase tracking-widest leading-none">Reserva</span>}
                                                                    {(item.d || 'Sem descrição').replace(/^(?:Aporte:\s*)?(?:Reserva|Provisão|Meta)(?:\s+de)?\s+/i, '')}
                                                                    {item.parcelaAtual && item.totalParcelas && (
                                                                        <span className="ml-2 text-[8px] text-slate-400 uppercase tracking-tighter">
                                                                            ({item.parcelaAtual}/{item.totalParcelas})
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            ) : (
                                                                <input 
                                                                    className={`w-full bg-transparent focus:outline-none text-[12.5px] md:text-[13.5px] tracking-tight leading-tight transition-all ${applyPaidStyle ? 'text-emerald-500 line-through decoration-emerald-500/50 decoration-2' : (isMobile ? `px-2 ${isReceitas ? 'py-0.5' : 'py-1'} md:px-3 ${isReceitas ? 'md:py-1' : 'md:py-1.5'} text-slate-700` : `bg-slate-100 focus:bg-white rounded-lg px-2 ${isReceitas ? 'py-0.5' : 'py-1'} md:px-3 ${isReceitas ? 'md:py-1' : 'md:py-1.5'} text-slate-700 focus:ring-4 focus:ring-blue-50/50`)}`} 
                                                                    value={item.d} 
                                                                    onChange={(e) => updateItem(type, item.id, 'd', e.target.value, true)} 
                                                                    onBlur={(e) => updateItem(type, item.id, 'd', e.target.value, false)}
                                                                    onFocus={(e) => e.target.select()}
                                                                    placeholder="NOME DO ITEM"
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="flex-shrink-0 w-[80px] md:w-[100px]">
                                                            {isReserva ? (
                                                                <p className={`text-right text-[12.5px] md:text-[13.5px] px-1 md:px-2 transition-all tracking-tight ${applyPaidStyle ? 'text-emerald-500 line-through decoration-emerald-500/50 decoration-2' : 'text-slate-900'} ${isReserva ? 'text-indigo-600' : ''}`}>{fmt(item.v)}</p>
                                                            ) : isMarketMeta ? (
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-[12.5px] md:text-[13.5px] text-rose-500">{fmt(totalMercadoReal)}</span>
                                                                    <span className="text-[9px] text-slate-400 mt-0.5">Até agora</span>
                                                                </div>
                                                            ) : (
                                                                <div 
                                                                    className={`w-full bg-transparent text-right focus-within:outline-none text-[12.5px] md:text-[13.5px] tracking-tight transition-all ${applyPaidStyle ? 'text-emerald-500 line-through decoration-emerald-500/50 decoration-2' : (isMobile ? `px-2 ${isReceitas ? 'py-0.5' : 'py-1'} md:px-2 ${isReceitas ? 'md:py-1' : 'md:py-1.5'} text-slate-700` : `bg-slate-100 focus-within:bg-white rounded-lg px-2 ${isReceitas ? 'py-0.5' : 'py-1'} md:px-2 ${isReceitas ? 'md:py-1' : 'md:py-1.5'} text-slate-700 border-none focus-within:ring-4 focus-within:ring-blue-50/50`)}`} 
                                                                >
                                                                    <CurrencyInput 
                                                                        className="w-full bg-transparent text-right outline-none disabled:text-slate-700"
                                                                        value={item.v} 
                                                                        onFocus={() => setOriginalValue(item.v)}
                                                                        onChangeValue={(val) => updateItem(type, item.id, 'v', val, true)} 
                                                                        onCommitValue={(val) => {
                                                                            updateItem(type, item.id, 'v', val, false);
                                                                            setOriginalValue(null);
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>

                                                    <div className="flex items-center justify-end flex-shrink-0 w-8">
                                                        <button 
                                                            onClick={() => {
                                                                if (window.confirm(`Deseja realmente excluir "${item.d}"?`)) {
                                                                    remove(type, item.id);
                                                                }
                                                            }} 
                                                            disabled={isProtected || isReserva}
                                                            className={`w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all md:opacity-0 md:group-hover:opacity-100 ${isProtected || isReserva ? 'hidden' : ''}`}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>


                    </>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-4 md:gap-6 fade-in pb-12">
            {addModalType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-base font-black text-slate-800 mb-1 uppercase tracking-tight">
                            {addModalType === 'fixas' ? 'Nova Conta Fixa' : 'Nova Conta Variável'}
                        </h3>
                        <p className="text-xs text-slate-400 mb-4">Digite o nome da conta para adicionar à lista.</p>
                        <input
                            type="text"
                            autoFocus
                            value={addModalNome}
                            onChange={e => setAddModalNome(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') confirmAddModal(); if (e.key === 'Escape') setAddModalType(null); }}
                            placeholder="Ex: Aluguel, Internet, Streaming..."
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300 mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setAddModalType(null)}
                                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-black hover:bg-slate-200 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmAddModal}
                                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 transition-all"
                            >
                                Adicionar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-2">
                <div className="bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3">
                    <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                        <Wallet size={14} className="md:w-5 md:h-5" />
                    </div>
                    <div>
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Saldo Inicial</p>
                        <p className="text-sm md:text-base font-medium text-slate-700 tracking-tight leading-none mt-1">{fmt(saldoAnterior)}</p>
                    </div>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3">
                    <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                        <ArrowUpCircle size={14} className="md:w-5 md:h-5" />
                    </div>
                    <div>
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Receitas</p>
                        <p className="text-sm md:text-base font-medium text-emerald-600 tracking-tight leading-none mt-1">
                             {fmt(totalReceitasNovasReal + resgatesReservaTotal)}
                        </p>
                    </div>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3">
                    <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                        <ArrowDownCircle size={14} className="md:w-5 md:h-5" />
                    </div>
                    <div>
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Gastos</p>
                        <p className="text-sm md:text-base font-medium text-rose-600 tracking-tight leading-none mt-1">
                            {fmt(totalSaidasPurasReal)}
                            <span className="text-[9px] md:text-[10px] text-slate-400 font-bold ml-1.5 md:ml-2">/ {fmt(totalSaidasPurasPrev)}</span>
                        </p>
                    </div>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3">
                    <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={14} className="md:w-5 md:h-5" />
                    </div>
                    <div>
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Saldo</p>
                        <p className={`text-sm md:text-base font-medium tracking-tight leading-none mt-1 ${saldoLiquido >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                            {fmt(saldoLiquido)}
                            <span className="text-[9px] md:text-[10px] text-slate-400 font-bold ml-1.5 md:ml-2">/ {fmt(saldoPrevisto)} prev</span>
                        </p>
                    </div>
                </div>
            </div>


            {/* INCOME SECTION */}
            <div className="fade-in">
                {renderList('receitas', data.receitas, 'Entradas / Receitas', Wallet, 'text-emerald-500')}
            </div>

            {/* EXPENSES SECTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-11 gap-5 items-start">
                <div className="md:col-span-1 xl:col-span-4">
                    {renderList('fixas', data.fixas.filter(i => !provisaoMetaData.some(pm => pm.entradaId === i.id)), 'Contas Fixas', Pin, 'text-purple-500')}
                </div>
                <div className="md:col-span-1 xl:col-span-4">
                    {renderList('variaveis', [
                        ...data.variaveis.filter(i => !provisaoMetaData.some(pm => pm.entradaId === i.id)),
                        ...(data.dividas || [])
                    ], 'Contas Variáveis', Shuffle, 'text-amber-500')}
                </div>
                <div className="md:col-span-2 xl:col-span-3">
                    {renderList('gastosMes', data.gastosMes.filter(i => !provisaoMetaData.some(pm => pm.entradaId === i.id)), 'Gastos Mês', Tag, 'text-blue-500')}
                </div>
            </div>
        </div>
    );
}

