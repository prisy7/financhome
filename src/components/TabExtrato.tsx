import React, { useState } from 'react';
import { OrcamentoData } from '../types';
import { fmt, formatFullDate, showToast, round2 } from '../utils';
import { provisaoMetaData } from '../constants';
import { CheckCircle2, Circle, ArrowDownCircle, ArrowUpCircle, TrendingUp, PieChart as PieChartIcon, Wallet, Trash2, Edit2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { FaltaPagarModal } from './FaltaPagarModal';

interface TabExtratoProps {
    data: OrcamentoData | null;
    setData: (data: OrcamentoData) => void;
    saveData: (data: OrcamentoData) => void;
    monthName?: string;
}

export function TabExtrato({ data, setData, saveData, monthName }: TabExtratoProps) {
    const [filter, setFilter] = useState<'all' | 'receitas' | 'fixas' | 'variaveis' | 'gastos' | 'dividas'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [showFaltaPagar, setShowFaltaPagar] = useState(false);

    const abreviarCategoria = (nome: string) => {
        const abreviacoes: Record<string, string> = {
            'Restaurante/Lanche': 'Rest/Lanche',
            'Saída/Passeio': 'Saída/Passeio',
            'Restaurante': 'Rest.',
            'Utilidades': 'Utilid.',
            'Perfumaria': 'Perfum.',
            'Papelaria': 'Papel.',
            'M': 'Mercado / Feira'
        };
        return abreviacoes[nome] || nome;
    };

    if (!data) return null;

    // DATA FOR DASHBOARD
    const saldoAnterior = data.receitas.find(i => i.id === 1 || i.id === '1')?.v || 0;
    const totalReceitasNovasReal = round2(data.receitas.filter(i => i.paid && i.id !== 1 && i.id !== '1').reduce((acc, curr) => acc + curr.v, 0));
    const previstoReceitasNovas = round2(data.receitas.filter(i => i.id !== 1 && i.id !== '1').reduce((acc, curr) => acc + curr.v, 0));
    
    // Total Resgates (Usage of reserves) - counts as money coming INTO the "current" wallet
    const resgatesReservaTotal = round2(Object.keys(data.provisoes).reduce((acc, key) => {
        const prov = data.provisoes[key];
        return acc + (prov.gastos || []).reduce((s, g) => s + g.v, 0);
    }, 0));

    // Calculate manual contributions for reserves (those not linked to an item)
    const manualReservesList = Object.keys(data.provisoes).map(key => {
        const prov = data.provisoes[key];
        const aporte = (prov as any).entradaManual || 0;
        if (aporte > 0) {
            return {
                id: `reserva_manual_${key}`,
                d: `Aporte: ${prov.title || key}`,
                v: aporte,
                paid: true,
                vencimento: undefined,
                tipo: 'reservas',
                badge: 'Aporte Reserva',
                color: 'text-indigo-400'
            } as any;
        }
        return null;
    }).filter(i => i !== null);

    const totalAportesManual = round2(manualReservesList.reduce((acc, curr) => acc + curr.v, 0));

    // All paid items that are considered Reserve Deposits (Aportes)
    const itemsReservaPagos = [
        ...data.fixas.filter(i => i.paid && provisaoMetaData.some(pm => pm.entradaId === i.id)),
        ...data.variaveis.filter(i => i.paid && (provisaoMetaData.some(pm => pm.entradaId === i.id) || [9, 12, 32, 33, 34].includes(i.id as number)))
    ];
    const totalAportesReal = round2(itemsReservaPagos.reduce((acc, curr) => acc + (curr.v || 0), 0) + totalAportesManual);
    const aportesPrevistos = round2([
        ...data.fixas.filter(i => provisaoMetaData.some(pm => pm.entradaId === i.id)),
        ...data.variaveis.filter(i => provisaoMetaData.some(pm => pm.entradaId === i.id) || [9, 12, 32, 33, 34].includes(i.id as number))
    ].reduce((acc, curr) => acc + curr.v, 0));

    // Total actual expenses (outflows) that are NOT reserve deposits
    const totalSaidasPuras = round2([
        ...data.fixas.filter(i => i.paid && !provisaoMetaData.some(pm => pm.entradaId === i.id)),
        ...data.variaveis.filter(i => i.paid && !provisaoMetaData.some(pm => pm.entradaId === i.id) && ![9, 12, 32, 33, 34].includes(i.id as number)),
        ...(data.gastosMes || []).filter(i => i.paid),
        ...(data.gastosMesHistorico || []).filter(i => i.paid),
        ...(data.dividas || []).filter(i => i.paid)
    ].reduce((acc, curr) => acc + (curr.v || 0), 0));

    const fixPuro = round2(data.fixas.filter(i => !provisaoMetaData.some(pm => pm.entradaId === i.id)).reduce((a,b) => a+b.v, 0));
    const varPuro = round2(data.variaveis.filter(i => !provisaoMetaData.some(pm => pm.entradaId === i.id) && ![9, 12, 32, 33, 34].includes(i.id as number)).reduce((a,b) => a+b.v, 0));
    const div = round2(data.dividas?.reduce((a, b) => a + b.v, 0) || 0); 
    const gastosMesTotal = round2(data.gastosMes?.reduce((a, b) => a + b.v, 0) || 0);
    const despesasPrevistas = round2(fixPuro + varPuro + div + gastosMesTotal);

    const saldoLiquido = round2((saldoAnterior + totalReceitasNovasReal + resgatesReservaTotal) - totalSaidasPuras - totalAportesReal);
    const saldoPrevisto = round2((saldoAnterior + previstoReceitasNovas) - despesasPrevistas - aportesPrevistos);

    const chartData = [
        { name: 'Entradas', valor: totalReceitasNovasReal + resgatesReservaTotal, color: '#10b981' },
        { name: 'Saídas', valor: totalSaidasPuras, color: '#f43f5e' },
        { name: 'Reservas', valor: totalAportesReal, color: '#6366f1' },
    ];

    const distributionData = [
        { name: 'Fixas', value: fixPuro, color: '#f43f5e' },
        { name: 'Variáveis', value: varPuro, color: '#f59e0b' },
        { name: 'Dívidas', value: div, color: '#ec4899' },
        { name: 'Gastos Mês', value: gastosMesTotal, color: '#3b82f6' },
        { name: 'Reservas', value: aportesPrevistos, color: '#6366f1' },
    ].filter(i => i.value > 0);

    // Combine all items
    const allItems = [
        ...data.receitas.map(i => {
            const isSaldo = i.id === 1 || i.id === '1';
            return { 
                ...i, 
                tipo: 'receitas', 
                badge: isSaldo ? 'Saldo Inicial' : 'Receita', 
                color: isSaldo ? 'text-blue-500' : 'text-emerald-400',
                isSaldo
            };
        }),
        ...data.fixas.map(i => {
            const isReserva = provisaoMetaData.some((pm: any) => pm.entradaId === i.id);
            return { 
                ...i, 
                tipo: 'fixas', 
                badge: isReserva ? 'Aporte Reserva' : 'Conta Mensal', 
                color: isReserva ? 'text-indigo-400' : 'text-purple-400' 
            };
        }),
        ...data.variaveis.map(i => {
            const isReserva = provisaoMetaData.some((pm: any) => pm.entradaId === i.id) || 
                             [9, 12, 32, 33, 34].includes(i.id as number);
            return { 
                ...i, 
                tipo: 'variaveis', 
                badge: isReserva ? 'Aporte Reserva' : 'Conta Mensal', 
                color: isReserva ? 'text-indigo-400' : 'text-amber-400' 
            };
        }),
        ...(data.gastosMes || []).map(i => ({ ...i, tipo: 'gastosMes', badge: 'Gasto do Mês', color: 'text-blue-400' })),
        ...(data.gastosMesHistorico || []).map(i => {
            const isFeira = (i.d || '').toLowerCase().includes('feira');
            const badgeLabel = (i as any).isMercado ? (isFeira ? 'Feira' : 'Mercado') : 'Gasto do Mês';
            const badgeColor = (i as any).isMercado ? (isFeira ? 'text-lime-500' : 'text-purple-400') : 'text-blue-400';
            return { 
                ...i, 
                tipo: 'gastosMesHistorico', 
                badge: badgeLabel, 
                color: badgeColor 
            };
        }),
        ...(data.dividas || []).map(i => ({ ...i, tipo: 'dividas', badge: 'Dívida', color: 'text-rose-400' })),
        ...manualReservesList,
        ...Object.keys(data.provisoes).flatMap(key => {
            const prov = data.provisoes[key];
            return (prov.gastos || []).map(g => ({
                ...g,
                tipo: 'resgate',
                badge: `Resgate Reserva`,
                color: 'text-slate-400',
                paid: true,
                vencimento: undefined
            }));
        }),
        // We'll trust the historical entries for individual receipts
    ].filter(i => {
        // Only show items with real values in the statement
        if (i.v === 0) return false;
        
        // Show all income entries (to see individual details)
        if (i.tipo === 'receitas') return true;
        // For expenses, only show paid ones in the actual statement
        return i.paid;
    });

    const normalizeString = (str: string) => {
        return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const getCategory = (item: any) => {
        if (item.categoria) return item.categoria === 'M' ? 'Mercado / Feira' : item.categoria;

        const fullText = (item.d || '');
        
        // Items from gastosMes typically have [Category] prefix
        const match = fullText.match(/^\[(.*?)\]\s*(.*)$/);
        if (match) {
            const cat = match[1];
            return cat === 'M' ? 'Mercado / Feira' : cat;
        }

        // Recipes are prioritized
        if (item.tipo === 'receitas') return item.isSaldo ? 'Saldo' : 'Receita';
        
        // Known keywords for auto-categorization
        const desc = normalizeString(fullText);
        
        if (desc.includes('celular') || desc.includes('telef')) return 'Comunicação';
        if (desc.includes('convenio') || desc.includes('medico') || desc.includes('saude') || desc.includes('kung fu') || desc.includes('farmacia')) return 'Saúde';
        if (desc.includes('internet') || desc.includes('net') || desc.includes('wifi')) return 'Internet';
        if (desc.includes('aluguel') || desc.includes('condominio') || desc.includes('iptu')) return 'Moradia';
        if (desc.includes('mercado pago')) return 'Banco/Pagamento';
        if (desc.includes('feira')) return 'Feira';
        if (desc.includes('mercado') || desc.includes('supermercado')) return 'Mercado';
        if (desc.includes('terreiro')) return 'Terreiro';
        if (desc.includes('escoteiro')) return 'Educação';
        if (desc.includes('pizza') || desc.includes('delivery') || desc.includes('ifood')) return 'Delivery';
        if (desc.includes('uber') || desc.includes('bilhete') || desc.includes('transporte')) return 'Transporte';
        
        // Fallback for fixed/variable expenses as requested
        if (item.tipo === 'fixas' || item.tipo === 'variaveis') return 'Conta Mensal';
        
        return 'Outros';
    };

    const categories = Array.from(new Set(allItems
        .map(i => getCategory(i))
    )).sort() as string[];

    const categorySummary = allItems
        .filter(i => i.tipo !== 'receitas' || i.isSaldo)
        .reduce((acc, item) => {
            const cat = getCategory(item);
            acc[cat] = (acc[cat] || 0) + item.v;
            return acc;
        }, {} as Record<string, number>);

    const categoryChartData = Object.entries(categorySummary)
        .map(([name, value], index) => ({
            name,
            value: value as number,
            color: [
                '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
                '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
            ][index % 10]
        }))
        .sort((a, b) => (b.value as number) - (a.value as number));

    const categoryChartColors: Record<string, string> = {
        'Sem Categoria': '#94a3b8',
    };
    categoryChartData.forEach((c) => {
        categoryChartColors[c.name] = c.color;
    });

    // Sort: items by date (ascending), then by ID
    allItems.sort((a, b) => {
        const dayA = (a as any).vencimento || 999;
        const dayB = (b as any).vencimento || 999;
        
        if (dayA !== dayB) return dayA - dayB;
        return b.id.toString().localeCompare(a.id.toString());
    });

    const filteredItems = allItems.filter(item => {
        let passType = true;
        if (filter === 'all') passType = true;
        else if (filter === 'receitas') passType = item.tipo === 'receitas';
        else if (filter === 'fixas') passType = item.tipo === 'fixas';
        else if (filter === 'variaveis') passType = item.tipo === 'variaveis';
        else if (filter === 'gastos') passType = item.tipo === 'gastosMesHistorico';
        else if (filter === 'dividas') passType = item.tipo === 'dividas';
        else if ((filter as string) === 'saidas') passType = item.tipo !== 'receitas';

        if (!passType) return false;

        if (categoryFilter === 'all') return true;
        const cat = getCategory(item);
        return cat === categoryFilter;
    });

    const togglePaid = (id: string | number, tipo: string) => {
        const newData = { ...data };
        // Map UI type to data key
        const mapping: Record<string, keyof OrcamentoData> = {
            'receitas': 'receitas',
            'fixas': 'fixas',
            'variaveis': 'variaveis',
            'gastosMes': 'gastosMes',
            'gastosMesHistorico': 'gastosMesHistorico',
            'dividas': 'dividas'
        };

        const key = mapping[tipo];
        if (!key) return;

        const list = newData[key] as any[];
        if (!list) return;

        const item = list.find(i => i.id === id);
        if (item) {
            item.paid = !item.paid;
            
            if (newData.cronograma) {
                const cronogramaItem = newData.cronograma.find(i => i.id === id);
                if (cronogramaItem) {
                    cronogramaItem.paid = item.paid;
                }
            }

            setData(newData);
            saveData(newData);
            showToast(item.paid ? "Marcado como pago!" : "Marcado como pendente!", 'success');
        }
    };

    const remove = (id: string | number, tipo: string) => {
        const newData = { ...data };
        const mapping: Record<string, keyof OrcamentoData> = {
            'receitas': 'receitas',
            'fixas': 'fixas',
            'variaveis': 'variaveis',
            'gastosMes': 'gastosMes',
            'gastosMesHistorico': 'gastosMesHistorico',
            'dividas': 'dividas'
        };

        const key = mapping[tipo];
        if (!key) return;

        const structuralIds: Record<string, (string | number)[]> = {
            receitas: [1, 2, 39],
            variaveis: [32, 9, 12, 33],
            gastosMes: [201, 204, 205, 212, 214, 228, 219, 220, 221, 19, 241, 245]
        };

        if (key in structuralIds && (structuralIds[key as any] as any).includes(id)) {
            showToast("Não é possível excluir itens estruturais.", "error");
            return;
        }

        const list = newData[key] as any[];
        if (!list) return;

        (newData as any)[key] = list.filter(i => i.id !== id);
        
        if (['fixas', 'variaveis', 'gastosMes', 'gastosMesHistorico'].includes(key)) {
            newData.cronograma = (newData.cronograma || []).filter(i => i.id !== id);
        }
        
        // Se for do histórico de Gastos Mês, precisamos talvez subtrair do total da categoria em gastosMes?
        // Na verdade o App sincroniza somando, então remover do histórico já ajuda.
        
        setData(newData);
        saveData(newData);
        showToast('Lançamento removido!', 'success');
    };

    const updateDate = (id: string | number, tipo: string, newDateStr: string) => {
        const _day = parseInt(newDateStr, 10);
        if (isNaN(_day) || _day < 1 || _day > 31) return;

        const newData = { ...data };
        const mapping: Record<string, keyof OrcamentoData> = {
            'receitas': 'receitas',
            'fixas': 'fixas',
            'variaveis': 'variaveis',
            'gastosMes': 'gastosMes',
            'gastosMesHistorico': 'gastosMesHistorico',
            'dividas': 'dividas'
        };

        const key = mapping[tipo];
        if (!key) return;

        const list = newData[key] as any[];
        if (!list) return;

        const idx = list.findIndex(i => i.id === id);
        if (idx !== -1) {
            list[idx] = { ...list[idx], vencimento: _day };
            
            if (newData.cronograma) {
                const cronoIdx = newData.cronograma.findIndex(i => i.id === id);
                if (cronoIdx !== -1) {
                    newData.cronograma[cronoIdx] = { ...newData.cronograma[cronoIdx], vencimento: _day };
                }
            }
            
            setData(newData);
            saveData(newData);
            showToast('Data atualizada!', 'success');
        }
    };

    return (
        <div className="fade-in space-y-4 md:space-y-6 mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* TRANSACTION HISTORY (LEFT SIDE) */}
                <div className="lg:col-span-8 xl:col-span-9">

                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-5 md:p-6 bg-slate-50/30 border-b border-slate-50 flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
                            <h3 className="text-base md:text-base font-black text-slate-800 uppercase tracking-widest italic">Visão Geral</h3>
                            <div className="flex bg-white rounded-xl border border-slate-100 overflow-x-auto hide-scrollbar p-1 gap-1 shadow-sm flex-shrink-0">
                                <button 
                                    onClick={() => setFilter('all')} 
                                    className={`flex-none px-3 py-2 text-[10px] uppercase tracking-widest font-black transition-all rounded-lg ${filter === 'all' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    Tudo
                                </button>
                                <button 
                                    onClick={() => setFilter('receitas')} 
                                    className={`flex-none px-3 py-2 text-[10px] uppercase tracking-widest font-black transition-all rounded-lg ${filter === 'receitas' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    Entradas
                                </button>
                                <button 
                                    onClick={() => setFilter('saidas' as any)} 
                                    className={`flex-none px-3 py-2 text-[10px] uppercase tracking-widest font-black transition-all rounded-lg ${filter === 'saidas' as any ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    Saídas
                                </button>
                                <button 
                                    onClick={() => setFilter('fixas')} 
                                    className={`flex-none px-3 py-2 text-[10px] uppercase tracking-widest font-black transition-all rounded-lg ${filter === 'fixas' ? 'bg-purple-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    Fixas
                                </button>
                                <button 
                                    onClick={() => setFilter('variaveis')} 
                                    className={`flex-none px-3 py-2 text-[10px] uppercase tracking-widest font-black transition-all rounded-lg ${filter === 'variaveis' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    Variáveis
                                </button>
                                <button 
                                    onClick={() => setFilter('gastos')} 
                                    className={`flex-none px-3 py-2 text-[10px] uppercase tracking-widest font-black transition-all rounded-lg ${filter === 'gastos' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    Gastos
                                </button>
                            </div>
                        </div>

                        {categories.length > 0 && (
                            <div className="px-5 md:px-6 py-3 bg-white border-b border-slate-50 flex flex-wrap gap-2 items-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">Filtrar Categoria:</span>
                                <button 
                                    onClick={() => setCategoryFilter('all')} 
                                    className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all ${categoryFilter === 'all' ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}
                                >
                                    Todas
                                </button>
                                {categories.map(cat => (
                                    <button 
                                        key={cat}
                                        onClick={() => setCategoryFilter(cat)} 
                                        className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all ${categoryFilter === cat ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                                {categoryFilter !== 'all' && (
                                    <button 
                                        onClick={() => setCategoryFilter('all')}
                                        className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:underline ml-2"
                                    >
                                        Limpar
                                    </button>
                                )}
                            </div>
                        )}

                        {/* TABLE HEADERS */}
                        <div className="hidden md:flex flex-row gap-2 px-3 py-2 bg-slate-100/60 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] items-center">
                            <div className="w-6 shrink-0 flex justify-center opacity-40"><CheckCircle2 size={10} /></div>
                            <div className="w-40 shrink-0">Data</div>
                            <div className="w-96 shrink-0">Categoria</div>
                            <div className="flex-1 min-w-0">Descrição</div>
                            <div className="w-40 shrink-0 text-right">Valor</div>
                            <div className="w-6 shrink-0"></div>
                        </div>
                        
                        {filteredItems.length === 0 ? (
                            <div className="p-16 text-center">
                                <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em] italic">Nenhum lançamento.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col pb-2">
                                {filteredItems.map(item => {
                                    const fullText = item.badge === 'Reserva' 
                                        ? (item.d || '').replace(/^(?:Aporte:\s*)?(?:Reserva|Provisão|Meta)(?:\s+de)?\s+/i, '') 
                                        : item.d;
                                    
                                    const category = getCategory(item);
                                    const match = fullText.match(/^\[(.*?)\]\s*(.*)$/);
                                    const description = match ? match[2] : fullText;
                                    const catColor = categoryChartColors[category] || '#94a3b8';

                                    const isStructural = (['receitas', 'fixas', 'variaveis', 'gastosMes'].includes(item.tipo)) && (
                                        (item.tipo === 'receitas' && [1, 2, 39].includes(item.id)) ||
                                        (item.tipo === 'variaveis' && [19, 32, 9, 12, 33].includes(item.id))
                                    );

                                    return (
                                        <div 
                                            key={`${item.tipo}-${item.id}`} 
                                            className={`flex flex-row items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-all group border-b border-slate-100 ${!item.paid ? 'bg-slate-50/50' : ''}`}
                                        >

                                        {/* CHECKBOX */}
                                        <div className="w-6 shrink-0">
                                          <button 
                                            onClick={() => togglePaid(item.id, item.tipo)}
                                            className={`w-6 h-6 md:w-5 md:h-5 rounded-lg border-2 flex items-center justify-center transition-all ${item.paid ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'border-slate-300 hover:border-slate-400 bg-white'}`}
                                          >
                                            {item.paid && <CheckCircle2 size={12} strokeWidth={4} />}
                                          </button>
                                        </div>

                                        {/* DATA */}
                                        <div className="w-40 shrink-0 flex items-center">
                                            <span className="md:hidden text-[11px] font-black text-slate-500 uppercase mr-2.5 text-xs">Data:</span>
                                            <div className="flex items-center text-[13px] md:text-[14px] font-medium text-slate-600 uppercase tracking-widest bg-transparent hover:bg-slate-100/80 focus-within:bg-slate-100/80 rounded px-1 -ml-1 transition-colors">
                                                <input 
                                                    key={`date-${item.id}-${item.vencimento}`}
                                                    type="text" 
                                                    inputMode="numeric"
                                                    maxLength={2}
                                                    className="w-[18px] md:w-[20px] bg-transparent border-none p-0 focus:ring-0 text-center leading-none appearance-none outline-none rounded font-medium text-slate-600"
                                                    defaultValue={item.vencimento ? String(item.vencimento).padStart(2, '0') : ''}
                                                    placeholder="--"
                                                    onBlur={(e) => {
                                                        const val = parseInt(e.target.value, 10);
                                                        if (!isNaN(val) && val !== item.vencimento) updateDate(item.id, item.tipo, e.target.value);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') e.currentTarget.blur();
                                                    }}
                                                />
                                                <span className="ml-[1px] pointer-events-none">
                                                    /{formatFullDate(monthName, 1).split('/')[1]}
                                                </span>
                                            </div>
                                        </div>

                                        {/* CATEGORIA */}
                                        <div className="w-96 shrink-0 flex items-center flex-wrap gap-2 group min-w-0">
                                            <span className="md:hidden text-[11px] font-black text-slate-500 uppercase mr-2.5 text-xs">Categoria:</span>
                                            <span className="inline-block max-w-[320px] whitespace-nowrap overflow-hidden text-ellipsis px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded leading-tight text-white text-center" style={{ backgroundColor: catColor }}>
                                                {abreviarCategoria(category)}
                                            </span>

                                            <button 
                                                onClick={() => {
                                                    const newCat = prompt(`Nova categoria para "${description}":`, category);
                                                    if (newCat && newCat !== category) {
                                                        const newData = { ...data };
                                                        const mapping: Record<string, keyof OrcamentoData> = {
                                                            'receitas': 'receitas',
                                                            'fixas': 'fixas',
                                                            'variaveis': 'variaveis',
                                                            'gastosMes': 'gastosMes',
                                                            'gastosMesHistorico': 'gastosMesHistorico',
                                                            'dividas': 'dividas'
                                                        };
                                                        const key = mapping[item.tipo];
                                                        if (key) {
                                                            const list = newData[key] as any[];
                                                            if (list) {
                                                                const foundItem = list.find(i => i.id === item.id);
                                                                if (foundItem) {
                                                                    foundItem.categoria = newCat; // Assuming 'categoria' field exists
                                                                    console.log('Categoria atualizada para:', newCat, foundItem);
                                                                    setData(newData);
                                                                    saveData(newData);
                                                                    showToast('Categoria atualizada!', 'success');
                                                                }
                                                            }
                                                        }
                                                    }
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-opacity"
                                                title="Editar Categoria"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                        </div>

                                        {/* DESCRIÇÃO */}
                                        <div className="flex-1 min-w-0">
                                            <span className="md:hidden text-[11px] font-black text-slate-500 uppercase mr-2.5 text-xs">Descrição:</span>
                                            <p className={`break-words text-[12.5px] md:text-[13.5px] tracking-tight ${item.paid ? 'text-slate-500' : 'text-slate-700'}`}>
                                                {description}
                                                {!item.paid && item.tipo !== 'receitas' && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[8px] uppercase font-black align-middle">Pendente</span>}
                                            </p>
                                        </div>

                                        {/* VALOR */}
                                        <div className="w-40 shrink-0 text-right flex flex-nowrap items-center justify-between md:justify-end gap-3">
                                            <span className="md:hidden text-[11px] font-black text-slate-500 uppercase mr-2.5 text-xs">Valor:</span>
                                            <span className={`text-[12.5px] md:text-[13.5px] font-medium tracking-tight ${(item as any).isSaldo ? 'text-blue-600' : (item.tipo === 'receitas' ? 'text-emerald-600' : 'text-rose-600')}`}>
                                                {(item as any).isSaldo ? '' : (item.tipo === 'receitas' ? '+' : '-')}{fmt(item.v)}
                                            </span>
                                        </div>

                                        {/* ACTIONS */}
                                        <div className="w-6 shrink-0 flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            {!isStructural && !item.isSaldo && (
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm(`Deseja realmente excluir "${description}"?`)) {
                                                            remove(item.id, item.tipo);
                                                        }
                                                    }}
                                                    className="p-1.5 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )})}
                            </div>
                        )}
                    </div>
                </div>

                {/* DASHBOARD (RIGHT SIDE) */}
                <div className="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-6">
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <TrendingUp size={20} />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-700">Fluxo Real</h3>
                        </div>
                        <div className="h-80 w-full" style={{ minWidth: 0 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(v: any) => [fmt(v), '']}
                                    />
                                    <Bar dataKey="valor" radius={[10, 10, 10, 10]} barSize={40}>
                                        {chartData.map((e, index) => <Cell key={`cell-${index}`} fill={e.color} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {categoryChartData.length > 0 && (
                        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                    <PieChartIcon size={20} />
                                </div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-700">Por Categoria</h3>
                            </div>
                            <div className="h-64 w-full" style={{ minWidth: 0 }}>
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <PieChart>
                                        <Pie 
                                            data={categoryChartData} 
                                            cx="50%" 
                                            cy="50%" 
                                            innerRadius={60} 
                                            outerRadius={85} 
                                            paddingAngle={4} 
                                            dataKey="value"
                                        >
                                            {categoryChartData.map((e, index) => <Cell key={`cell-${index}`} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(v: any) => [fmt(v), '']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-6 space-y-2 pr-2">
                                {categoryChartData.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between group cursor-pointer" onClick={() => setCategoryFilter(item.name)}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                                            <p className={`text-[10px] font-black uppercase tracking-widest transition-colors ${categoryFilter === item.name ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                                {item.name}
                                            </p>
                                        </div>
                                        <p className="text-[10px] font-black text-slate-700">{fmt(item.value as number)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}


                    <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                                <PieChartIcon size={20} />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-700">Previsão</h3>
                        </div>
                        <div className="h-80 w-full" style={{ minWidth: 0 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <PieChart>
                                    <Pie data={distributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                                        {distributionData.map((e, index) => <Cell key={`cell-${index}`} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(v: any) => [fmt(v), '']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-6 space-y-3">
                            {distributionData.map((item, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.name}</p>
                                    </div>
                                    <p className="text-xs font-black text-slate-700">{Math.round((item.value / despesasPrevistas) * 100)}%</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {showFaltaPagar && <FaltaPagarModal data={data} onClose={() => setShowFaltaPagar(false)} />}
        </div>
    );

}
