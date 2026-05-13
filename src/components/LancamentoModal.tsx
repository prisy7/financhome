import React, { useState, useEffect } from 'react';
import { X, Plus, Check, ShoppingCart, AlertTriangle } from 'lucide-react';
import { unfmt, fmt, showToast, maskMoney } from '../utils';
import { CurrencyInput } from './CurrencyInput';

interface LancamentoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { tipo: 'receitas' | 'fixas' | 'variaveis' | 'mercado' | 'gastosMes', descricao: string, valor: number, pago: boolean, semana?: number, vencimento?: number, categoriaLabel?: string }) => void;
    mercado?: { metaSemanal: number, gastosReais: number[] };
    initialType?: 'receitas' | 'gastos';
}

export function LancamentoModal({ isOpen, onClose, onSave, mercado, initialType = 'gastos' }: LancamentoModalProps) {
    const [tipo, setTipo] = useState<'receitas' | 'fixas' | 'variaveis' | 'mercado' | 'gastosMes'>('gastosMes');
    const [descricao, setDescricao] = useState('');
    const [valor, setValor] = useState('');
    const [pago, setPago] = useState(true);
    const [semana, setSemana] = useState<number>(1);
    const [vencimento, setVencimento] = useState<string>(new Date().getDate().toString());
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const categorias = [
        { id: 'personalizado', label: 'Criar Categoria', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
        { id: 'receita_principal', label: 'Receita Principal', color: 'text-emerald-700 bg-emerald-100 border-emerald-500' },
        { id: 'receita_extras', label: 'Extras', color: 'text-blue-700 bg-blue-100 border-blue-500' },
        { id: 'mercado', label: 'Mercado', icon: ShoppingCart, color: 'text-purple-700 bg-purple-100 border-purple-500' },
        { id: 'farmacia', label: 'Farmácia', color: 'text-rose-700 bg-rose-100 border-rose-500' },
        { id: 'perfumaria', label: 'Perfumaria', color: 'text-pink-700 bg-pink-100 border-pink-500' },
        { id: 'presente', label: 'Presente', color: 'text-orange-700 bg-orange-100 border-orange-500' },
        { id: 'restaurante', label: 'Restaurante/Lanche', color: 'text-amber-700 bg-amber-100 border-amber-500' },
        { id: 'passeio', label: 'Saída/Passeio', color: 'text-blue-700 bg-blue-100 border-blue-500' },
        { id: 'servicos', label: 'Serviços', color: 'text-slate-700 bg-slate-100 border-slate-500' },
        { id: 'uber', label: 'Uber/99', color: 'text-emerald-700 bg-emerald-100 border-emerald-500' },
        { id: 'utilidades', label: 'Utilidades', color: 'text-zinc-700 bg-zinc-100 border-zinc-500' },
        { id: 'agua', label: 'Água', color: 'text-cyan-700 bg-cyan-100 border-cyan-500' },
        { id: 'feira', label: 'Feira', color: 'text-lime-700 bg-lime-100 border-lime-500' },
        { id: 'ian', label: 'Ian', color: 'text-violet-700 bg-violet-100 border-violet-500' },
        { id: 'padaria', label: 'Padaria', color: 'text-yellow-700 bg-yellow-100 border-yellow-500' },
        { id: 'papelaria', label: 'Papelaria', color: 'text-teal-700 bg-teal-100 border-teal-500' },
        { id: 'delivery', label: 'Delivery', color: 'text-red-700 bg-red-100 border-red-500' },
        { id: 'vestuario', label: 'Vestuário', color: 'text-fuchsia-700 bg-fuchsia-100 border-fuchsia-500' },
        { id: 'streaming', label: 'Streaming', color: 'text-sky-700 bg-sky-100 border-sky-500' },
        { id: 'bilhete', label: 'Bilhete Único', color: 'text-blue-800 bg-blue-50 border-blue-300' },
        { id: 'doacao', label: 'Doação', color: 'text-emerald-800 bg-emerald-50 border-emerald-300' },
        { id: 'escoteiro', label: 'Escoteiro', color: 'text-amber-800 bg-amber-100 border-amber-500' },
        { id: 'extras', label: 'Gastos Extras', color: 'text-gray-700 bg-gray-100 border-gray-400' },
        { id: 'terreiro', label: 'Terreiro Pri', color: 'text-purple-800 bg-purple-100 border-purple-500' },
        { id: 'saude', label: 'Saúde/Médico', color: 'text-red-600 bg-red-100 border-red-400' },
        { id: 'educacao', label: 'Educação/Cursos', color: 'text-blue-800 bg-blue-100 border-blue-400' },
        { id: 'combustivel', label: 'Combustível/Transporte', color: 'text-slate-800 bg-slate-100 border-slate-400' },
        { id: 'manutencao', label: 'Manutenção / Casa', color: 'text-orange-800 bg-orange-100 border-orange-400' },
        { id: 'internet', label: 'Internet / TV', color: 'text-sky-800 bg-sky-100 border-sky-500' },
        { id: 'limpeza', label: 'Limpeza / Diarista', color: 'text-emerald-700 bg-emerald-100 border-emerald-500' },
        { id: 'beleza', label: 'Beleza / Salão', color: 'text-pink-600 bg-pink-50 border-pink-300' },
        { id: 'festa', label: 'Festa / Aniversário', color: 'text-pink-800 bg-pink-100 border-pink-400' },
        { id: 'outros', label: 'Outros', color: 'text-slate-700 bg-slate-100 border-slate-500' }
    ];

    const [selectedCat, setSelectedCat] = useState<string | null>(null);
    const [customCat, setCustomCat] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedCat(null);
            setCustomCat('');
            setShowCustomInput(false);
            setDescricao('');
            setValor('');
            setPago(true);
            const today = new Date();
            const dia = today.getDate();
            setVencimento(dia.toString());
            const todayStr = today.toISOString().split('T')[0];
            setSelectedDate(todayStr);
            const calcSemana = dia <= 7 ? 1 : dia <= 14 ? 2 : dia <= 21 ? 3 : dia <= 28 ? 4 : 5;
            setSemana(calcSemana);
        }
    }, [isOpen]); // Removed initialType from deps to avoid multiple resets if it changes while open

    if (!isOpen) return null;

    const filteredCategorias = initialType === 'receitas' 
        ? categorias.filter(c => c.id.startsWith('receita_') || c.id === 'personalizado')
        : categorias.filter(c => !c.id.startsWith('receita_'));

    const handleSave = () => {
        if (!selectedCat) {
            showToast('Selecione uma categoria antes de salvar.', 'error');
            return;
        }

        const descTrimmed = descricao.trim();
        const valorNum = unfmt(valor);
        
        if (selectedCat === 'personalizado' && !customCat.trim()) {
            showToast('Digite o nome da categoria personalizada.', 'error');
            return;
        }

        if (valorNum <= 0) {
            showToast('O valor deve ser maior que zero.', 'error');
            return;
        }

        let sysTipo: 'receitas' | 'fixas' | 'variaveis' | 'mercado' | 'gastosMes' = 'gastosMes';
        let finalSemana = semana;

        if (selectedCat === 'mercado') {
            sysTipo = 'mercado';
            const dateObj = new Date(selectedDate + 'T12:00:00');
            const day = dateObj.getDate();
            finalSemana = day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : day <= 28 ? 4 : 5;
        }
        else if (selectedCat === 'receita_principal' || selectedCat === 'receita_extras' || selectedCat === 'receita' || selectedCat === 'extras_entrada') sysTipo = 'receitas';
        else if (selectedCat === 'conta') sysTipo = 'fixas';

        const catObj = categorias.find(c => c.id === selectedCat);
        const catLabel = selectedCat === 'personalizado' ? customCat.trim() : (catObj?.label || 'Lançamento');
        const finalDesc = descTrimmed || catLabel;
        
        onSave({ 
            tipo: sysTipo, 
            descricao: sysTipo === 'gastosMes' && !finalDesc.startsWith('[') ? `[${catLabel}] ${finalDesc}` : finalDesc, 
            valor: valorNum, 
            pago,
            semana: sysTipo === 'mercado' ? finalSemana : undefined,
            vencimento: vencimento ? parseInt(vencimento) : undefined,
            categoriaLabel: catLabel
        });
    };

    const renderMercadoWarning = () => {
        if (selectedCat !== 'mercado' || !mercado) return null;

        const valDigitado = unfmt(valor);
        const gastoAtual = mercado.gastosReais[semana - 1] || 0;
        const totalSimulado = gastoAtual + valDigitado;
        const percent = mercado.metaSemanal > 0 ? (totalSimulado / mercado.metaSemanal) * 100 : 0;
        const remaining = mercado.metaSemanal - totalSimulado;

        let warningClass = "bg-blue-50 text-blue-800 border-blue-200";
        let message = `Sua meta semanal é de ${fmt(mercado.metaSemanal)}. Com este gasto, sobrarão ${fmt(remaining)}.`;
        
        if (percent > 100) {
            warningClass = "bg-rose-50 text-rose-800 border-rose-200";
            message = `Atenção! Este gasto fará você estourar a meta da semana em ${fmt(Math.abs(remaining))}.`;
        } else if (percent > 80) {
            warningClass = "bg-amber-50 text-amber-800 border-amber-200";
            message = `Cuidado! Você está chegando perto da meta da semana. Sobrarão apenas ${fmt(remaining)}.`;
        }

        return (
            <div className={`mt-4 p-3 rounded-lg border text-sm flex gap-3 items-start ${warningClass}`}>
                <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
                <div>
                    <p className="font-semibold mb-1">Status da Semana {semana}</p>
                    <p className="opacity-90">{message}</p>
                    <div className="w-full bg-black/10 rounded-full h-1.5 mt-2">
                        <div 
                            className={`h-1.5 rounded-full ${percent > 100 ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-blue-500'}`} 
                            style={{ width: `${Math.min(percent, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 fade-in">
            <div className="bg-white p-6 rounded-xl shadow-2xl max-w-lg w-full border border-slate-100 relative max-h-[90vh] overflow-y-auto">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition p-1"
                >
                    <X size={20} />
                </button>
                
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-800">{initialType === 'receitas' ? 'Lançar Receita / Entrada' : 'Novo Gasto'}</h3>
                    <p className="text-sm text-slate-500">{initialType === 'receitas' ? 'Registre seus ganhos e extras.' : 'Adicione uma nova transação rapidamente.'}</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Categoria</label>
                            <button 
                                onClick={() => {
                                    setSelectedCat('personalizado');
                                    setShowCustomInput(true);
                                }}
                                className="text-indigo-600 flex items-center gap-1 text-[10px] font-black uppercase hover:underline p-1"
                                type="button"
                            >
                                <Plus size={12} strokeWidth={3} /> Nova Categoria
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 hide-scrollbar">
                            {filteredCategorias.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        setSelectedCat(cat.id);
                                        setShowCustomInput(cat.id === 'personalizado');
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                        selectedCat === cat.id 
                                            ? `${cat.color} ring-2 ring-offset-1 ring-current` 
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                    type="button"
                                >
                                    <span className="flex items-center gap-1">
                                        {cat.id === 'personalizado' && <Plus size={12} />}
                                        {cat.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {showCustomInput && (
                        <div className="fade-in">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Nova Categoria</label>
                            <input 
                                type="text" 
                                value={customCat} 
                                onChange={e => setCustomCat(e.target.value)} 
                                className="w-full border border-indigo-200 p-3 rounded-lg text-sm focus:ring-4 focus:ring-indigo-100 outline-none bg-indigo-50/30 text-slate-800 placeholder:text-slate-400 font-bold" 
                                placeholder="Ex: Aniversário, IPVA, etc..."
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 items-end">
                        <div className="fade-in h-full flex flex-col justify-end">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 leading-tight">Escolha a Data</label>
                            <input 
                                type="date" 
                                value={selectedDate} 
                                onChange={e => {
                                    setSelectedDate(e.target.value);
                                    const dateObj = new Date(e.target.value + 'T12:00:00');
                                    setVencimento(dateObj.getDate().toString());
                                }} 
                                className="w-full border border-slate-300 p-2 text-sm outline-none focus:ring-4 focus:ring-blue-100 bg-white text-slate-800 font-bold rounded-lg h-[42px]" 
                            />
                        </div>

                        <div className="h-full flex flex-col justify-end">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Valor (R$)</label>
                            <CurrencyInput 
                                inputMode="decimal"
                                value={valor} 
                                onChangeValue={(val) => setValor(val.toString())} 
                                className="w-full border border-slate-300 p-2 rounded-lg text-lg text-right font-bold focus:ring-4 focus:ring-blue-100 outline-none bg-white text-slate-800 h-[42px]" 
                                placeholder="0,00" 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição {selectedCat === 'mercado' && '(Opcional)'}</label>
                        <input 
                            type="text" 
                            value={descricao} 
                            onChange={e => setDescricao(e.target.value)} 
                            onFocus={(e) => e.target.select()}
                            className="w-full border border-slate-300 p-3 rounded-lg text-sm focus:ring-4 focus:ring-blue-100 outline-none bg-white text-slate-800" 
                            placeholder={selectedCat === 'mercado' ? 'Ex: Compras da semana' : selectedCat === 'receita' ? 'Ex: Venda de produto' : 'Ex: Farmácia, Estacionamento...'} 
                        />
                    </div>

                    {renderMercadoWarning()}

                    {selectedCat !== 'mercado' && (
                        <div className="pt-2">
                            <label className="flex items-center cursor-pointer group w-max">
                                <div className="relative flex-shrink-0">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only" 
                                        checked={pago} 
                                        onChange={() => setPago(!pago)}
                                    />
                                    <div className={`block w-10 h-6 rounded-full transition ${pago ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${pago ? 'translate-x-4' : ''}`}></div>
                                </div>
                                <div className="ml-3 font-medium text-sm text-slate-700 select-none">
                                    {selectedCat === 'receita' ? 'Dinheiro já recebido' : 'Valor já pago'}
                                </div>
                            </label>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex gap-3">
                    <button 
                        onClick={onClose} 
                        className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave} 
                        className="flex-1 px-4 py-3 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-md flex items-center justify-center gap-2"
                    >
                        <Check size={18} /> Salvar
                    </button>
                </div>
            </div>
        </div>
    );
}
