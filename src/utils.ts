import { provisaoMetaData } from './constants';

export function fmt(v: number | string | undefined | null): string {
    const val = typeof v === 'number' ? v : parseFloat((v || 0).toString());
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const baseCategoriasList = [
    { id: 'farmacia', label: 'Farmácia' },
    { id: 'perfumaria', label: 'Perfumaria' },
    { id: 'presente', label: 'Presente' },
    { id: 'restaurante', label: 'Restaurante/Lanche' },
    { id: 'passeio', label: 'Saída/Passeio' },
    { id: 'servicos', label: 'Serviços' },
    { id: 'uber', label: 'Uber/99' },
    { id: 'utilidades', label: 'Utilidades' },
    { id: 'agua', label: 'Água' },
    { id: 'ian', label: 'Ian' },
    { id: 'padaria', label: 'Padaria' },
    { id: 'papelaria', label: 'Papelaria' },
    { id: 'delivery', label: 'Delivery' },
    { id: 'vestuario', label: 'Vestuário' },
    { id: 'streaming', label: 'Streaming' },
    { id: 'bilhete', label: 'Bilhete Único' },
    { id: 'doacao', label: 'Doação' },
    { id: 'escoteiro', label: 'Escoteiro' },
    { id: 'extras', label: 'Gastos Extras' },
    { id: 'terreiro', label: 'Terreiro Pri' },
    { id: 'saude', label: 'Saúde/Médico' },
    { id: 'educacao', label: 'Educação/Cursos' },
    { id: 'combustivel', label: 'Combustível/Transporte' },
    { id: 'manutencao', label: 'Manutenção / Casa' },
    { id: 'internet', label: 'Internet / TV' },
    { id: 'limpeza', label: 'Limpeza / Diarista' },
    { id: 'beleza', label: 'Beleza / Salão' },
    { id: 'festa', label: 'Festa / Aniversário' },
    { id: 'outros', label: 'Outros' }
];

export function syncGastosMes(data: any): any {
    if (!data.gastosMes) return data;
    
    // First, consolidate duplicates in gastosMes (merge 'v')
    const uniqueGastosMap = new Map<string, any>();
    
    for (const g of data.gastosMes) {
        if (g.id === 19 || (g.d || '').toLowerCase() === 'supermercado' || (g.d || '').toLowerCase() === 'mercado') {
            continue;
        }

        const normDesc = (g.d || '').trim();
        const key = normDesc.toLowerCase();
        
        if (uniqueGastosMap.has(key)) {
            const existing = uniqueGastosMap.get(key);
            existing.v = round2((existing.v || 0) + (g.v || 0));
        } else {
            uniqueGastosMap.set(key, { ...g, d: normDesc });
        }
    }
    
    // Track hidden IDs directly
    let hiddenIds = new Set<string>();
    try {
        if (typeof window !== 'undefined') {
            const savedHidden = window.localStorage.getItem('financask_hidden_categories');
            if (savedHidden) {
                hiddenIds = new Set(JSON.parse(savedHidden));
            }
        }
    } catch(e) {}

    // Now ensure all baseCategoriasList exist in the map
    baseCategoriasList.forEach(cat => {
        // Skip adding if it's hidden and not already in map!
        if (hiddenIds.has(cat.id)) {
            return; 
        }
        
        const key = cat.label.toLowerCase();
        if (!uniqueGastosMap.has(key)) {
            uniqueGastosMap.set(key, {
                id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
                d: cat.label,
                v: 0,
                paid: false
            });
        }
    });
    
    // Also inject any custom categories the user created in the modal
    try {
        if (typeof window !== 'undefined') {
            const savedCustom = window.localStorage.getItem('financask_custom_categories');
            if (savedCustom) {
                const customCats = JSON.parse(savedCustom);
                customCats.forEach((c: any) => {
                    if (c.label) {
                        const key = c.label.toLowerCase().trim();
                        // Also skip custom ones if hidden
                        if (hiddenIds.has(c.id)) {
                            return; 
                        }
                        if (!uniqueGastosMap.has(key)) {
                            uniqueGastosMap.set(key, {
                                id: c.id || Math.random().toString(),
                                d: c.label.trim(),
                                v: 0,
                                paid: false
                            });
                        }
                    }
                });
            }
            
            // Remove ANY existing item that is zero and hidden!
            for (const [key, val] of uniqueGastosMap.entries()) {
                if ((!val.v || val.v === 0)) {
                    // is it explicitly in hidden IDs by actual object id?
                    if (hiddenIds.has(val.id)) {
                        uniqueGastosMap.delete(key);
                    } else {
                        // is it a base category that is hidden? (check its label against hidden base cat IDs)
                        const matchingBaseCat = baseCategoriasList.find(b => b.label.toLowerCase() === key);
                        if (matchingBaseCat && hiddenIds.has(matchingBaseCat.id)) {
                            uniqueGastosMap.delete(key);
                        }
                    }
                }
            }
        }
    } catch(e) {}
    
    // Convert back to array
    const newGastosMes = Array.from(uniqueGastosMap.values());
    
    // Sort array alphabetically by name, but keep 'Outros' at the bottom
    newGastosMes.sort((a, b) => {
        if (a.d === 'Outros') return 1;
        if (b.d === 'Outros') return -1;
        return a.d.localeCompare(b.d, 'pt-BR');
    });

    // Add back Mercado placeholder
    newGastosMes.unshift({id: 19, d: 'Mercado / Feira', v: 0, paid: false, isMercado: true});
    
    return {
        ...data,
        gastosMes: newGastosMes
    };
}

export function unfmt(v: number | string | undefined | null): number {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    
    let str = v.toString().trim();
    
    // Remove "R$" and any extra spaces
    str = str.replace('R$', '').trim();

    // Standard Brazilian format: 1.250,25
    // Logic: 
    // 1. If it has both dots and commas, the comma is definitely the decimal.
    // 2. If it has only one type of separator, we need to be careful.
    
    if (str.includes(',') && str.includes('.')) {
        // Brazilian: dots are thousands, comma is decimal
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            // International: commas are thousands, dot is decimal
            str = str.replace(/,/g, '');
        }
    } 
    else if (str.includes(',')) {
        // Only comma: it's the decimal separator
        str = str.replace(',', '.');
    }
    else if (str.includes('.')) {
        // Only dots. If it's something like "1.250", it's likely thousand.
        // If it's "1.25", it's likely international decimal.
        const parts = str.split('.');
        // If the last part has exactly 3 digits, we assume it's a thousand separator
        if (parts[parts.length - 1].length === 3 && parts.length > 1) {
            str = str.replace(/\./g, '');
        }
        // Otherwise we leave it as a decimal point
    }

    // Clean remaining non-numeric characters except for the sign and decimal point
    const val = parseFloat(str.replace(/[^\d.-]/g, ''));
    return isNaN(val) ? 0 : val;
}

