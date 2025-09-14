import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  helperText?: string;
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, helperText, label, id, ...props }, ref): JSX.Element => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus-visible:ring-red-500',
            className
          )}
          ref={ref}
          aria-invalid={error}
          aria-describedby={helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {helperText && (
          <p
            id={`${inputId}-helper`}
            className={cn(
              'text-sm',
              error ? 'text-red-600' : 'text-muted-foreground'
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// Medical-specific input variants
const MedicalInput = React.forwardRef<HTMLInputElement, InputProps & {
  medicalType?: 'numeric' | 'time' | 'date' | 'medication' | 'symptom';
  unit?: string;
}>(
  ({ className, medicalType, unit, ...props }, ref) => {
    const getInputProps = (): Record<string, unknown> => {
      switch (medicalType) {
        case 'numeric':
          return {
            type: 'number',
            inputMode: 'numeric' as const,
            pattern: '[0-9]*',
            min: 0
          };
        case 'time':
          return {
            type: 'time'
          };
        case 'date':
          return {
            type: 'date'
          };
        default:
          return {};
      }
    };

    return (
      <div className="relative">
        <Input
          className={cn(
            medicalType === 'numeric' && unit && 'pr-12',
            className
          )}
          ref={ref}
          {...getInputProps()}
          {...props}
        />
        {unit && medicalType === 'numeric' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {unit}
          </div>
        )}
      </div>
    );
  }
);
MedicalInput.displayName = 'MedicalInput';

export { Input, MedicalInput };