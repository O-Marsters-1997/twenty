import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined, normalizeAllowedIframeOrigin } from 'twenty-shared/utils';
import { useToast } from 'twenty-ui/components/feedback';
import { Section } from 'twenty-ui/components/layout';
import { IconPlus, IconTrash } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';

import { getToastOptionsFromError } from '@/error-handler/utils/getToastOptionsFromError';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import {
  GetWorkspaceIframeOriginsDocument,
  UpdateWorkspaceAllowedIframeOriginsDocument,
} from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-3'],
  },
  row: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'space-between',
  },
  origin: {
    overflowWrap: 'anywhere',
  },
});

export const SettingsSecurityIframeOrigins = () => {
  const { t } = useLingui();
  const { enqueueToast } = useToast();
  const [originInput, setOriginInput] = useState('');
  const [error, setError] = useState<string>();
  const {
    data,
    loading: isLoadingPolicy,
    error: policyError,
    refetch,
  } = useQuery(GetWorkspaceIframeOriginsDocument, {
    fetchPolicy: 'network-only',
  });
  const [updateOrigins, { loading }] = useMutation(
    UpdateWorkspaceAllowedIframeOriginsDocument,
  );
  const origins = data?.currentWorkspace.allowedIframeOrigins ?? [];
  const isPolicyLoaded = isDefined(data?.currentWorkspace.allowedIframeOrigins);
  const isDisabled = loading || isLoadingPolicy || !isPolicyLoaded;

  const saveOrigin = async (
    operation: 'add' | 'remove',
    origin: string,
  ): Promise<boolean> => {
    if (isDisabled) {
      return false;
    }

    try {
      const { data } = await updateOrigins({
        variables: { input: { operation, origin } },
      });
      return isDefined(data?.updateWorkspaceAllowedIframeOrigins);
    } catch (error) {
      enqueueToast(getToastOptionsFromError({ error }));
      return false;
    }
  };

  const handleAddOrigin = async () => {
    const origin = normalizeAllowedIframeOrigin(originInput.trim());

    if (!isDefined(origin)) {
      setError(
        t`Enter an HTTP or HTTPS origin without a path or wildcard, such as https://portal.example.com.`,
      );

      return;
    }

    if (await saveOrigin('add', origin)) {
      setOriginInput('');
      setError(undefined);
    }
  };

  return (
    <Section.Root>
      <Section.Header
        title={t`Iframe embedding`}
        description={t`Allow trusted websites to display this workspace in an iframe. Users who are already signed in may see their workspace inside those websites, so only add origins you fully trust. Leave the list empty to block external embedding.`}
      />
      <div {...stylex.props(styles.list)}>
        {isDefined(policyError) && (
          <>
            <span role="alert" {...stylex.props(styles.origin)}>{t`Unable to load embedding settings.`}</span>
            <Button onClick={() => refetch()}>{t`Retry`}</Button>
          </>
        )}
        {origins.map((origin) => (
          <div key={origin} {...stylex.props(styles.row)}>
            <span {...stylex.props(styles.origin)}>{origin}</span>
            <Button
              aria-label={t`Remove ${origin}`}
              startIcon={<IconTrash size={16} />}
              variant="outline"
              size="sm"
              disabled={isDisabled}
              onClick={() => saveOrigin('remove', origin)}
            >
              {t`Remove`}
            </Button>
          </div>
        ))}
        <SettingsTextInput
          instanceId="allowed-iframe-origin"
          label={t`Allowed origin`}
          placeholder="https://portal.example.com"
          value={originInput}
          disabled={isDisabled}
          onChange={(value) => {
            setOriginInput(value);
            setError(undefined);
          }}
          onInputEnter={handleAddOrigin}
          error={error}
        />
        <div {...stylex.props(styles.row)}>
          <Button
            variant="outline"
            size="sm"
            disabled={isDisabled || originInput.trim() === ''}
            startIcon={<IconPlus size={16} />}
            onClick={handleAddOrigin}
          >
            {t`Add origin`}
          </Button>
        </div>
      </div>
    </Section.Root>
  );
};
