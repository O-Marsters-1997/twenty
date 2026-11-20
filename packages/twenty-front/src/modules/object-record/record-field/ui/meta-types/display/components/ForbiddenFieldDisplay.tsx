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
    background: backgroundTransparent['--t-background-transparent-light'],
    gap: spacing['--t-spacing-1'],
    overflow: 'hidden',
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'inline-flex',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    lineHeight: textLineHeight['--t-text-line-height-md'],
    userSelect: 'none',
    whiteSpace: 'nowrap',
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    height: spacing['--t-spacing-5'],
    paddingBottom: 0,
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: 0,
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
