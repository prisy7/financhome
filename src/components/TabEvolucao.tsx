import React from 'react';
import { MonthInfo } from '../types';
import { fmt, calcularSaldoReal } from '../utils';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Wallet } from 'lucide-react';

interface TabEvolucaoProps {
    availableMonths: MonthInfo[];
}

export function TabEvolucao({ availableMonths }: TabEvolucaoProps) {
    // Sort months chronologically for the chart
    const sortedMonths = [...availableMonths].sort((a, b) => a.id.localeCompare(b.id));

    const chartData = sortedMonths.map(m => {
        let receitas = 0;
        let despesas = 0;
        let saldo = 0;
        try {
            const raw = localStorage.getItem('orcamento_data_' + m.id);
            if (raw) {
                const md = JSON.parse(raw);
                receitas = (md.receitas || []).filter((i:any)=>i.paid).reduce((acc:number,curr:any)=>acc+curr.v, 0);
                despesas = [
                    ...(md.fixas || []).filter((i:any)=>i.paid),
                    ...(md.variaveis || []).filter((i:any)=>i.paid),
                    ...(md.gastosMesHistorico || []).filter((i:any)=>i.paid),
                    ...(md.dividas || []).filter((i:any)=>i.paid)
                ].reduce((acc:number,curr:any)=>acc+curr.v, 0);
                saldo = calcularSaldoReal(md);
            }
        } catch (e) {}

        return {
            name: m.name,
            receitas,
            despesas,
            saldo,
            taxa: receitas > 0 ? Number(((despesas / receitas) * 100).toFixed(1)) : 0
        };
    });

    return (
        <div className="fade-in space-y-6">
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <h3 className="text-base md:text-lg font-black uppercase tracking-widest text-slate-800 italic">Evolução Mensal</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Comparativo de performance e comprometimento financeiro</p>
                        </div>
                    </div>

                    {chartData.length >= 2 && (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                                <Wallet className="w-4 h-4 text-indigo-500" />
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">Saldo Acumulado: {fmt(chartData.reduce((acc, curr) => acc + curr.saldo, 0))}</span>
                            </div>
                            {chartData.length > 0 && (
                                <div className={`flex items-center gap-2 p-3 rounded-2xl border ${chartData[chartData.length-1].taxa <= 70 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                                    <span className="text-[10px] font-black uppercase tracking-tight">Comprometimento: {chartData[chartData.length-1].taxa}%</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {chartData.length < 2 ? (
                    <div className="p-20 text-center">
                        <p className="text-sm font-black text-slate-300 uppercase tracking-[0.4em] italic">Salve mais meses para ver a evolução.</p>
                    </div>
                ) : (
                    <div className="h-[450px] w-full" style={{ minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 11, fontWeight: 900, fill: '#64748b' }} 
                                    dy={10}
                                />
                                <YAxis 
                                    yAxisId="left"
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                                    tickFormatter={(v) => `R$ ${v/1000}k`} 
                                />
                                <YAxis 
                                    yAxisId="right"
                                    orientation="right"
                                    domain={[0, 100]}
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
                                    tickFormatter={(v) => `${v}%`} 
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                                    cursor={{ fill: '#f8fafc' }}
                                    formatter={(v: any, name: string) => [
                                        name === 'taxa' ? `${v}%` : fmt(v), 
                                        name === 'saldo' ? 'Saldo Líquido' : name === 'taxa' ? 'Comprometimento' : name
                                    ]}
                                />
                                <Legend 
                                    verticalAlign="top" 
                                    align="right" 
                                    height={36}
                                    iconType="circle"
                                    formatter={(value: string) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{value === 'saldo' ? 'Saldo Líquido' : value === 'taxa' ? '% Gastos' : value}</span>}
                                />
                                <Bar yAxisId="left" dataKey="receitas" name="Receitas" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
                                <Bar yAxisId="left" dataKey="despesas" name="Despesas" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={24} />
                                <Line 
                                    yAxisId="left"
                                    type="monotone" 
                                    dataKey="saldo" 
                                    name="saldo" 
                                    stroke="#3b82f6" 
                                    strokeWidth={4} 
                                    dot={{ r: 6, fill: '#3b82f6', strokeWidth: 0 }}
                                    activeDot={{ r: 8, strokeWidth: 0 }}
                                />
                                <Line 
                                    yAxisId="right"
                                    type="monotone" 
                                    dataKey="taxa" 
                                    name="taxa" 
                                    stroke="#94a3b8" 
                                    strokeWidth={2} 
                                    strokeDasharray="5 5"
                                    dot={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}
