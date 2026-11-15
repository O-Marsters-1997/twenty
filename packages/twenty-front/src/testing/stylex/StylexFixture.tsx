import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  root: {
    paddingBlock: 4,
    color: 'rebeccapurple',
  },
});

export const StylexFixture = () => (
  <div data-testid="stylex-fixture" {...stylex.props(styles.root)}>
    StyleX
  </div>
);