export function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

export function calcularSaldoReal(data: any): number {
  if (!data) return 0;
  const reservaIds = [9, 12, 32, 33, 34];
  const isAporteReserva = (i: any) =>
    provisaoMetaData.some((pm: any) => pm.entradaId === i.id) || reservaIds.includes(i.id);

  const saldoAnterior = (data.receitas?.find((i: any) => i.id === 1 || i.id === '1')?.v) || 0;
  const novasReceitas = round2((data.receitas || [])
    .filter((i: any) => i.id !== 1 && i.id !== '1')
    .reduce((a: number, c: any) => a + (c.v || 0), 0));
  const resgates = round2(Object.keys(data.provisoes || {})
    .reduce((a: number, k: string) =>
      a + ((data.provisoes[k].gastos || []).reduce((s: number, g: any) => s + (g.v || 0), 0)), 0));
  const totalMercadoReal = round2((data.mercado?.gastosReais || [])
    .reduce((a: number, b: number) => a + (b || 0), 0));
  const aportesManuais = round2(Object.keys(data.provisoes || {})
    .reduce((a: number, k: string) => {
      const ap = (data.provisoes[k] || {}).entradaManual || 0;
      return a + (ap > 0 ? ap : 0);
    }, 0));
  const reservasPagas = round2([
    ...(data.fixas || []).filter((i: any) => i.paid && provisaoMetaData.some((pm: any) => pm.entradaId === i.id)),
    ...(data.variaveis || []).filter((i: any) => i.paid && isAporteReserva(i))
  ].reduce((a: number, c: any) => a + (c.v || 0), 0) + aportesManuais);
  const saidasReais = round2([
    ...(data.fixas || []).filter((i: any) => !provisaoMetaData.some((pm: any) => pm.entradaId === i.id)),
    ...(data.variaveis || []).filter((i: any) => !provisaoMetaData.some((pm: any) => pm.entradaId === i.id) && ![9,12,32,33,34,19].includes(i.id)),
    ...(data.gastosMesHistorico || []).filter((i: any) => !i.isMercado),
    ...(data.dividas || [])
  ].filter((i: any) => i.paid).reduce((a: number, c: any) => a + (c.v || 0), 0) + totalMercadoReal);

  return round2((saldoAnterior + novasReceitas + resgates) - saidasReais - reservasPagas);
}

