import { CommandComponentInstanceContext } from '@/command-menu-item/engine-command/states/contexts/CommandComponentInstanceContext';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { type ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useToast } from 'twenty-ui/components/feedback';

type CommandMenuItemErrorBoundaryProps = {
  children: ReactNode;
  onError?: () => void;
};

export const CommandMenuItemErrorBoundary = ({
  children,
  onError,
}: CommandMenuItemErrorBoundaryProps) => {
  const { enqueueToast } = useToast();

  const commandMenuItemId = useAvailableComponentInstanceIdOrThrow(
    CommandComponentInstanceContext,
  );

  const handleError = (error: Error) => {
    enqueueToast({ status: 'error', children: error.message });

    onError?.();
  };

  return (
    <ErrorBoundary
      fallbackRender={() => null}
      onError={handleError}
      resetKeys={[commandMenuItemId]}
    >
      {children}
    </ErrorBoundary>
  );
};
