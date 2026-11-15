import { type Decorator } from '@storybook/react-vite';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
  },
});

export const WorkflowStepActionDrawerDecorator: Decorator = (Story) => (
  <div {...stylex.props(styles.wrapper)}>
    <Story />
  </div>
);
