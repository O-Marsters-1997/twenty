import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  boxShadow,
  fontColor,
} from 'twenty-ui/theme/tokens.stylex';
import { IconPlayerPlay } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';

type HeroPlayButtonProps = {
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
};

const styles = stylex.create({
  button: {
    padding: 0,
    borderRadius: '50%',
    borderStyle: 'none',
    alignItems: 'center',
    backgroundColor: {
      default: background['--t-background-primary'],
      ':hover': background['--t-background-secondary'],
    },
    boxShadow: boxShadow['--t-box-shadow-strong'],
    color: fontColor['--t-font-color-tertiary'],
    cursor: 'pointer',
    display: 'inline-flex',
    justifyContent: 'center',
    outlineColor: {
      default: null,
      ':focus-visible': borderColor['--t-border-color-blue'],
    },
    outlineOffset: {
      default: null,
      ':focus-visible': '2px',
    },
    outlineStyle: {
      default: null,
      ':focus-visible': 'solid',
    },
    outlineWidth: {
      default: null,
      ':focus-visible': '2px',
    },
    transform: {
      default: null,
      ':hover': 'scale(1.04)',
      ':active': 'scale(0.98)',
    },
    transitionDuration: '120ms',
    transitionProperty: 'transform, background-color',
    transitionTimingFunction: 'ease-out',
    height: '44px',
    width: '44px',
  },
});

export const HeroPlayButton = ({
  onClick,
  ariaLabel = 'Play video',
  className,
}: HeroPlayButtonProps) => {
  const theme = useTheme();
  const buttonProps = stylex.props(styles.button);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      {...buttonProps}
      className={[buttonProps.className, className].join(' ')}
    >
      <IconPlayerPlay size={theme.icon.size.md} stroke={theme.icon.stroke.md} />
    </button>
  );
};
