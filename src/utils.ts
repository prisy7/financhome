export function fmt(v: number | string | undefined | null): string {
    const val = typeof v === 'number' ? v : parseFloat((v || 0).toString());
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
    if (!day) return '-';
    if (!monthName) return `Dia ${day}`;
    
    const parts = monthName.toLowerCase().split(' ');
    const monthIndex = MONTH_MAP[parts[0]];
    
    if (monthIndex === undefined) return `Dia ${day}`;
    
    const m = String(monthIndex + 1).padStart(2, '0');
    const y = parts[1]?.slice(-2) || '00';
    return `${String(day).padStart(2, '0')}/${m}/${y}`;
}
