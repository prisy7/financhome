import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Info, CheckCircle2, Circle, Trash2, Edit2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { MONTH_MAP, fmt } from '../utils';
import { CurrencyInput } from './CurrencyInput';

interface TabCalendarioProps {
    data: any;
    setData: (data: any) => void;
    saveData: (data: any) => void;
    monthName: string;
    onClose: () => void;
}

export function TabCalendario({ data, setData, saveData, monthName, onClose }: TabCalendarioProps) {
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    // Parse month name to get actual date info
    const { month, year } = useMemo(() => {
        const parts = monthName.toLowerCase().split(' ');
        let m = new Date().getMonth();
        let y = new Date().getFullYear();

        if (parts.length >= 1) {
            if (MONTH_MAP[parts[0]] !== undefined) {
                 m = MONTH_MAP[parts[0]];
            }
            if (parts.length >= 2) {
                const parsedYear = parseInt(parts[1], 10);
                if (!isNaN(parsedYear)) {
                    y = parsedYear;
                }
            }
        }
        return { month: m, year: y };
    }, [monthName]);

    const dateReference = new Date(year, month, 1);
    const startDate = startOfMonth(dateReference);
    const endDate = endOfMonth(dateReference);
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
    const startDayOfWeek = getDay(startDate); // 0 = Sunday, 1 = Monday...

    // Combine all items with vencimento (Filter: Only fixas and variaveis as requested)
    const allItems = useMemo(() => {
        if (!data) return [];
        return [
            ...data.fixas.filter((i: any) => i.vencimento).map((i: any) => ({ ...i, tipo: 'fixas', typeLabel: 'Fixa', typeColor: 'bg-indigo-50 text-indigo-600 border-indigo-100' })),
            ...data.variaveis.filter((i: any) => i.vencimento).map((i: any) => ({ ...i, tipo: 'variaveis', typeLabel: 'Variável', typeColor: 'bg-amber-50 text-amber-600 border-amber-100' })),
        ];
    }, [data]);

    const itemsByDay = useMemo(() => {
        const map: Record<number, any[]> = {};
        allItems.forEach(item => {
            const day = item.vencimento;
            if (day && day >= 1 && day <= 31) {
                if (!map[day]) map[day] = [];
                map[day].push(item);
            }
        });
        return map;
    }, [allItems]);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const handleTogglePaid = (item: any) => {
        const newData = { ...data };
        const list = newData[item.tipo];
        if (list) {
            const target = list.find((i: any) => i.id === item.id);
            if (target) {
                target.paid = !target.paid;
                setData(newData);
                saveData(newData);
            }
        }
    };

    const handleUpdateItem = (item: any, field: string, value: any) => {
        const newData = { ...data };
        const list = newData[item.tipo];
        if (list) {
            const target = list.find((i: any) => i.id === item.id);
            if (target) {
                target[field] = value;
                setData(newData);
                saveData(newData);
            }
        }
    };

    const emptySlots = Array.from({ length: startDayOfWeek }, (_, i) => i);
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const selectedItems = selectedDay ? itemsByDay[selectedDay] || [] : [];

    const { totalDia, totalSemana, totalMesPendente } = useMemo(() => {
        if (selectedDay === null) {
            const monthlyPendingTotal = allItems.reduce((acc, curr) => {
                if (!curr.paid) return acc + curr.v;
                return acc;
            }, 0);
            return { totalDia: 0, totalSemana: 0, totalMesPendente: monthlyPendingTotal };
        }
        
        const selectedDate = new Date(year, month, selectedDay);
        const startW = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday
        const endW = endOfWeek(selectedDate, { weekStartsOn: 0 });
        
        const dayTotal = (itemsByDay[selectedDay] || []).reduce((acc, curr) => acc + curr.v, 0);
        
        const weekTotal = allItems.reduce((acc, curr) => {
            if (!curr.vencimento) return acc;
            const itemDate = new Date(year, month, curr.vencimento);
            if (itemDate >= startW && itemDate <= endW) {
                return acc + curr.v;
            }
            return acc;
        }, 0);

        const monthlyPendingTotal = allItems.reduce((acc, curr) => {
            if (!curr.paid) return acc + curr.v;
            return acc;
        }, 0);
        
        return { totalDia: dayTotal, totalSemana: weekTotal, totalMesPendente: monthlyPendingTotal };
    }, [selectedDay, itemsByDay, allItems, year, month]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-7xl rounded-[2.5rem] shadow-2xl flex flex-col animate-in fade-in zoom-in duration-300">
                {/* Header do Modal */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Calendar size={24} />
                        </div>
                        <div>
                            Calendário de Pagamentos
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                {format(dateReference, 'MMMM yyyy', { locale: ptBR })} • {allItems.length} Contas Programadas
                            </p>
                        </div>
                    </h2>
                    <button 
                        onClick={onClose}
                        className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center font-black"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 p-6 md:p-8">
                    <div className="flex flex-col gap-8 h-full">
                        
                        {/* Calendar View */}
                        <div className="flex-1 min-w-0">
                            <div className="grid grid-cols-7 gap-2 md:gap-4 text-center mb-4">
                                {weekDays.map(day => (
                                    <div key={day} className="text-[10px] md:text-xs font-black uppercase text-slate-300 tracking-widest">{day}</div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-2 md:gap-3">
                                {emptySlots.map(slot => (
                                    <div key={`empty-${slot}`} className="h-16 md:h-24 rounded-2xl bg-slate-50/30"></div>
                                ))}
                                
                                {daysInMonth.map(date => {
                                    const day = date.getDate();
                                    const dayItems = itemsByDay[day] || [];
                                    const isSelected = selectedDay === day;
                                    const hasUnpaid = dayItems.some(i => !i.paid);
                                    const isTodayDate = isToday(date);
                                    
                                    return (
                                        <button
                                            key={day}
                                            onClick={() => setSelectedDay(day)}
                                            className={`relative flex flex-col h-16 md:h-24 rounded-xl md:rounded-2xl p-1 md:p-2 border-2 transition-all duration-200 outline-none
                                                ${isSelected ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-50 hover:border-slate-200 bg-white'}
                                                ${isTodayDate && !isSelected ? 'border-amber-200 bg-amber-50/30' : ''}
                                            `}
                                        >
                                            <span className={`text-xs font-black ml-1 text-left ${isTodayDate ? 'text-amber-600' : 'text-slate-400'}`}>
                                                {day}
                                            </span>
                                            
                                            <div className="mt-1 flex-1 flex flex-col gap-1 overflow-hidden">
                                                {dayItems.slice(0, 2).map((item, idx) => (
                                                    <div key={idx} className={`w-full text-[8.5px] md:text-[9.5px] leading-tight px-1 py-0.5 rounded-md text-left border truncate ${item.paid ? 'opacity-40 grayscale line-through border-transparent bg-slate-100 text-slate-500' : item.typeColor} font-black transition-all shadow-sm`}>
                                                        {item.d}
                                                    </div>
                                                ))}
                                                {dayItems.length > 2 && (
                                                    <div className="text-[8px] text-slate-300 font-black text-left ml-1">
                                                        +{dayItems.length - 2}
                                                    </div>
                                                )}
                                            </div>

                                            {hasUnpaid && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm"></span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Day Details View - Below Calendar */}
                        <div className="w-full">
                            <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                                {selectedDay === null ? (
                                    <div className="text-center py-8 text-slate-400 font-black text-sm uppercase tracking-widest">
                                        Selecione um dia para ver os detalhes
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-6">
                                        {/* Top: Header and Summary */}
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center font-black text-indigo-600 text-2xl border border-slate-100">
                                                    {selectedDay}
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight leading-none mb-1 flex items-baseline gap-2">
                                                        <span>{format(new Date(year, month, selectedDay), 'EEEE', { locale: ptBR })}</span>
                                                        <span className="text-sm text-slate-400 font-normal">{format(new Date(year, month, selectedDay), "dd 'de' MMMM", { locale: ptBR })}</span>
                                                    </h3>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 shrink-0">
                                                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center whitespace-nowrap min-w-[120px]">
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mr-2">Total Dia:</p>
                                                    <p className="text-sm font-black text-slate-800 tracking-tight">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDia)}
                                                    </p>
                                                </div>
                                                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center whitespace-nowrap min-w-[120px]">
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mr-2">Total Semana:</p>
                                                    <p className="text-sm font-black text-slate-800 tracking-tight">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSemana)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom: Items List */}
                                        <div className="space-y-2">
                                            {selectedItems.length === 0 ? (
                                                <div className="text-center text-slate-400 text-[10px] font-black uppercase tracking-widest py-10 bg-white rounded-2xl border border-slate-100 border-dashed">
                                                    Nada pendente<br/>para este dia.
                                                </div>
                                            ) : (
                                                selectedItems.sort((a,b) => (a.paid === b.paid ? 0 : a.paid ? 1 : -1)).map((item, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        className={`bg-white px-2 py-1 rounded-lg border shadow-sm transition-all duration-200 group
                                                            ${item.paid ? 'border-slate-50 opacity-60' : 'border-slate-200 hover:border-indigo-300'}
                                                        `}
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            <button 
                                                                onClick={() => handleTogglePaid(item)}
                                                                className={`shrink-0 transition-colors ${item.paid ? 'text-emerald-500' : 'text-slate-200 hover:text-slate-400'}`}
                                                            >
                                                                {item.paid ? <CheckCircle2 size={16} className="fill-emerald-50 text-emerald-500" strokeWidth={3} /> : <Circle size={16} strokeWidth={3} />}
                                                            </button>
                                                            <div className="flex-1 min-w-0 flex items-center gap-1.5">
                                                                <span className={`px-1 py-0.5 border rounded-[4px] text-[7px] font-black uppercase tracking-tighter shrink-0 ${item.typeColor}`}>
                                                                    {item.typeLabel}
                                                                </span>
                                                                <input 
                                                                    type="text"
                                                                    value={item.d}
                                                                    onChange={(e) => handleUpdateItem(item, 'd', e.target.value)}
                                                                    className={`w-full bg-transparent border-none p-0 focus:ring-0 text-[10px] uppercase tracking-tight leading-tight ${item.paid ? 'text-slate-400 line-through' : 'text-slate-800'}`}
                                                                />
                                                            </div>
                                                            <div className={`text-right shrink-0 ${item.paid ? 'text-slate-400' : 'text-slate-800'}`}>
                                                                <div className="w-[50px]">
                                                                    <CurrencyInput
                                                                        value={item.v}
                                                                        onChangeValue={(val) => handleUpdateItem(item, 'v', val)}
                                                                        className={`w-full bg-transparent border-none p-0 text-right focus:ring-0 text-[10px] tracking-tight ${item.paid ? 'text-slate-400' : 'text-slate-800'}`}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
