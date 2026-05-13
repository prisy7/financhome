import React, { useState, useEffect } from 'react';
import { RotateCcw, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ResetMonthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    monthName: string;
}

export function ResetMonthModal({ isOpen, onClose, onConfirm, monthName }: ResetMonthModalProps) {
    const [confirmText, setConfirmText] = useState('');
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setConfirmText('');
            setError(false);
        }
    }, [isOpen]);

    const handleConfirm = () => {
        if (confirmText.toLowerCase() === monthName.toLowerCase()) {
            onConfirm();
            onClose();
        } else {
            setError(true);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />
                    
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100"
                    >
                        <div className="p-8">
                            <div className="flex items-center justify-center w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl mb-6 mx-auto">
                                <AlertTriangle size={32} />
                            </div>
                            
                            <h3 className="text-xl font-black text-slate-800 text-center uppercase tracking-tight mb-2">
                                Resetar Mês Inteiro?
                            </h3>
                            
                            <p className="text-sm text-slate-500 text-center mb-8 leading-relaxed">
                                Esta ação é <span className="font-bold text-rose-600">irreversível</span>. Todos os lançamentos, variáveis e dados do mês <span className="font-bold text-slate-800">{monthName}</span> serão apagados.
                            </p>
                            
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Digite <span className="text-slate-800">"{monthName}"</span> para confirmar
                                    </label>
                                    <input 
                                        type="text"
                                        value={confirmText}
                                        onChange={(e) => {
                                            setConfirmText(e.target.value);
                                            if (error) setError(false);
                                        }}
                                        placeholder="Digite o nome do mês..."
                                        className={`w-full h-12 bg-slate-50 border-2 rounded-xl px-4 text-sm font-bold focus:outline-none transition-all ${error ? 'border-rose-500 shake' : 'border-slate-100 focus:border-blue-500 focus:bg-white'}`}
                                    />
                                    {error && (
                                        <p className="text-[10px] font-bold text-rose-500 ml-1">
                                            O texto digitado não confere com o nome do mês.
                                        </p>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button 
                                        onClick={onClose}
                                        className="h-12 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleConfirm}
                                        disabled={confirmText.toLowerCase() !== monthName.toLowerCase()}
                                        className={`h-12 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${confirmText.toLowerCase() === monthName.toLowerCase() ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-100' : 'bg-slate-300 cursor-not-allowed shadow-none'}`}
                                    >
                                        Apagar Tudo
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <button 
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
