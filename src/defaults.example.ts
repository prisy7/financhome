export const defaultDataTemplate = {
    receitas: [{id:1, d:'Receita Exemplo', v:5000.00, paid: false}], 
    fixas: [
        {id:3, d:'Aluguel/Moradia', v:1000.00, paid: false}, 
        {id:4, d:'Condomínio', v:500.00, paid: false}, 
        {id:15, d:'Assinaturas', v:50.00, paid: false}, 
        {id:33, d:'Reserva Diversos', v:100.00, paid: false}
    ],
    dividas: [], 
    variaveis: [
        {id:19, d:'Supermercado', v:1000, paid: false, isMercado: true}, 
        {id:6, d:'Gás', v:100.00, paid: false}, 
        {id:8, d:'Energia', v:150, paid: false}, 
        {id:11, d:'Internet/TV', v:100, paid: false}, 
        {id:21, d:'Lazer', v:0, paid: false}
    ],
    gastosMes: [
        {id: 201, d: 'Farmácia', v: 0, paid: false},
        {id: 204, d: 'Restaurante/Lanche', v: 0, paid: false},
        {id: 205, d: 'Saída/Passeio', v: 0, paid: false},
        {id: 212, d: 'Padaria', v: 0, paid: false},
        {id: 214, d: 'Delivery', v: 0, paid: false},
        {id: 219, d: 'Outros', v: 0, paid: false}
    ],
    gastosMesHistorico: [],
    cronograma: [], 
    aggregatedIds: [], 
    mercado: { metaSemanal: 250, gastosReais: [0, 0, 0, 0] },
    provisoes: {
        reserva1: { saldoInicial: 0, gastos: [] }, 
        reserva2: { saldoInicial: 0, gastos: [] }
    },
    externalDebtUrl: '',
    schemaVersion: 3
};
