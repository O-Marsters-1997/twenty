import { useCallback, useEffect } from 'react';

import { checkIfItsAViteStaleChunkLazyLoadingError } from '@/error-handler/utils/checkIfItsAViteStaleChunkLazyLoadingError';
import { getToastOptionsFromError } from '@/error-handler/utils/getToastOptionsFromError';
import {
  CombinedGraphQLErrors,
  CombinedProtocolErrors,
  LinkError,
  LocalStateError,
  ServerError,
  ServerParseError,
  UnconventionalError,
} from '@apollo/client/errors';
import { useToast } from 'twenty-ui/components/feedback';

const isApolloError = (error: unknown): boolean =>
  CombinedGraphQLErrors.is(error) ||
  CombinedProtocolErrors.is(error) ||
  LinkError.is(error) ||
  LocalStateError.is(error) ||
  ServerError.is(error) ||
  ServerParseError.is(error) ||
  UnconventionalError.is(error);

export const PromiseRejectionEffect = () => {
  const { enqueueToast } = useToast();

  const handlePromiseRejection = useCallback(
    (event: PromiseRejectionEvent) => {
      const error = event.reason;
      if (isApolloError(error)) {
        enqueueToast(getToastOptionsFromError({ error }));
        return; // already handled by apolloLink
      }

      const isAbortError =
        error?.networkError?.name === 'AbortError' ||
        error?.name === 'AbortError' ||
        (error instanceof TypeError &&
          error.message.toLowerCase() === 'cancelled');

      const isViteStaleChunkLazyLoadingError =
        error instanceof Error &&
        checkIfItsAViteStaleChunkLazyLoadingError(error);

      if (!isAbortError && !isViteStaleChunkLazyLoadingError) {
        enqueueToast(getToastOptionsFromError({ error }));
      }
    },
    [enqueueToast],
  );

  useEffect(() => {
    window.addEventListener('unhandledrejection', handlePromiseRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, [handlePromiseRejection]);

  return <></>;
};
