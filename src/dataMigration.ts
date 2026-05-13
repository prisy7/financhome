import { OrcamentoData } from './types';
import { defaultData, CURRENT_SCHEMA_VERSION } from './constants';

export const normalizeData = (parsed: any): OrcamentoData => {
    // Phase 1: Ensure initial structure exists (always needed for very old data)
    parsed.fixas = parsed.fixas || [];
    parsed.dividas = parsed.dividas || [];
    parsed.variaveis = parsed.variaveis || [];
    parsed.receitas = parsed.receitas || [];
    parsed.cronograma = parsed.cronograma || [];
    parsed.aggregatedIds = parsed.aggregatedIds || [];
    parsed.externalDebtUrl = parsed.externalDebtUrl || '';
    parsed.mercado = parsed.mercado || { ...defaultData.mercado };
    parsed.provisoes = parsed.provisoes || { ...defaultData.provisoes };
    parsed.gastosMesHistorico = parsed.gastosMesHistorico || [];
    
    if (!parsed.gastosMes || parsed.gastosMes.length === 0) {
        parsed.gastosMes = JSON.parse(JSON.stringify(defaultData.gastosMes));
    }

    let version = parsed.schemaVersion || 0;

    // Migration V1: Basic Cleanup and Category Merging
    if (version < 1) {
        // Remove PET/Animais (legacy category)
        parsed.gastosMes = parsed.gastosMes.filter((i: any) => i.id !== 227 && i.d !== 'PET/Animais');

        // Merge missing categories from default template
        defaultData.gastosMes.forEach(defItem => {
            if (!parsed.gastosMes.some((i: any) => i.id === defItem.id || i.d === defItem.d)) {
                parsed.gastosMes.push({ ...defItem });
            }
        });
        version = 1;
    }

    // Migration V2: Move utilities from "Fixas" to "Variaveis"
    if (version < 2) {
        const itemsToVariaveis: any[] = [];
        parsed.fixas = parsed.fixas.filter((item: any) => {
            const lowerName = item.d.toLowerCase();
            if (lowerName.includes('internet') || lowerName.includes('gás') || lowerName.includes('energia')) {
                itemsToVariaveis.push(item);
                return false;
            }
            return true;
        });
        if (itemsToVariaveis.length > 0) {
            parsed.variaveis = [...parsed.variaveis, ...itemsToVariaveis];
        }
        version = 2;
    }

    // Migration V3: Move extras to Gastos do Mes and renaming Provisão to Reserva
    if (version < 3) {
        // Move items from variaveis to gastosMes
        parsed.variaveis = parsed.variaveis.filter((item: any) => {
            const lowerName = item.d.toLowerCase();
            const isExtra = lowerName.includes('doação') || 
                            lowerName.includes('doacao') || 
                            lowerName.includes('festa') || 
                            (lowerName.includes('escoteiro') && lowerName.includes('extra')) || 
                            (lowerName.includes('streaming') && lowerName.includes('extra'));

            if (isExtra) {
                if (item.v > 0) {
                    const matchOldLabelToNew = (old: string) => {
                         if (old.includes('doação') || old.includes('doacao')) return 'Doação';
                         if (old.includes('festa')) return 'Festa Mãe';
                         if (old.includes('escoteiro')) return 'Escoteiro';
                         if (old.includes('streaming')) return 'Streaming';
                         return 'Outros';
                    };
                    const labelMatch = matchOldLabelToNew(lowerName);
                    parsed.gastosMesHistorico.push({
                        id: item.id,
                        d: item.d,
                        v: item.v,
                        paid: item.paid,
                        vencimento: (item as any).vencimento || 0
                    });
                    const matchItemIndex = parsed.gastosMes.findIndex((i: any) => i.d === labelMatch);
                    if (matchItemIndex !== -1) {
                        parsed.gastosMes[matchItemIndex].v += item.v;
                    }
                }
                return false;
            }
            return true;
        });

        // Rename Provisão to Reserva in all lists
        ["fixas", "variaveis", "receitas", "gastosMesHistorico"].forEach(listName => {
            if (parsed[listName]) {
                parsed[listName].forEach((item: any) => {
                    if (item.d && typeof item.d === 'string') {
                        item.d = item.d.replace(/^provis[aãoã]+\s+/i, 'Reserva ');
                        if (item.id === 19 && item.d.includes('Supermercado')) {
                            item.d = 'Supermercado';
                        }
                    }
                });
            }
        });
        version = 3;
    }

    // Migration V4: Move all Reservations to "Variaveis"
    if (version < 4) {
        const reservesToMove: any[] = [];
        const reserveIds = [9, 12, 32, 33, 34];
        
        parsed.fixas = parsed.fixas.filter((item: any) => {
            const lowerName = (item.d || '').toLowerCase();
            const isReserve = reserveIds.includes(item.id) || lowerName.includes('reserva') || !!item.isReserva;
            if (isReserve) {
                item.isReserva = true;
                reservesToMove.push(item);
                return false;
            }
            return true;
        });

        if (reservesToMove.length > 0) {
            reservesToMove.forEach(res => {
                if (!parsed.variaveis.some((v: any) => v.id === res.id)) {
                    parsed.variaveis.push(res);
                }
            });
        }
        
        // Also tag existing reservations in variaveis
        parsed.variaveis.forEach((item: any) => {
            const lowerName = (item.d || '').toLowerCase();
            if (reserveIds.includes(item.id) || lowerName.includes('reserva')) {
                item.isReserva = true;
            }
        });

        version = 4;
    }
    
    // Migration V5: Skipped/Removed
    if (version < 5) {
        version = 5;
    }

    // Migration V6: Ensure structural IDs 1, 2, 39 ALWAYS exist in receitas
    if (version < 6) {
        const structuralIds = [
            { id: 1, d: 'Saldo anterior' },
            { id: 2, d: 'Receita principal' },
            { id: 39, d: 'Extras' }
        ];

        structuralIds.forEach(std => {
            const index = parsed.receitas.findIndex((r: any) => r.id === std.id);
            if (index === -1) {
                // Check by name as fallback to avoid duplicates
                const nameIndex = parsed.receitas.findIndex((r: any) => (r.d || '').toLowerCase() === std.d.toLowerCase());
                if (nameIndex !== -1) {
                    parsed.receitas[nameIndex].id = std.id;
                    parsed.receitas[nameIndex].d = std.d;
                } else {
                    parsed.receitas.push({ id: std.id, d: std.d, v: 0, paid: std.id === 1 });
                }
            } else {
                // Ensure correct name
                parsed.receitas[index].d = std.d;
            }
        });
        
        version = 6;
    }

    // Migration V7: TabDetalhes specific migrations
    if (version < 7) {
        // Supermercado: 19
        // Bilhete Único: 241/59
        // Terreiro Pri: 245
        // Internet: 11
        
        // Move to Gastos Mês
        const toGastosMes = [19, 241, 245, 59];
        toGastosMes.forEach(id => {
            // Check in variaveis
            const inVariaveis = parsed.variaveis.find((i: any) => i.id === id);
            if (inVariaveis) {
                parsed.variaveis = parsed.variaveis.filter((i: any) => i.id !== id);
                if (!parsed.gastosMes.some((i: any) => i.id === id)) {
                    parsed.gastosMes.push(inVariaveis);
                }
            }
            // Check in fixas
            const inFixas = parsed.fixas.find((i: any) => i.id === id);
            if (inFixas) {
                parsed.fixas = parsed.fixas.filter((i: any) => i.id !== id);
                if (!parsed.gastosMes.some((i: any) => i.id === id)) {
                    parsed.gastosMes.push(inFixas);
                }
            }
        });

        // Move Internet (11) and Pet (any desc containing pet) to Variaveis
        const inFixasInternet = parsed.fixas.find((i: any) => i.id === 11 || (i.d || '').toLowerCase().includes('internet'));
        if (inFixasInternet) {
            parsed.fixas = parsed.fixas.filter((i: any) => i.id !== inFixasInternet.id);
            if (!parsed.variaveis.some((i: any) => i.id === inFixasInternet.id)) {
                parsed.variaveis.push(inFixasInternet);
            }
        }

        // REMOVE PET ITEMS (User said: "Não tenho pet")
        parsed.fixas = parsed.fixas.filter((i: any) => !(i.d || '').toLowerCase().includes('pet'));
        parsed.variaveis = parsed.variaveis.filter((i: any) => !(i.d || '').toLowerCase().includes('pet'));
        
        version = 7;
    }

    parsed.schemaVersion = CURRENT_SCHEMA_VERSION;

    return parsed as OrcamentoData;
};
