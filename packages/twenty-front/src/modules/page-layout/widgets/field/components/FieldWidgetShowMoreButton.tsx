import { t } from '@lingui/core/macro';

import { IconChevronDown } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  animationDuration,
  font,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type FieldWidgetShowMoreButtonProps = {
  remainingCount: number;
  onClick: () => void;
};

const styles = stylex.create({
  button: {
    background: 'transparent',
    borderStyle: 'none',
    gap: spacing['--t-spacing-1'],
    transition: `color ${animationDuration['--t-animation-duration-instant']}s ease`,
    alignItems: 'center',
    boxSizing: 'border-box',
    color: {
      default: fontColor['--t-font-color-tertiary'],
      ':hover': fontColor['--t-font-color-primary'],
    },
    cursor: 'pointer',
    display: 'flex',
    fontFamily: font['--t-font-family'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    height: '24px',
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    paddingTop: '0',
    width: '100%',
  },
});

export const FieldWidgetShowMoreButton = ({
  remainingCount,
  onClick,
}: FieldWidgetShowMoreButtonProps) => {
  const theme = useTheme();

  return (
    <button
      data-testid="field-widget-show-more-button"
      onClick={onClick}
      {...stylex.props(styles.button)}
    >
      <IconChevronDown size={theme.icon.size.md} />
      {t`More (${remainingCount})`}
    </button>
  );
};
