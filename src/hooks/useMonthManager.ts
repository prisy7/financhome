import React, { useState } from 'react';
import { MonthInfo, OrcamentoData } from '../types';
import { defaultData, STORAGE_KEY_MONTHS } from '../constants';
import { normalizeData } from '../dataMigration';

export function useMonthManager() {
    const [availableMonths, setAvailableMonths] = useState<MonthInfo[]>([]);
    const [currentMonthId, setCurrentMonthId] = useState<string>('');

    const loadLocalInitialData = (setData: (data: React.SetStateAction<OrcamentoData | null>) => void) => {
        let monthsStored = localStorage.getItem(STORAGE_KEY_MONTHS);
        let months: MonthInfo[] = [];
        if (monthsStored) {
            months = JSON.parse(monthsStored);
        } else {
            const firstMonthId = 'mes_' + crypto.randomUUID();
            months = [{ id: firstMonthId, name: 'Mês Atual' }];
            localStorage.setItem(STORAGE_KEY_MONTHS, JSON.stringify(months));
            localStorage.setItem('orcamento_data_' + firstMonthId, JSON.stringify(defaultData));
        }
        
        setAvailableMonths(months);
        const lastMonth = localStorage.getItem('orcamento_last_month_id') || (months.length > 0 ? months[months.length - 1].id : '');
        setCurrentMonthId(lastMonth);
        
        if (lastMonth) {
            const stored = localStorage.getItem('orcamento_data_' + lastMonth);
            if (stored) {
                const nd = normalizeData(JSON.parse(stored));
                setData(prev => JSON.stringify(prev) === JSON.stringify(nd) ? prev : nd);
            }
            else setData(JSON.parse(JSON.stringify(defaultData)));
        }
    };

    const mudarMes = (monthId: string, user: any, setData: (data: React.SetStateAction<OrcamentoData | null>) => void) => {
        setCurrentMonthId(monthId);
        localStorage.setItem('orcamento_last_month_id', monthId);
        
        if (!user) {
            const stored = localStorage.getItem('orcamento_data_' + monthId);
            if (stored) {
                const nd = normalizeData(JSON.parse(stored));
                setData(prev => JSON.stringify(prev) === JSON.stringify(nd) ? prev : nd);
            }
            else setData(JSON.parse(JSON.stringify(defaultData)));
        }
    };

    return { 
        availableMonths, setAvailableMonths, 
        currentMonthId, setCurrentMonthId, 
        loadLocalInitialData, mudarMes 
    };
}
