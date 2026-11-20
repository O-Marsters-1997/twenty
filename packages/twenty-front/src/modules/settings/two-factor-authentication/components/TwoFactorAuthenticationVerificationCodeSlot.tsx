import { type SlotProps } from 'input-otp';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
} from 'twenty-ui/theme/tokens.stylex';

const caretBlink = stylex.keyframes({
  '0%': { opacity: 1 },
  '50%': { opacity: 0 },
  '100%': { opacity: 1 },
});

const styles = stylex.create({
  slot: {
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    alignItems: 'center',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-md'],
    justifyContent: 'center',
    outlineColor: borderColor['--t-border-color-medium'],
    outlineStyle: 'none',
    outlineWidth: 0,
    position: 'relative',
    transitionDuration: '0.3s',
    transitionProperty: 'all',
    height: '32px',
    width: '24px',
  },
  slotActive: {
    outlineStyle: 'solid',
    outlineWidth: '1px',
  },
  caretContainer: {
    inset: 0,
    alignItems: 'center',
    animationDuration: '1s',
    animationIterationCount: 'infinite',
    animationName: caretBlink,
    animationTimingFunction: 'steps(2, start)',
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    position: 'absolute',
  },
  placeholderChar: {
    opacity: 0.2,
  },
  inputChar: {
    opacity: 1,
  },
  caret: {
    backgroundColor: fontColor['--t-font-color-primary'],
    height: '20px',
    width: '1px',
  },
});

type TwoFactorAuthenticationVerificationCodeSlotProps = SlotProps;

export const TwoFactorAuthenticationVerificationCodeSlot = ({
  char,
  hasFakeCaret,
  isActive,
  placeholderChar,
}: TwoFactorAuthenticationVerificationCodeSlotProps) => {
  return (
    <div {...stylex.props(styles.slot, isActive && styles.slotActive)}>
      {char ? (
        <div {...stylex.props(styles.inputChar)}>{char}</div>
      ) : (
        <div {...stylex.props(styles.placeholderChar)}>
          {placeholderChar ?? 'X'}
        </div>
      )}
      {hasFakeCaret && (
        <div {...stylex.props(styles.caretContainer)}>
          <div {...stylex.props(styles.caret)} />
        </div>
      )}
    </div>
  );
};
