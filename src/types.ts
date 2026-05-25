export interface Item {
    id: string | number;
    d: string;
    v: number;
    paid: boolean;
    reagendado?: boolean;
    isMercado?: boolean;
    p?: number;
    timestamp?: number;
    categoria?: string;
    parcelaAtual?: number;
    totalParcelas?: number;
    vencimento?: number; // Dia de vencimento 1-31
    isReserva?: boolean;
    semana?: number;
}

export interface CronogramaItem extends Item {
    dia: number;
}

export interface ProvisaoGasto {
    id: string | number;
    d: string;
    v: number;
}

export interface Provisao {
    title?: string;
    meta?: string;
    objetivo?: number;
    metaMensal?: number;
    metasMensais?: Record<string, number>;
    prazo?: string;
    dataFinal?: string;
    saldoInicial: number;
    gastos: ProvisaoGasto[];
    entradaId?: number;
}

export interface OrcamentoData {
    receitas: Item[];
    fixas: Item[];
    dividas: Item[];
    variaveis: Item[];
    gastosMes?: Item[];
    gastosMesHistorico?: Item[];
    cronograma: CronogramaItem[];
    aggregatedIds: (string | number)[];
    mercado: {
        metaSemanal: number;
        gastosReais: number[];
        overflowAnterior?: number;
        totalEstouradoMesAnterior?: number;
    };
    provisoes: {
        [key: string]: Provisao;
    };
    externalDebtUrl: string;
    schemaVersion?: number;
}

export interface MonthInfo {
    id: string;
    name: string;
    createdAt?: number;
}
