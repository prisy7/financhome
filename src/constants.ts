export const STORAGE_KEY_MONTHS = 'orcamento_months_list';
export const CURRENT_SCHEMA_VERSION = 8;

export const provisaoMetaData = [
    { key: 'natal', title: 'Reserva Natal', entradaId: 9, typeList: 'variaveis', icon: 'Gift', color: 'rose', meta: 'Reserva (10x)' },
    { key: 'niver', title: 'Reserva Aniversários', entradaId: 12, typeList: 'variaveis', icon: 'Cake', color: 'blue', meta: 'Reserva' },
    { key: 'emergencias', title: 'Reserva de Emergência', entradaId: 32, typeList: 'variaveis', icon: 'Shield', color: 'emerald', meta: 'Reserva' },
    { key: 'casa', title: 'Casa/Reforma', entradaId: 33, typeList: 'variaveis', icon: 'Home', color: 'blue', meta: 'Reserva (12x)' }, 
    { key: 'festa', title: 'Festa/Evento', entradaId: 34, typeList: 'variaveis', icon: 'PartyPopper', color: 'amber', meta: 'Reserva' }
];

export const defaultData = {
    receitas: [
        {id:1, d:'Saldo anterior', v:0.00, paid: true}, 
        {id:2, d:'Receita principal', v:0.00, paid: false}, 
        {id:39, d:'Extras', v:0.00, paid: false}
    ], 
    fixas: [
        {id: 4, d: 'Condomínio', v: 0.00, paid: false},
        {id: 3, d: 'Aluguel', v: 0.00, paid: false},
        {id: 50, d: 'Cartão Saúde', v: 0.00, paid: false},
        {id: 51, d: 'Escola/Cursos', v: 0.00, paid: false},
        {id: 52, d: 'Spotify/Youtube', v: 0.00, paid: false},
        {id: 53, d: 'Celular 1', v: 0.00, paid: false},
        {id: 54, d: 'Celular 2', v: 0.00, paid: false},
        {id: 55, d: 'Streaming/Netflix', v: 0.00, paid: false},
        {id: 56, d: 'Empre./ Dividas', v: 0.00, paid: false},
        {id: 57, d: 'Convênio Médico', v: 0.00, paid: false}
    ],
    dividas: [], 
    variaveis: [
        {id: 6, d: 'Gás', v: 0.00, paid: false},
        {id: 58, d: 'Cartão de Crédito', v: 0.00, paid: false},
        {id: 11, d: 'Internet', v: 0.00, paid: false},
        {id: 12, d: 'Reserva Aniversários', v: 0.00, paid: false},
        {id: 59, d: 'Transporte/Passe', v: 0.00, paid: false},
        {id: 60, d: 'Novo Item', v: 0.00, paid: false},
        {id: 61, d: 'Dentista/Médico 1', v: 0.00, paid: false},
        {id: 62, d: 'Celular 3', v: 0.00, paid: false},
        {id: 63, d: 'Dentista/Médico 2', v: 0.00, paid: false},
        {id: 32, d: 'Emergências', v: 0.00, paid: false},
        {id: 8, d: 'Energia', v: 0.00, paid: false},
        {id: 9, d: 'Reserva Natal', v: 0.00, paid: false}
    ],
    gastosMes: [
        {id: 19, d: 'Mercado / Feira', v: 0.00, paid: false, isMercado: true},
        {id: 201, d: 'Farmácia', v: 0, paid: false},
        {id: 230, d: 'Perfumaria', v: 0, paid: false},
        {id: 231, d: 'Presente', v: 0, paid: false},
        {id: 204, d: 'Restaurante/Lanche', v: 0, paid: false},
        {id: 205, d: 'Saída/Passeio', v: 0, paid: false},
        {id: 232, d: 'Serviços', v: 0, paid: false},
        {id: 233, d: 'Aplicativos (Uber/99)', v: 0, paid: false},
        {id: 234, d: 'Utilidades', v: 0, paid: false},
        {id: 235, d: 'Água', v: 0, paid: false},
        {id: 236, d: 'Feira', v: 0, paid: false},
        {id: 237, d: 'Filhos/Dependentes', v: 0, paid: false},
        {id: 212, d: 'Padaria', v: 0, paid: false},
        {id: 238, d: 'Papelaria', v: 0, paid: false},
        {id: 214, d: 'Delivery', v: 0, paid: false},
        {id: 239, d: 'Vestuário', v: 0, paid: false},
        {id: 240, d: 'Streaming Extra', v: 0, paid: false},
        {id: 241, d: 'Transporte/Passe', v: 0, paid: false},
        {id: 242, d: 'Doação', v: 0, paid: false},
        {id: 219, d: 'Outros', v: 0, paid: false},
        {id: 243, d: 'Esportes/Atividades', v: 0, paid: false},
        {id: 244, d: 'Extras', v: 0, paid: false},
        {id: 245, d: 'Centro/Clube/Igreja', v: 0, paid: false},
        {id: 246, d: 'Saúde/Médico', v: 0, paid: false},
        {id: 247, d: 'Educação/Cursos', v: 0, paid: false},
        {id: 248, d: 'Combustível', v: 0, paid: false},
        {id: 249, d: 'Manutenção/Casa', v: 0, paid: false},
        {id: 250, d: 'Festa/Evento', v: 0, paid: false},
        {id: 228, d: 'Reserva Especial', v: 0, paid: false}
    ],
    gastosMesHistorico: [],
    cronograma: [], 
    aggregatedIds: [], 
    mercado: { metaSemanal: 0, gastosReais: [0, 0, 0, 0], overflowAnterior: 0, totalEstouradoMesAnterior: 0 },
    provisoes: {
        natal: { saldoInicial: 0, gastos: [] }, 
        niver: { saldoInicial: 0, gastos: [] },
        emergencias: { saldoInicial: 0, gastos: [] },
        casa: { saldoInicial: 0, gastos: [] },
        festa: { saldoInicial: 0, gastos: [] } 
    },
    externalDebtUrl: '',
    schemaVersion: CURRENT_SCHEMA_VERSION
};
