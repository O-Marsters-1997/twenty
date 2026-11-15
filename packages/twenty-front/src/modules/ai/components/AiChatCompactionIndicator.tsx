import { useLingui } from '@lingui/react/macro';
import { IconTransform } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  indicatorContainer: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    gap: spacing['--t-spacing-1'],
  },
});

export const AiChatCompactionIndicator = () => {
  const { t } = useLingui();
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.indicatorContainer)}>
      <IconTransform size={theme.icon.size.sm} />
      <div>{t`The conversation has been compacted`}</div>
    </div>
  );
};
