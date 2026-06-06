import React from 'react';
import { Plus, Wallet, CheckCircle2, Circle, LayoutGrid, CalendarClock } from 'lucide-react';
import { startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { calcularSaldoReal, fmt } from '../utils';

interface MobileHomeProps {
    data: any;
    monthName: string;
    onLancar: () => void;
    onModoCompleto: () => void;
    setData: (data: any) => void;
    saveData: (data: any) => void;
}

export function MobileHome({ data, monthName, onLancar, onModoCompleto, setData, saveData }: MobileHomeProps) {
    if (!data) return null;

    const saldo = calcularSaldoReal(data);
    const saldoInicial = data?.receitas?.find((i: any) => i.id === 1 || i.id === '1')?.v || 0;

    const hoje = new Date();
    const diasDaSemana = eachDayOfInterval({
        start: startOfWeek(hoje, { weekStartsOn: 0 }),
        end: endOfWeek(hoje, { weekStartsOn: 0 })
    });
    const diasSet = new Set(diasDaSemana.map(d => d.getDate()));

    const compromissos = [
        ...(data.fixas || []).filter((i: any) => i.vencimento && diasSet.has(i.vencimento)).map((i: any) => ({ ...i, tipo: 'fixas' })),
        ...(data.variaveis || []).filter((i: any) => i.vencimento && diasSet.has(i.vencimento)).map((i: any) => ({ ...i, tipo: 'variaveis' })),
    ].sort((a, b) => ((a.paid ? 1 : 0) - (b.paid ? 1 : 0)) || (a.vencimento - b.vencimento));

    const totalPendente = compromissos.filter(i => !i.paid).reduce((s, i) => s + i.v, 0);

    const togglePaid = (item: any) => {
        const newData = { ...data };
        const list = newData[item.tipo];
        const target = list?.find((i: any) => i.id === item.id);
        if (target) {
            target.paid = !target.paid;
            setData(newData);
            saveData(newData);
        }
    };

    return (
        <div className="fade-in flex flex-col gap-5 max-w-md mx-auto w-full">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-3">
                    <Wallet size={24} />
                </div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">Saldo · {monthName}</p>
                <p className={`text-3xl font-black tracking-tight mt-2 ${saldo >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>{fmt(saldo)}</p>
                <p className="text-[11px] font-bold text-slate-400 mt-2">Saldo inicial: <span className="text-slate-600">{fmt(saldoInicial)}</span></p>
            </div>

            <button
                onClick={onLancar}
                className="h-16 w-full bg-emerald-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-base flex items-center justify-center gap-3 hover:bg-emerald-600 transition shadow-lg shadow-emerald-100 active:scale-95 border border-emerald-400"
            >
                <Plus size={24} strokeWidth={3} /> Lançar gasto
            </button>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                        <CalendarClock size={16} className="text-indigo-500" />
                        <h3 className="text-[12px] font-black text-slate-700 uppercase tracking-widest">Compromissos da semana</h3>
                    </div>
                    {totalPendente > 0 && (
                        <span className="text-[11px] font-black text-rose-500">{fmt(totalPendente)}</span>
                    )}
                </div>

                <div className="divide-y divide-slate-50">
                    {compromissos.length === 0 ? (
                        <p className="px-5 py-8 text-center text-[12px] font-bold text-slate-400">Nenhum vencimento nesta semana 🎉</p>
                    ) : (
                        compromissos.map((item) => (
                            <button
                                key={`${item.tipo}-${item.id}`}
                                onClick={() => togglePaid(item)}
                                className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50/50 transition active:scale-[0.99]"
                            >
                                {item.paid
                                    ? <CheckCircle2 size={22} className="text-emerald-500 shrink-0" />
                                    : <Circle size={22} className="text-slate-300 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-bold truncate ${item.paid ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.d}</p>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Dia {item.vencimento}</p>
                                </div>
                                <span className={`text-sm font-black shrink-0 ${item.paid ? 'text-slate-300' : 'text-slate-700'}`}>{fmt(item.v)}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            <button
                onClick={onModoCompleto}
                className="h-12 w-full flex items-center justify-center gap-2 text-[12px] font-black text-slate-500 bg-white border border-slate-200 rounded-[1.5rem] hover:bg-slate-50 transition active:scale-95 uppercase tracking-widest"
            >
                <LayoutGrid size={16} /> Modo completo
            </button>
        </div>
    );
}
