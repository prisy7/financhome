import * as XLSX from 'xlsx';
import { OrcamentoData } from '../types';
import { showToast, calcularSaldoReal } from '../utils';

export function useExportData() {
    const exportData = (data: OrcamentoData | null, currentMonthName: string) => {
        if (!data) return;
        
        // Helper to format rows
        const mapItem = (item: any, cat: string) => ({
            Categoria: cat,
            Descrição: item.d || '',
            Valor: item.v,
            Status: item.paid ? 'Pago/Confirmado' : 'Pendente',
            Vencimento: item.vencimento ? `${item.vencimento}/${currentMonthName}` : '-'
        });

        // 1. Summary Sheet
        const totalReceitasReal = data.receitas.filter(i => i.paid).reduce((acc, curr) => acc + curr.v, 0);
        const totalSaidasReal = [
            ...data.fixas.filter(i => i.paid),
            ...data.variaveis.filter(i => i.paid),
            ...(data.gastosMesHistorico || []).filter(i => i.paid),
            ...(data.dividas || []).filter(i => i.paid)
        ].reduce((acc, curr) => acc + curr.v, 0);
        
        const resgatesReserva = Object.keys(data.provisoes).reduce((acc, key) => {
            const prov = data.provisoes[key];
            return acc + (prov.gastos || []).reduce((s, g) => s + g.v, 0);
        }, 0);

        const summaryRows = [
            { Item: 'Mês de Referência', Valor: currentMonthName },
            { Item: 'Total Receitas (Confirmado)', Valor: totalReceitasReal },
            { Item: 'Total Despesas (Pagos)', Valor: totalSaidasReal },
            { Item: 'Total Resgates de Reserva', Valor: resgatesReserva },
            { Item: 'Saldo Final Real', Valor: calcularSaldoReal(data) },
            { Item: '---', Valor: '---' },
            { Item: 'Meta Mercado (Semanal)', Valor: data.mercado.metaSemanal },
            { Item: 'Total Gasto Mercado', Valor: data.mercado.gastosReais.reduce((a, b) => a + (b || 0), 0) }
        ];

        // 2. Individual Sheets Data
        const receitasRows = data.receitas.map(i => mapItem(i, 'Receita'));
        const fixasRows = data.fixas.map(i => mapItem(i, 'Fixa'));
        const variaveisRows = data.variaveis.map(i => mapItem(i, 'Variável'));
        const mercadoRows = (data.gastosMesHistorico || []).filter(i => (i as any).isMercado).map(i => ({
            Descrição: i.d,
            Valor: i.v,
            Semana: (i as any).semana || '-',
            Data: i.vencimento ? `${i.vencimento}/${currentMonthName}` : '-'
        }));
        const provisionRows = Object.keys(data.provisoes).map(key => {
            const p = data.provisoes[key];
            return {
                Reserva: p.title || key,
                Objetivo: p.objetivo,
                'Total Guardado': (p.gastos || []).reduce((acc, curr) => acc + curr.v, 0),
                'Saldo Restante': p.objetivo - (p.gastos || []).reduce((acc, curr) => acc + curr.v, 0)
            };
        });
        const dividasRows = (data.dividas || []).map(i => mapItem(i, 'Dívida'));

        // Create Workbook
        const wb = XLSX.utils.book_new();
        
        // Helper to append sheets and set column widths
        const appendSheet = (dataRows: any[], sheetName: string) => {
            if (dataRows.length === 0) {
                dataRows = [{ Aviso: 'Nenhum dado cadastrado nesta categoria' }];
            }
            const ws = XLSX.utils.json_to_sheet(dataRows);
            
            // Basic auto-column width
            const maxWidths = Object.keys(dataRows[0] || {}).map(key => ({
                wch: Math.max(key.length, ...dataRows.map(row => String(row[key] || '').length)) + 2
            }));
            ws['!cols'] = maxWidths;
            
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        };

        appendSheet(summaryRows, "Resumo");
        appendSheet(receitasRows, "Receitas");
        appendSheet(fixasRows, "Despesas Fixas");
        appendSheet(variaveisRows, "Despesas Variáveis");
        appendSheet(dividasRows, "Dívidas");
        appendSheet(mercadoRows, "Mercado Detalhado");
        appendSheet(provisionRows, "Reservas");

        // Write and download
        XLSX.writeFile(wb, `Controle_Financeiro_${currentMonthName.replace(/\s+/g, '_')}.xlsx`);
        showToast('Planilha detalhada baixada! (Excel/Google Sheets)', 'success');
    };

    return { exportData };
}
