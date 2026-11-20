import { type DeveloperModeTypingFrame } from '@/navigation/types/DeveloperModeTypingFrame';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import {
  accent,
  borderRadius,
  codeFont,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const caretBlink = stylex.keyframes({
  '50%': { opacity: 0 },
});

const styles = stylex.create({
  label: {
    flex: '1',
    overflow: 'hidden',
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    textOverflow: 'ellipsis',
    whiteSpace: 'pre',
    minWidth: '0',
  },
  codeFontText: {
    fontFamily: codeFont['--t-code-font-family'],
    fontWeight: fontWeight['--t-font-weight-regular'],
  },
  caret: {
    borderRadius: borderRadius['--t-border-radius-xs'],
    animationDuration: '1.06s',
    animationIterationCount: 'infinite',
    animationName: {
      default: caretBlink,
      [media.reducedMotion]: 'none',
    },
    animationTimingFunction: 'steps(1)',
    backgroundColor: accent['--t-accent-accent9'],
    display: 'inline-block',
    verticalAlign: 'middle',
    height: spacing['--t-spacing-3'],
    marginLeft: spacing['--t-spacing-0_5'],
    width: spacing['--t-spacing-0_5'],
  },
});

type DeveloperModeSwitchLabelProps = {
  label: string;
  frame: DeveloperModeTypingFrame | null;
  isTyping: boolean;
};

export const DeveloperModeSwitchLabel = ({
  label,
  frame,
  isTyping,
}: DeveloperModeSwitchLabelProps) => {
  if (!isDefined(frame)) {
    return (
      <span aria-hidden {...stylex.props(styles.label)}>
        {label}
      </span>
    );
  }

  return (
    <span aria-hidden {...stylex.props(styles.label)}>
      {frame.text.slice(0, frame.codeFontStart)}
      <span {...stylex.props(styles.codeFontText)}>
        {frame.text.slice(frame.codeFontStart, frame.codeFontEnd)}
      </span>
      {frame.text.slice(frame.codeFontEnd)}
      {isTyping && <span {...stylex.props(styles.caret)} />}
    </span>
  );
};
