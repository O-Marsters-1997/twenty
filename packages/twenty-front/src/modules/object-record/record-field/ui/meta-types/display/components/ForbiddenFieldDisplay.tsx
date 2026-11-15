import { Trans } from '@lingui/react/macro';
import { IconLock } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
  textLineHeight,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    background: backgroundTransparent['--t-background-transparent-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    color: fontColor['--t-font-color-tertiary'],
    display: 'inline-flex',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    gap: spacing['--t-spacing-1'],
    height: spacing['--t-spacing-5'],
    lineHeight: textLineHeight['--t-text-line-height-md'],
    overflow: 'hidden',
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-1'],
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
});

export const ForbiddenFieldDisplay = () => {
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.container)}>
      <IconLock size={theme.icon.size.sm} />
      <Trans>Not shared</Trans>
    </div>
  );
};
