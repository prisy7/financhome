import { describe, it, expect } from 'vitest';
import { normalizeData } from './dataMigration';
import { defaultData, CURRENT_SCHEMA_VERSION } from './constants';

describe('normalizeData (Data Migration)', () => {
    it('sets initial structure and default values for missing data', () => {
        const input = {};
        const result = normalizeData(input);
        
        expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        expect(result.fixas).toEqual([]);
        expect(result.variaveis).toEqual([]);
        expect(result.dividas).toEqual([]);
        expect(result.receitas.length).toBeGreaterThan(0);
        expect(result.gastosMes.length).toBeGreaterThan(0);
        expect(result.provisoes).toBeDefined();
        // Structural IDs
        expect(result.receitas.find(r => r.id === 1)).toBeDefined();
        expect(result.receitas.find(r => r.id === 2)).toBeDefined();
        expect(result.receitas.find(r => r.id === 39)).toBeDefined();
    });

    it('migrates from V0 to V7', () => {
        const oldData = {
            schemaVersion: 0,
            fixas: [
                { id: 4, d: 'Condomínio', v: 773.13, paid: false },
                { id: 11, d: 'Internet', v: 100 },
                { id: 100, d: 'Pet Shop', v: 50 } // should be removed
            ],
            variaveis: [
                { id: 19, d: 'Supermercado', v: 200 } // should go to gastosMes
            ],
            gastosMes: []
        };
        
        const result = normalizeData(oldData);
        
        expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        
        // Pet removed
        expect(result.fixas.find(f => f.d === 'Pet Shop')).toBeUndefined();
        
        // Internet moved to variaveis
        expect(result.variaveis.find(v => v.id === 11)).toBeDefined();
        expect(result.fixas.find(f => f.id === 11)).toBeUndefined();
        
        // Supermercado 19 moved to gastosMes
        expect(result.gastosMes.find(g => g.id === 19)).toBeDefined();
        expect(result.variaveis.find(v => v.id === 19)).toBeUndefined();
    });

    it('migrates reservations correctly', () => {
        const dataV3 = {
            schemaVersion: 3,
            fixas: [
                { id: 9, d: 'Reserva Natal', v: 100 }
            ],
            variaveis: []
        };
        
        const result = normalizeData(dataV3);
        
        // Reserve moved to variaveis and tagged
        expect(result.variaveis.find(v => v.id === 9 && v.isReserva)).toBeDefined();
        expect(result.fixas.find(f => f.id === 9)).toBeUndefined();
    });
});
