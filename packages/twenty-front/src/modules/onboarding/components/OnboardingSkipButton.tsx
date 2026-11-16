import { useLingui } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  font,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    color: fontColor['--t-font-color-tertiary'],
    cursor: 'pointer',
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    height: spacing['--t-spacing-8'],
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-5'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-5'],
  },
});

type OnboardingSkipButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

export const OnboardingSkipButton = ({
  onClick,
  disabled,
}: OnboardingSkipButtonProps) => {
  const { t } = useLingui();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      {...stylex.props(styles.skipButton)}
    >
      {t`Skip`}
    </button>
  );
};
