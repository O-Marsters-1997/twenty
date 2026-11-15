import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: {
    flex: '1',
    minHeight: '0',
    width: '100%',
  },
});

export const OnboardingStepPageLoader = () => (
  <div {...stylex.props(styles.container)} />
);
