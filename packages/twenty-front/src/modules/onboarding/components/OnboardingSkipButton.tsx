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
    borderColor: borderColor['--t-border-color-light'],
    borderStyle: 'solid',
    borderWidth: '1px',
    backgroundColor: 'transparent',
    color: fontColor['--t-font-color-tertiary'],
    cursor: 'pointer',
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    height: spacing['--t-spacing-8'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-5'],
    paddingRight: spacing['--t-spacing-5'],
    paddingTop: '0',
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
