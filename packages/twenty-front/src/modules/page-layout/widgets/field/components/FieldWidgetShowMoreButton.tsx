import { t } from '@lingui/core/macro';

import { IconChevronDown } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { font, spacing, animation } from 'twenty-ui/theme/tokens.stylex';

type FieldWidgetShowMoreButtonProps = {
  remainingCount: number;
  onClick: () => void;
};

const styles = stylex.create({
  button: {
    alignItems: 'center',
    background: 'transparent',
    borderStyle: 'none',
    boxSizing: 'border-box',
    color: { default: font['--t-font-color-tertiary'], ':hover': font['--t-font-color-primary'] },
    cursor: 'pointer',
    display: 'flex',
    fontFamily: font['--t-font-family'],
    fontWeight: font['--t-font-weight-regular'],
    gap: spacing['--t-spacing-1'],
    height: '24px',
    paddingTop: '0',
    paddingRight: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    transition: `color ${animation['--t-animation-duration-instant']}s ease`,
    width: '100%',
  },
});

export const FieldWidgetShowMoreButton = ({
  remainingCount,
  onClick,
}: FieldWidgetShowMoreButtonProps) => {
  const theme = useTheme();

  return (
    <button data-testid="field-widget-show-more-button" onClick={onClick} {...stylex.props(styles.button)}>
      <IconChevronDown size={theme.icon.size.md} />
      {t`More (${remainingCount})`}
    </button>
  );
};
