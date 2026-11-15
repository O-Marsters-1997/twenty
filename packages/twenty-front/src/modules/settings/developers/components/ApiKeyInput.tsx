import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { useLingui } from '@lingui/react/macro';
import { IconCopy } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'row',
  },
  linkContainer: {
    flex: '1',
    marginRight: spacing['--t-spacing-2'],
  },
});

type ApiKeyInputProps = { apiKey: string };

export const ApiKeyInput = ({ apiKey }: ApiKeyInputProps) => {
  const { t } = useLingui();
  const { copyToClipboard } = useCopyToClipboard();
  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.linkContainer)}>
        <SettingsTextInput
          instanceId="api-key-display"
          value={apiKey}
          fullWidth
        />
      </div>
      <Button
        startIcon={<IconCopy />}
        onClick={() => {
          copyToClipboard(apiKey, t`API Key copied to clipboard`);
        }}
      >{t`Copy`}</Button>
    </div>
  );
};
