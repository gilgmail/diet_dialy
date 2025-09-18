import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  helperText?: string;
  label?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, helperText, label, id, ...props }, ref): JSX.Element => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus-visible:ring-red-500',
            className
          )}
          ref={ref}
          aria-invalid={error}
          aria-describedby={helperText ? `${textareaId}-helper` : undefined}
          {...props}
        />
        {helperText && (
          <p
            id={`${textareaId}-helper`}
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
Textarea.displayName = 'Textarea';

export { Textarea };