export function maskMoney(v: string | number): string {
    if (v === undefined || v === null) return "";
    
    if (typeof v === 'number') {
        return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    let val = v.toString();

    // Remove all dots - they will be re-added as thousand separators
    val = val.replace(/\./g, '');

    // Clean up: only digits and the first comma
    val = val.replace(/[^\d,]/g, '');
    const commaIndex = val.indexOf(',');
    if (commaIndex !== -1) {
        val = val.slice(0, commaIndex + 1) + val.slice(commaIndex + 1).replace(/,/g, '');
    }
    
    let [integerPart, decimalPart] = val.split(',');
    
    // Format integer part with thousand separators
    if (integerPart) {
        // Remove leading zeros
        integerPart = integerPart.replace(/^0+(?!$)/, "") || "0";
        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    } else if (val.startsWith(',')) {
        integerPart = "0";
    }
    
    // Join with decimal part (limit to 2 digits)
    if (decimalPart !== undefined) {
        return (integerPart || "0") + ',' + decimalPart.slice(0, 2);
    }
    
    return integerPart || "";
}

export function showToast(message: string, type: 'success' | 'error' = 'success') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-msg');
    const icon = document.getElementById('toast-icon');
    
    if (!toast || !msg || !icon) return;

    msg.textContent = message;
    
    if (type === 'success') {
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>';
        icon.className = "w-8 h-8 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100";
    } else {
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>';
        icon.className = "w-8 h-8 rounded-full flex items-center justify-center bg-rose-50 text-rose-600 shadow-sm border border-rose-100";
    }

    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    
    setTimeout(() => { 
        toast.classList.add('translate-y-20', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3000);
}

export const MONTH_MAP: Record<string, number> = {
    'janeiro': 0, 'fevereiro': 1, 'março': 2, 'abril': 3, 'maio': 4, 'junho': 5,
    'julho': 6, 'agosto': 7, 'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
};

export function formatFullDate(monthName: string | undefined, day: number | string | undefined | null): string {
    const fallbackMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    if (!day) return '-';
    
    // Normalize day
    const d = String(day).padStart(2, '0');

    if (!monthName) return `${d}/${fallbackMonth}`;
    
    const lowered = monthName.toLowerCase();
    let monthIndex: number | undefined = undefined;

    for (const [key, val] of Object.entries(MONTH_MAP)) {
        if (lowered.includes(key)) {
            monthIndex = val;
            break;
        }
    }

    if (monthIndex === undefined) return `${d}/${fallbackMonth}`;
    
    const m = String(monthIndex + 1).padStart(2, '0');
    return `${d}/${m}`;
}
