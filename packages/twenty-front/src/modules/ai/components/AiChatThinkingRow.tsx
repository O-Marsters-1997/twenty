import { t } from '@lingui/core/macro';
import { ThinkingOrbitLoaderIcon } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import {
  fontColor,
  fontSize,
  fontWeight,
  iconSize,
  spacing,
  textLineHeight,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  row: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    minHeight: spacing['--t-spacing-6'],
  },
  loaderIconContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    minWidth: `calc(${iconSize['--t-icon-size-sm']} * 1px)`,
  },
  label: {
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    lineHeight: textLineHeight['--t-text-line-height-md'],
  },
});

export const AiChatThinkingRow = () => {
  return (
    <div {...stylex.props(styles.row)}>
      <div {...stylex.props(styles.loaderIconContainer)}>
        <ThinkingOrbitLoaderIcon />
      </div>
      <span {...stylex.props(styles.label)}>{t`Thinking`}</span>
    </div>
  );
};
