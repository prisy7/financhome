import React, { useState, useEffect } from 'react';
import { X, Edit2 } from 'lucide-react';

interface RenameMonthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (newName: string) => void;
    currentName: string;
}

export function RenameMonthModal({ isOpen, onClose, onConfirm, currentName }: RenameMonthModalProps) {
    const [name, setName] = useState(currentName);

    useEffect(() => {
        if (isOpen) {
            setName(currentName);
        }
    }, [isOpen, currentName]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 fade-in">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden slide-up">
                <div className="p-6 md:p-8 relative">
                    <button 
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                    
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
                            <Edit2 size={32} />
                        </div>
                        
                        <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">
                            Renomear Mês
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Escolha um novo nome para identificar este mês (ex: Maio 2026).
                        </p>
                    </div>

                    <div className="mb-6 gap-4">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Maio 2026"
                            className="w-full border border-slate-200 rounded-xl p-3 md:p-4 text-center font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    if (name.trim()) onConfirm(name.trim());
                                }
                            }}
                        />
                    </div>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={() => {
                                if (name.trim()) onConfirm(name.trim());
                            }}
                            disabled={!name.trim()}
                            className="flex-1 py-3.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                        >
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
