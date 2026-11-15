import { t } from '@lingui/core/macro';
import { useCallback, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { useMutation } from '@apollo/client/react';
import { UpdateApiKeyDocument } from '~/generated-metadata/graphql';

const styles = stylex.create({
  comboInput: {
    display: 'flex',
    flexDirection: 'row',
    columnGap: spacing['--t-spacing-4'],
  },
});

type ApiKeyNameInputProps = {
  apiKeyName: string;
  apiKeyId: string;
  disabled: boolean;
  onNameUpdate?: (name: string) => void;
};

export const ApiKeyNameInput = ({
  apiKeyName,
  apiKeyId,
  disabled,
  onNameUpdate,
}: ApiKeyNameInputProps) => {
  const [updateApiKey] = useMutation(UpdateApiKeyDocument);

  // TODO: Enhance this with react-web-hook-form (https://www.react-hook-form.com)
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdate = useCallback(
    useDebouncedCallback(async (name: string) => {
      if (isDefined(onNameUpdate)) {
        onNameUpdate(apiKeyName);
      }
      if (!apiKeyName) {
        return;
      }
      const { data: updatedApiKeyData } = await updateApiKey({
        variables: {
          input: {
            id: apiKeyId,
            name,
          },
        },
      });
      const updatedApiKey = updatedApiKeyData?.updateApiKey;
      if (isDefined(updatedApiKey)) {
        onNameUpdate?.(updatedApiKey.name);
      }
    }, 500),
    [updateApiKey, onNameUpdate],
  );

  useEffect(() => {
    debouncedUpdate(apiKeyName);
    return debouncedUpdate.cancel;
  }, [debouncedUpdate, apiKeyName]);

  const nameTextInputId = `${apiKeyId}-name`;

  return (
    <div {...stylex.props(styles.comboInput)}>
      <SettingsTextInput
        instanceId={nameTextInputId}
        placeholder={t`E.g. backoffice integration`}
        onChange={onNameUpdate}
        fullWidth
        value={apiKeyName}
        disabled={disabled}
      />
    </div>
  );
};
