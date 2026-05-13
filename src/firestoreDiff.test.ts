import { describe, it, expect, vi } from 'vitest';
import { calculateFirestoreUpdates, buildInitPayload } from './firestoreDiff';

vi.mock('firebase/firestore', () => ({
    deleteField: vi.fn(() => ({ _methodName: 'FieldValue.delete' }))
}));

describe('calculateFirestoreUpdates', () => {
    it('generates expected updates for new array items', () => {
        const base = {
            receitas: []
        };
        const local = {
            receitas: [
                { id: '1', name: 'Salário', valor: 5000 }
            ]
        };

        const updates = calculateFirestoreUpdates(local, base, { uid: 'user1', groupId: 'group1' }, 'Janeiro');
        
        expect(updates['receitas_map.1']).toEqual({ id: '1', name: 'Salário', valor: 5000 });
        expect(updates['receitas_order']).toEqual(['1']);
        expect(updates.userId).toBe('user1');
        expect(updates.groupId).toBe('group1');
        expect(updates.name).toBe('Janeiro');
        expect(typeof updates.updatedAt).toBe('number');
    });

    it('generates deleteField for removed items', () => {
        const base = {
            receitas: [
                { id: '1', name: 'Salário', valor: 5000 }
            ]
        };
        const local = {
            receitas: []
        };

        const updates = calculateFirestoreUpdates(local, base, { uid: 'u1', groupId: 'g1' }, 'Fev');
        
        expect(updates['receitas_map.1']).toEqual({ _methodName: 'FieldValue.delete' });
        expect(updates['receitas_order']).toEqual([]);
    });

    it('updates modified array items', () => {
        const base = {
            receitas: [
                { id: '1', name: 'Salário', valor: 5000 }
            ]
        };
        const local = {
            receitas: [
                { id: '1', name: 'Salário', valor: 6000 }
            ]
        };

        const updates = calculateFirestoreUpdates(local, base, { uid: 'u1', groupId: 'g1' }, 'Mar');
        
        expect(updates['receitas_map.1']).toEqual({ id: '1', name: 'Salário', valor: 6000 });
    });

    it('handles nested objects like provisões', () => {
        const base = {
            provisoes: {
                'prov1': { nome: 'IPVA', valor: 500 }
            }
        };
        const local = {
            provisoes: {
                'prov1': { nome: 'IPVA', valor: 600 },
                'prov2': { nome: 'Seguro', valor: 200 }
            }
        };

        const updates = calculateFirestoreUpdates(local, base, { uid: 'u1', groupId: 'g1' }, 'Abr');
        
        expect(updates['provisoes.prov1']).toEqual({ nome: 'IPVA', valor: 600 });
        expect(updates['provisoes.prov2']).toEqual({ nome: 'Seguro', valor: 200 });
    });

    it('removes deleted provisões', () => {
        const base = {
            provisoes: {
                'prov1': { nome: 'IPVA', valor: 500 }
            }
        };
        const local = {
            provisoes: {}
        };

        const updates = calculateFirestoreUpdates(local, base, { uid: 'u1', groupId: 'g1' }, 'Mai');
        
        expect(updates['provisoes.prov1']).toEqual({ _methodName: 'FieldValue.delete' });
    });
});

describe('buildInitPayload', () => {
    it('builds a proper payload object for creation', () => {
        const local = {
            receitas: [{ id: '1', valor: 100 }],
            mercado: { metaSemanal: 150, gastosReais: [] }
        };
        
        const payload = buildInitPayload(local, 'group1', 'u1', 'Jun', 12345678, 111);
        
        expect(payload.userId).toBe('u1');
        expect(payload.groupId).toBe('group1');
        expect(payload.name).toBe('Jun');
        expect(payload.updatedAt).toBe(12345678);
        expect(payload.createdAt).toBe(111);
        
        expect(payload.receitas_map).toEqual({ '1': { id: '1', valor: 100 } });
        expect(payload.receitas_order).toEqual(['1']);
        expect(payload.mercado).toEqual({ metaSemanal: 150, gastosReais: [] });
    });
});
