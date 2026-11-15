import * as stylex from '@stylexjs/stylex';
import { isDefined } from 'twenty-shared/utils';
import { type IconComponent } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import {
  animationDuration,
  background,
  borderColor,
  borderRadius,
  boxShadow,
  font,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  button: {
    alignItems: 'center',
    backgroundColor: {
      default: background['--t-background-primary'],
      ':hover': background['--t-background-tertiary'],
    },
    borderColor: borderColor['--t-border-color-medium'],
    borderStyle: 'solid',
    borderWidth: '1px',
    borderTopLeftRadius: borderRadius['--t-border-radius-pill'],
    borderTopRightRadius: borderRadius['--t-border-radius-pill'],
    borderBottomRightRadius: borderRadius['--t-border-radius-pill'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-pill'],
    bottom: spacing['--t-spacing-3'],
    boxShadow: boxShadow['--t-box-shadow-light'],
    color: fontColor['--t-font-color-secondary'],
    cornerShape: 'round',
    cursor: 'pointer',
    display: 'flex',
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    gap: spacing['--t-spacing-1'],
    height: '32px',
    justifyContent: 'center',
    left: '50%',
    opacity: 0,
    paddingBlock: '0',
    paddingInline: '0',
    pointerEvents: 'none',
    position: 'absolute',
    transform: 'translateX(-50%)',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s), calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
    transitionProperty: 'opacity, background-color',
    transitionTimingFunction: 'ease',
    width: '32px',
    zIndex: 1,
  },
  buttonVisible: {
    opacity: 1,
    pointerEvents: 'auto',
  },
  buttonWithTitle: {
    paddingInline: spacing['--t-spacing-3'],
    width: 'auto',
  },
});

type ScrollOverlayButtonProps = {
  ariaLabel: string;
  isVisible: boolean;
  onClick: () => void;
  Icon?: IconComponent;
  title?: string;
};

export const ScrollOverlayButton = ({
  ariaLabel,
  isVisible,
  onClick,
  Icon,
  title,
}: ScrollOverlayButtonProps) => {
  const theme = useTheme();

  return (
    <button
      aria-hidden={!isVisible}
      aria-label={ariaLabel}
      tabIndex={isVisible ? 0 : -1}
      type="button"
      onClick={onClick}
      {...stylex.props(
        styles.button,
        isVisible && styles.buttonVisible,
        isDefined(title) && styles.buttonWithTitle,
      )}
    >
      {isDefined(Icon) && <Icon size={theme.icon.size.md} />}
      {title}
    </button>
  );
};
