import React, { useState, useEffect } from 'react';
import { unfmt, maskMoney } from '../utils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: number | string;
    onChangeValue: (val: number) => void;
    onCommitValue?: (val: number) => void;
}

export function CurrencyInput({ 
    value, 
    onChangeValue, 
    onCommitValue, 
    onBlur, 
    onFocus, 
    className, 
    placeholder, 
    disabled, 
    onKeyDown, 
    autoFocus,
    ...props 
}: CurrencyInputProps) {
    const [localVal, setLocalVal] = useState<string>('');

    useEffect(() => {
        if (value === undefined || value === null || value === '') {
            setLocalVal('');
            return;
        }
        
        let cleanVal = value.toString().replace('R$', '').trim();
        // Force conversion to comma for display if the external value was a typical float string "12.5" (no comma present)
        if (cleanVal.includes('.') && !cleanVal.includes(',')) {
            // For cases like "12.5", "1000.50". 
            // Only do this blindly if there's exactly one dot, to be safe.
            if ((cleanVal.match(/\./g) || []).length === 1) {
                cleanVal = cleanVal.replace('.', ',');
            }
        }

        const externalValNum = unfmt(cleanVal);
        const currentLocalNum = unfmt(localVal);
        
        if (externalValNum !== currentLocalNum) {
            setLocalVal(typeof value === 'number' ? (value === 0 ? '' : value.toString().replace('.', ',')) : cleanVal);
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let raw = e.target.value;
        
        // Remove any char that isn't digit, comma or dot
        raw = raw.replace(/[^\d.,]/g, '');

        // If a dot was typed, convert it to a comma immediately
        if (raw.includes('.')) {
             raw = raw.replace(/\./g, ',');
        }
        
        // Prevent multiple commas
        const commaCount = (raw.match(/,/g) || []).length;
        if (commaCount > 1) {
            // Revert to previous value to prevent invalid input
            raw = localVal.toString(); 
        }

        setLocalVal(raw);

        const num = unfmt(raw);
        onChangeValue(num);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const finalNum = unfmt(localVal);
        
        // Auto-format on blur for visual polish
        if (finalNum !== 0) {
            let masked = maskMoney(finalNum);
            setLocalVal(masked);
        } else if (localVal === '' || finalNum === 0) {
            setLocalVal('');
        }

        if (onCommitValue) {
            onCommitValue(finalNum);
        }
        if (onBlur) onBlur(e);
    };

    return (
        <input
            {...props}
            type="text"
            inputMode="decimal"
            value={localVal}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
            className={className}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
        />
    );
}
