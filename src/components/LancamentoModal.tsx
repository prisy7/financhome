import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, Plus, Check, ShoppingCart, AlertTriangle, 
    Apple, Pill, Stethoscope, Droplets, Globe, 
    Trash2, Hammer, Wrench, Fuel, Car, 
    Ticket, Utensils, Bike, Coffee, Gift, 
    Map, Tv, GraduationCap, Pen, Shirt, 
    Scissors, Sparkles, Baby, Tent, Moon, 
    Heart, PartyPopper, Box, Clock, Zap, 
    MoreHorizontal, Search
} from 'lucide-react';
import { unfmt, fmt, showToast, maskMoney } from '../utils';
import { CurrencyInput } from './CurrencyInput';

interface LancamentoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { tipo: 'receitas' | 'fixas' | 'variaveis' | 'mercado' | 'gastosMes', descricao: string, valor: number, pago: boolean, semana?: number, vencimento?: number, categoriaLabel?: string }) => void;
    mercado?: { metaSemanal: number, gastosReais: number[] };
    initialType?: 'receitas' | 'gastos' | 'mercado';
}

interface Category {
    id: string;
    label: string;
    group?: string;
    color: string;
    icon?: any;
    isCustom?: boolean;
}

export function LancamentoModal({ isOpen, onClose, onSave, mercado, initialType = 'gastos' }: LancamentoModalProps) {
    const [tipo, setTipo] = useState<'receitas' | 'fixas' | 'variaveis' | 'mercado' | 'gastosMes'>('gastosMes');
    const [descricao, setDescricao] = useState('');
    const [valor, setValor] = useState('');
    const [pago, setPago] = useState(true);
    const [semana, setSemana] = useState<number>(1);
    const [vencimento, setVencimento] = useState<string>(new Date().getDate().toString());
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const [customCategories, setCustomCategories] = useState<Category[]>([]);
    const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
    const [deleteMode, setDeleteMode] = useState(false);

    useEffect(() => {
        try {
            const savedCustom = localStorage.getItem('financask_custom_categories');
            if (savedCustom) setCustomCategories(JSON.parse(savedCustom));
            
            const savedHidden = localStorage.getItem('financask_hidden_categories');
            if (savedHidden) setHiddenCategories(JSON.parse(savedHidden));
        } catch(e) {}
    }, []);

    const baseCategorias: Category[] = [
        { id: 'personalizado', label: 'Criar Categoria', group: 'Ações', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
        { id: 'receita_principal', label: 'Receita Principal', group: 'Receitas', color: 'text-emerald-700 bg-emerald-100 border-emerald-500' },
        { id: 'receita_extras', label: 'Extras', group: 'Receitas', color: 'text-blue-700 bg-blue-100 border-blue-500' },
        { id: 'mercado', label: 'Mercado', group: 'Essenciais', color: 'text-purple-700 bg-purple-100 border-purple-500' },
        { id: 'feira', label: 'Feira', group: 'Essenciais', color: 'text-lime-700 bg-lime-100 border-lime-500' },
        { id: 'farmacia', label: 'Farmácia', group: 'Saúde', color: 'text-rose-700 bg-rose-100 border-rose-500' },
        { id: 'saude', label: 'Saúde/Médico', group: 'Saúde', color: 'text-red-600 bg-red-100 border-red-400' },
        { id: 'agua', label: 'Água', group: 'Contas', color: 'text-cyan-700 bg-cyan-100 border-cyan-500' },
        { id: 'internet', label: 'Internet / TV', group: 'Contas', color: 'text-sky-800 bg-sky-100 border-sky-500' },
        { id: 'limpeza', label: 'Limpeza / Diarista', group: 'Serviços', color: 'text-emerald-700 bg-emerald-100 border-emerald-500' },
        { id: 'manutencao', label: 'Manutenção / Casa', group: 'Serviços', color: 'text-orange-800 bg-orange-100 border-orange-400' },
        { id: 'servicos', label: 'Serviços', group: 'Serviços', color: 'text-slate-700 bg-slate-100 border-slate-500' },
        { id: 'combustivel', label: 'Combustível/Transporte', group: 'Transporte', color: 'text-slate-800 bg-slate-100 border-slate-400' },
        { id: 'uber', label: 'Uber/99', group: 'Transporte', color: 'text-emerald-700 bg-emerald-100 border-emerald-500' },
        { id: 'bilhete', label: 'Bilhete Único', group: 'Transporte', color: 'text-blue-800 bg-blue-50 border-blue-300' },
        { id: 'restaurante', label: 'Restaurante/Lanche', group: 'Alimentação', color: 'text-amber-700 bg-amber-100 border-amber-500' },
        { id: 'delivery', label: 'Delivery', group: 'Alimentação', color: 'text-red-700 bg-red-100 border-red-500' },
        { id: 'padaria', label: 'Padaria', group: 'Alimentação', color: 'text-yellow-700 bg-yellow-100 border-yellow-500' },
        { id: 'presente', label: 'Presente', group: 'Lazer', color: 'text-orange-700 bg-orange-100 border-orange-500' },
        { id: 'passeio', label: 'Saída/Passeio', group: 'Lazer', color: 'text-blue-700 bg-blue-100 border-blue-500' },
        { id: 'streaming', label: 'Streaming', group: 'Lazer', color: 'text-sky-700 bg-sky-100 border-sky-500' },
        { id: 'educacao', label: 'Educação/Cursos', group: 'Educação', color: 'text-blue-800 bg-blue-100 border-blue-400' },
        { id: 'papelaria', label: 'Papelaria', group: 'Educação', color: 'text-teal-700 bg-teal-100 border-teal-500' },
        { id: 'vestuario', label: 'Vestuário', group: 'Pessoal', color: 'text-fuchsia-700 bg-fuchsia-100 border-fuchsia-500' },
        { id: 'beleza', label: 'Beleza / Salão', group: 'Pessoal', color: 'text-pink-600 bg-pink-50 border-pink-300' },
        { id: 'perfumaria', label: 'Perfumaria', group: 'Pessoal', color: 'text-pink-700 bg-pink-100 border-pink-500' },
        { id: 'ian', label: 'Ian', group: 'Família', color: 'text-violet-700 bg-violet-100 border-violet-500' },
        { id: 'escoteiro', label: 'Escoteiro', group: 'Família', color: 'text-amber-800 bg-amber-100 border-amber-500' },
        { id: 'terreiro', label: 'Terreiro Pri', group: 'Religião', color: 'text-purple-800 bg-purple-100 border-purple-500' },
        { id: 'doacao', label: 'Doação', group: 'Pessoal', color: 'text-emerald-800 bg-emerald-50 border-emerald-300' },
        { id: 'festa', label: 'Festa / Aniversário', group: 'Lazer', color: 'text-pink-800 bg-pink-100 border-pink-400' },
        { id: 'utilidades', label: 'Utilidades', group: 'Casa', color: 'text-zinc-700 bg-zinc-100 border-zinc-500' },
        { id: 'pendente', label: 'Pendente', group: 'Outros', color: 'text-amber-700 bg-amber-50 border-amber-300' },
        { id: 'extras', label: 'Gastos Extras', group: 'Outros', color: 'text-gray-700 bg-gray-100 border-gray-400' },
        { id: 'outros', label: 'Outros', group: 'Outros', color: 'text-slate-700 bg-slate-100 border-slate-500' }
    ];

    const categorias = [...baseCategorias, ...customCategories].filter(c => !hiddenCategories.includes(c.id));

    const [selectedCat, setSelectedCat] = useState<string | null>(null);
    const [customCat, setCustomCat] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string>('Tudo');

    useEffect(() => {
        if (isOpen) {
            setSelectedCat(initialType === 'mercado' ? 'mercado' : null);
            setCustomCat('');
            setShowCustomInput(false);
            setSearchTerm('');
            setSelectedGroup(initialType === 'receitas' ? 'Receitas' : (initialType === 'mercado' ? 'Essenciais' : 'Tudo'));
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

    const rawFiltered = initialType === 'receitas' 
        ? categorias.filter(c => c.id.startsWith('receita_') || c.id === 'personalizado')
        : categorias.filter(c => !c.id.startsWith('receita_'));

    const filteredCategorias = (() => {
        const createBtn = rawFiltered.find(c => c.id === 'personalizado');
        const others = rawFiltered.filter(c => c.id !== 'personalizado')
            .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }));
        
        return createBtn ? [createBtn, ...others] : others;
    })();

    const groups = useMemo(() => {
        const uniqueGroups = Array.from(new Set(filteredCategorias.map(c => c.group || 'Outros')));
        const order = ['Receitas', 'Essenciais', 'Contas', 'Transporte', 'Alimentação', 'Saúde', 'Pessoal', 'Família', 'Lazer', 'Educação', 'Serviços', 'Casa', 'Religião', 'Ações', 'Outros'];
        
        return ['Tudo', ...order.filter(o => uniqueGroups.includes(o))];
    }, [filteredCategorias]);

    const displayedCategorias = useMemo(() => {
        let result = filteredCategorias;

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            result = result.filter(c => 
                c.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(term)
            );
        } else if (selectedGroup !== 'Tudo') {
            result = result.filter(c => (c.group || 'Outros') === selectedGroup);
        }

        return result;
    }, [filteredCategorias, searchTerm, selectedGroup]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!selectedCat) {
            showToast('Escolha uma categoria. Selecionamos "Pendente" para você.', 'error');
            setSelectedCat('pendente');
            return;
        }

        const descTrimmed = descricao.trim();
        const valorNum = unfmt(valor);
        
        if (selectedCat === 'personalizado' && !customCat.trim()) {
            showToast('Digite o nome da categoria personalizada.', 'error');
            return;
        }

        if (valorNum <= 0) {
            showToast('Ops! Você esqueceu de colocar o valor.', 'error');
            return;
        }

        if (!descTrimmed && selectedCat !== 'mercado' && selectedCat !== 'feira') {
            showToast('Por favor, digite uma descrição para sabermos o que é esse gasto.', 'error');
            return;
        }

        let sysTipo: 'receitas' | 'fixas' | 'variaveis' | 'mercado' | 'gastosMes' = 'gastosMes';
        let finalSemana = semana;

        if (selectedCat === 'mercado' || selectedCat === 'feira') {
            sysTipo = 'mercado';
            const dateObj = new Date(selectedDate + 'T12:00:00');
            const day = dateObj.getDate();
            finalSemana = day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : day <= 28 ? 4 : 5;
        }
        else if (selectedCat === 'receita_principal' || selectedCat === 'receita_extras' || selectedCat === 'receita' || selectedCat === 'extras_entrada') sysTipo = 'receitas';
        else if (selectedCat === 'conta_fixa' || selectedCat === 'conta') sysTipo = 'fixas';
        else if (selectedCat === 'conta_variavel') sysTipo = 'variaveis';

        const catObj = categorias.find(c => c.id === selectedCat);
        const catLabel = selectedCat === 'personalizado' ? customCat.trim() : (catObj?.label || 'Lançamento');
        const finalDesc = descTrimmed || catLabel;

        onSave({ 
            tipo: sysTipo, 
            descricao: (sysTipo === 'gastosMes' || selectedCat === 'mercado' || selectedCat === 'feira') && !finalDesc.startsWith('[') ? `[${catLabel}] ${finalDesc}` : finalDesc, 
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
                    <h3 className="text-lg font-bold text-slate-800">{initialType === 'receitas' ? 'Lançar Receita / Entrada' : 'Novo Gasto'}</h3>
                    <p className="text-sm text-slate-500">{initialType === 'receitas' ? 'Registre seus ganhos e extras.' : 'Adicione uma nova transação rapidamente.'}</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Categoria</label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteMode(!deleteMode)}
                                    className={`text-[10px] font-black uppercase p-1 px-2 rounded-lg transition-all ${deleteMode ? 'bg-rose-100 text-rose-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                    type="button"
                                >
                                    {deleteMode ? 'Concluído' : 'Excluir Categoria'}
                                </button>
                                <button 
                                    onClick={() => {
                                        setSelectedCat('personalizado');
                                        setShowCustomInput(true);
                                        setDeleteMode(false);
                                    }}
                                    className="text-indigo-600 flex items-center gap-1 text-[10px] font-black uppercase hover:underline p-1"
                                    type="button"
                                >
                                    <Plus size={12} strokeWidth={3} /> Nova
                                </button>
                            </div>
                        </div>

                        {/* BUSCA DE CATEGORIAS */}
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text"
                                placeholder="Pesquisar categoria..."
                                value={searchTerm}
                                onChange={e => {
                                    setSearchTerm(e.target.value);
                                    if (e.target.value) setSelectedGroup('Tudo');
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 font-bold transition-all text-slate-700"
                            />
                        </div>

                        {/* LISTA DE CATEGORIAS */}
                        <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto p-1 custom-scrollbar pr-1 border-y border-slate-100 py-3">
                            {displayedCategorias.map(cat => {
                                const isSelected = selectedCat === cat.id;

                                return (
                                    <button
                                        key={cat.id}
                                        onClick={(e) => {
                                            if (deleteMode && cat.id !== 'personalizado' && cat.id !== 'mercado' && cat.id !== 'receita_principal') {
                                                e.preventDefault();
                                                if (cat.isCustom) {
                                                    const newCustom = customCategories.filter(c => c.id !== cat.id);
                                                    setCustomCategories(newCustom);
                                                    localStorage.setItem('financask_custom_categories', JSON.stringify(newCustom));
                                                } else {
                                                    const newHidden = [...hiddenCategories, cat.id];
                                                    setHiddenCategories(newHidden);
                                                    localStorage.setItem('financask_hidden_categories', JSON.stringify(newHidden));
                                                }
                                                if(selectedCat === cat.id) setSelectedCat(null);
                                                showToast('Categoria removida', 'success');
                                                return;
                                            }
                                            if (!deleteMode) {
                                                setSelectedCat(cat.id);
                                                setShowCustomInput(cat.id === 'personalizado');
                                            }
                                        }}
                                        className={`relative flex items-center justify-between px-4 py-3.5 rounded-xl transition-all border text-left ${
                                            isSelected 
                                                ? `${cat.color} border-transparent shadow-sm ring-1 ring-inset ring-current` 
                                                : 'bg-white text-slate-600 border-transparent hover:bg-slate-50 hover:border-slate-200'
                                        } ${deleteMode && cat.id !== 'personalizado' && cat.id !== 'mercado' && cat.id !== 'receita_principal' ? 'animate-pulse border-rose-300 bg-rose-50' : ''}`}
                                        type="button"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold">{cat.label}</span>
                                            <span className="text-[10px] opacity-60 font-black uppercase tracking-tight">{cat.group}</span>
                                        </div>
                                        {isSelected && <Check size={18} strokeWidth={4} className="text-current" />}
                                        
                                        {deleteMode && cat.id !== 'personalizado' && cat.id !== 'mercado' && cat.id !== 'receita_principal' && (
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                                <X size={16} strokeWidth={3} />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                            {displayedCategorias.length === 0 && (
                                <div className="py-10 text-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhuma categoria encontrada</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {showCustomInput && (
                        <div className="fade-in">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Nova Categoria</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={customCat}
                                    onChange={e => setCustomCat(e.target.value)}
                                    className="flex-1 border border-indigo-200 p-3 rounded-lg text-sm focus:ring-4 focus:ring-indigo-100 outline-none bg-indigo-50/30 text-slate-800 placeholder:text-slate-400 font-bold"
                                    placeholder="Ex: Aniversário, IPVA, etc..."
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!customCat.trim()) return;
                                        const newCatId = (initialType === 'receitas' ? 'receita_' : '') + 'custom_' + Date.now();
                                        const newCat = {
                                            id: newCatId,
                                            label: customCat.trim(),
                                            color: initialType === 'receitas' ? 'text-emerald-700 bg-emerald-100 border-emerald-500' : 'text-slate-700 bg-slate-100 border-slate-500',
                                            isCustom: true
                                        };
                                        const updatedCustom = [...customCategories, newCat];
                                        setCustomCategories(updatedCustom);
                                        localStorage.setItem('financask_custom_categories', JSON.stringify(updatedCustom));
                                        setSelectedCat(newCatId);
                                        setCustomCat('');
                                        setShowCustomInput(false);
                                        showToast('Categoria salva!');
                                    }}
                                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-lg hover:bg-indigo-700 transition-all whitespace-nowrap"
                                >
                                    Salvar
                                </button>
                            </div>
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
