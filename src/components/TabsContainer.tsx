import React, { useEffect } from 'react';
import { ListChecks, CalendarDays, ShoppingCart, PiggyBank, Link as LinkIcon, BarChart } from 'lucide-react';

interface TabsContainerProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    children: React.ReactNode;
}

export function TabsContainer({ activeTab, setActiveTab, children }: TabsContainerProps) {
    useEffect(() => {
        const checkMobile = () => {
            if (window.innerWidth < 768 && activeTab !== 'detalhes') {
                setActiveTab('detalhes');
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [activeTab, setActiveTab]);

    const tabs = [
        { id: 'detalhes', label: 'Orçamento', icon: <ListChecks size={16} className="mr-2" /> },
        { id: 'extrato', label: 'Extrato', icon: <CalendarDays size={16} className="mr-2" /> },
        { id: 'mercado', label: 'Supermercado', icon: <ShoppingCart size={16} className="mr-2" /> },
        { id: 'dividas', label: 'Dívidas', icon: <LinkIcon size={16} className="mr-2" /> },
        { id: 'provisoes', label: 'Reservas', icon: <PiggyBank size={16} className="mr-2" /> },
        { id: 'evolucao', label: 'Evolução', icon: <BarChart size={16} className="mr-2" /> },
    ];

    return (
        <div className="bg-transparent flex flex-col gap-3">
            <div className="hidden md:flex p-0.5 bg-white rounded-xl overflow-x-auto scrollbar-hide border border-slate-100 shadow-sm gap-0.5">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 min-w-[100px] md:min-w-[125px] px-2 md:px-4 py-2.5 md:py-3 text-[9.5px] md:text-[10.5px] font-black uppercase tracking-wider focus:outline-none whitespace-nowrap transition-all duration-300 rounded-lg ${
                            activeTab === tab.id
                                ? 'text-white bg-slate-800 shadow-md'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
                        }`}
                    >
                        <div className="flex items-center justify-center">
                            {tab.icon}
                            {tab.label}
                        </div>
                    </button>
                ))}
            </div>
            <div className="p-0 min-h-[400px]">
                {children}
            </div>
        </div>
    );
}
