import React, { useRef } from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const focusNext = (idx: number) => {
    const next = inputsRef.current[idx + 1];
    if (next) next.focus();
  };

  const focusPrev = (idx: number) => {
    const prev = inputsRef.current[idx - 1];
    if (prev) prev.focus();
  };

  const handleChange = (idx: number, v: string) => {
    const char = v.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[idx] = char;
    onChange(newDigits.join(''));
    if (char) focusNext(idx);
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx]) {
      focusPrev(idx);
    }
    if (e.key === 'ArrowLeft') focusPrev(idx);
    if (e.key === 'ArrowRight') focusNext(idx);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted.padEnd(length, ' ').slice(0, length).trimEnd());
    // Focus last filled box
    const lastIdx = Math.min(pasted.length, length - 1);
    inputsRef.current[lastIdx]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i]}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            'otp-input w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold',
            'border-2 border-slate-200 rounded-xl bg-white text-slate-900',
            'transition-all duration-150 focus:border-blue-500 focus:bg-blue-50',
            digits[i] ? 'border-blue-400 bg-blue-50' : '',
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          )}
          aria-label={`OTP digit ${i + 1}`}
        />
      ))}
    </div>
  );
};
