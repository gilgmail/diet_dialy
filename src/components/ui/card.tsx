import * as React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border bg-card text-card-foreground shadow-sm',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

// Medical-specific card variants
const MedicalCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    severity?: 'low' | 'medium' | 'high';
    condition?: 'ibd' | 'chemotherapy' | 'allergy' | 'ibs' | 'other';
  }
>(({ className, severity, condition, ...props }, ref): JSX.Element => {
  const getSeverityStyles = (severity?: string): string => {
    switch (severity) {
      case 'high':
        return 'border-red-200 bg-red-50/50';
      case 'medium':
        return 'border-amber-200 bg-amber-50/50';
      case 'low':
        return 'border-green-200 bg-green-50/50';
      default:
        return '';
    }
  };

  const getConditionStyles = (condition?: string): string => {
    switch (condition) {
      case 'ibd':
        return 'border-l-4 border-l-blue-500';
      case 'chemotherapy':
        return 'border-l-4 border-l-purple-500';
      case 'allergy':
        return 'border-l-4 border-l-red-500';
      case 'ibs':
        return 'border-l-4 border-l-green-500';
      default:
        return '';
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm',
        getSeverityStyles(severity),
        getConditionStyles(condition),
        className
      )}
      {...props}
    />
  );
});
MedicalCard.displayName = 'MedicalCard';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, MedicalCard };