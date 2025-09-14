import * as React from 'react';

interface CollapsibleContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

function useCollapsible() {
  const context = React.useContext(CollapsibleContext);
  if (!context) {
    throw new Error('useCollapsible must be used within a Collapsible');
  }
  return context;
}

interface CollapsibleProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ children, open: controlledOpen, onOpenChange, defaultOpen = false }, ref) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);

    const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
    const handleOpenChange = React.useCallback(
      (newOpen: boolean) => {
        if (controlledOpen === undefined) {
          setUncontrolledOpen(newOpen);
        }
        onOpenChange?.(newOpen);
      },
      [controlledOpen, onOpenChange]
    );

    const value = React.useMemo(
      () => ({ open, onOpenChange: handleOpenChange }),
      [open, handleOpenChange]
    );

    return (
      <CollapsibleContext.Provider value={value}>
        <div ref={ref}>{children}</div>
      </CollapsibleContext.Provider>
    );
  }
);
Collapsible.displayName = 'Collapsible';

interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ asChild = false, onClick, ...props }, ref) => {
    const { open, onOpenChange } = useCollapsible();

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onOpenChange(!open);
      onClick?.(event);
    };

    if (asChild) {
      return React.cloneElement(
        React.Children.only(props.children as React.ReactElement),
        {
          ref,
          onClick: handleClick,
          'aria-expanded': open,
          'data-state': open ? 'open' : 'closed',
          ...props
        }
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        aria-expanded={open}
        data-state={open ? 'open' : 'closed'}
        {...props}
      />
    );
  }
);
CollapsibleTrigger.displayName = 'CollapsibleTrigger';

interface CollapsibleContentProps extends React.HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean;
}

const CollapsibleContent = React.forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ forceMount = false, style, ...props }, ref) => {
    const { open } = useCollapsible();

    if (!open && !forceMount) {
      return null;
    }

    return (
      <div
        ref={ref}
        data-state={open ? 'open' : 'closed'}
        style={{
          ...style,
          display: open ? undefined : 'none'
        }}
        {...props}
      />
    );
  }
);
CollapsibleContent.displayName = 'CollapsibleContent';

export { Collapsible, CollapsibleTrigger, CollapsibleContent };