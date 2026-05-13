import React from 'react';
import { OrcamentoData } from '../types';
import { fmt } from '../utils';
import { X, Calendar } from 'lucide-react';

interface FaltaPagarModalProps {
    data: OrcamentoData;
    onClose: () => void;
}

export function FaltaPagarModal({ data, onClose }: FaltaPagarModalProps) {
    const getUnpaid = (items: any[]) => items.filter(i => !i.paid);

    const allUnpaid = [
        ...getUnpaid(data.fixas).map(i => ({ ...i, type: 'Fixa' })),
        ...getUnpaid(data.variaveis).map(i => ({ ...i, type: 'Variável' })),
        ...getUnpaid(data.gastosMes || []).map(i => ({ ...i, type: 'Gasto do Mês' })),
        ...getUnpaid(data.dividas).map(i => ({ ...i, type: 'Dívida' }))
    ];

    // Agrupar por dia
    const grouped: { [key: string]: any[] } = {};
    allUnpaid.forEach(item => {
        const dia = item.vencimento ? item.vencimento.toString() : 'A Definir';
        if (!grouped[dia]) grouped[dia] = [];
        grouped[dia].push(item);
    });

    const sortedDays = Object.keys(grouped).sort((a, b) => {
        if (a === 'A Definir') return 1;
        if (b === 'A Definir') return -1;
        return parseInt(a) - parseInt(b);
    });

    const totalFalta = allUnpaid.reduce((sum, item) => sum + item.v, 0);

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <Calendar size={18} className="text-rose-500" />
                            Calendário de Pagamentos
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total pendente: {fmt(totalFalta)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-grow bg-slate-50/50">
                    {allUnpaid.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                                <Calendar size={32} />
                            </div>
                            <p className="text-lg font-bold text-slate-700">Tudo em dia!</p>
                            <p className="text-sm text-slate-500">Nenhum pagamento pendente para este mês.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {sortedDays.map(dia => (
                                <div key={dia} className="relative">
                                    <div className="flex items-center gap-6 mb-6 sticky top-0 bg-transparent z-10">
                                        <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shadow-md border ${dia === 'A Definir' ? 'bg-slate-200 border-slate-300 text-slate-600' : 'bg-white border-rose-100 text-rose-600 shadow-rose-100'}`}>
                                            <span className="text-[8px] font-black uppercase leading-none mb-1 tracking-widest">{dia === 'A Definir' ? 'S/' : 'Dia'}</span>
                                            <span className="text-xl font-black leading-none">{dia === 'A Definir' ? '?' : dia}</span>
                                        </div>
                                        <div className="flex-grow">
                                            <div className="h-px bg-slate-200 w-full mb-1"></div>
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                                                {grouped[dia].length} {grouped[dia].length === 1 ? 'Compromisso' : 'Compromissos'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 pl-4 border-l-2 border-slate-100 ml-6 pb-6">
                                        {grouped[dia].map((item, idx) => (
                                            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center hover:border-rose-200 transition-all group overflow-hidden relative">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-0.5">{item.type}</span>
                                                    <span className="text-sm font-black text-slate-800 tracking-tight">{item.d}</span>
                                                    {item.parcelaAtual && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="bg-rose-50 text-rose-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Parc. {item.parcelaAtual}/{item.totalParcelas}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-rose-600 tracking-tighter">{fmt(item.v)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="p-4 bg-white border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Organize seus pagamentos por dia para evitar juros e multas.</p>
                </div>
            </div>
        </div>
    );
}
