import React, { useState, useEffect } from 'react';
import ReactCurrencyInput from 'react-currency-input-field';
import { unfmt } from '../utils';

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
    const [localVal, setLocalVal] = useState<string | number>(value);

    useEffect(() => {
        // Ensure we don't have R$ in the local state for the input component
        const cleanVal = typeof value === 'string' ? value.replace('R$', '').trim() : value;
        setLocalVal(cleanVal === undefined || cleanVal === null ? '' : cleanVal);
    }, [value]);

    return (
        <ReactCurrencyInput
            intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
            decimalSeparator=","
            groupSeparator="."
            allowDecimals={true}
            decimalsLimit={2}
            value={localVal}
            onValueChange={(val, name, values) => {
                setLocalVal(val || "");
                const num = values?.float ?? 0;
                onChangeValue(num);
            }}
            onBlur={(e) => {
                const finalNum = unfmt(localVal);
                if (onCommitValue) {
                    onCommitValue(finalNum);
                }
                if (onBlur) onBlur(e);
            }}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
            className={className}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            inputMode="decimal"
            {...props}
        />
    );
}
