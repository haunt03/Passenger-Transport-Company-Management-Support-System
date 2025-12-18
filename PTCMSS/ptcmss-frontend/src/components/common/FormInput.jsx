import React from 'react';
import { XCircle } from 'lucide-react';

/**
 * Reusable form input with validation
 */
const FormInput = ({
                       label,
                       name,
                       value,
                       onChange,
                       onBlur,
                       error,
                       type = 'text',
                       placeholder = '',
                       required = false,
                       disabled = false,
                       className = '',
                       ...props
                   }) => {
    const hasError = error && error.trim() !== '';

    return (
        <div className={className}>
            {label && (
                <label className="block text-xs text-slate-600 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <input
                type={type}
                name={name}
                value={value}
                onChange={(e) => onChange(name, e.target.value)}
                onBlur={() => onBlur && onBlur(name)}
                disabled={disabled}
                placeholder={placeholder}
                className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-colors ${hasError
                    ? 'border-red-400 focus:ring-red-500'
                    : 'border-slate-300'
                } ${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                {...props}
            />

            {hasError && (
                <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <XCircle size={12} />
                    {error}
                </div>
            )}
        </div>
    );
};

export default FormInput;
