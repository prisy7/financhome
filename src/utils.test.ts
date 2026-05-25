import { describe, it, expect } from 'vitest';
import { unfmt, formatFullDate } from './utils';

describe('unfmt (Currency Parser)', () => {
    it('returns 0 for falsy values', () => {
        expect(unfmt(undefined)).toBe(0);
        expect(unfmt(null)).toBe(0);
        expect(unfmt('')).toBe(0);
    });

    it('returns numbers directly', () => {
        expect(unfmt(100)).toBe(100);
        expect(unfmt(0)).toBe(0);
        expect(unfmt(1.5)).toBe(1.5);
    });

    it('parses correctly with brazilian currency formatting', () => {
        expect(unfmt('R$ 1.250,25')).toBe(1250.25);
        expect(unfmt('R$ 10,00')).toBe(10.00);
        expect(unfmt('1.250,25')).toBe(1250.25);
        expect(unfmt('10.000,50')).toBe(10000.50);
        expect(unfmt('1.000.000,50')).toBe(1000000.50);
    });

    it('parses string with only comma as decimal', () => {
        expect(unfmt('R$ 10,25')).toBe(10.25);
        expect(unfmt('10,50')).toBe(10.5);
    });

    it('parses string with only dots', () => {
        // Thousand separator style
        expect(unfmt('R$ 1.250')).toBe(1250);
        // International decimal style
        expect(unfmt('1.25')).toBe(1.25);
        expect(unfmt('R$ 10.50')).toBe(10.5);
    });

    it('handles negative values', () => {
        expect(unfmt('R$ -10,00')).toBe(-10);
        expect(unfmt('-1.250,00')).toBe(-1250);
    });
});

describe('formatFullDate', () => {
    it('formats valid day and month', () => {
        expect(formatFullDate('março 24', 5)).toBe('05/03');
        expect(formatFullDate('dezembro 23', 15)).toBe('15/12');
    });

    it('handles undefined values', () => {
        expect(formatFullDate(undefined, 10)).toBe('Dia 10');
        expect(formatFullDate('janeiro', null)).toBe('-');
    });
});
