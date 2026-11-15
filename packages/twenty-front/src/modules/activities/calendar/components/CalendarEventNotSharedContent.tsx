import { Trans } from '@lingui/react/macro';
import { IconLock } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-light'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    height: spacing['--t-spacing-6'],
    paddingBlock: spacing['--t-spacing-0'],
    paddingInline: spacing['--t-spacing-1'],
    width: '100%',
  },
});

export const CalendarEventNotSharedContent = () => {
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.container)}>
      <IconLock size={theme.icon.size.sm} />
      <Trans>Not shared</Trans>
    </div>
  );
};
