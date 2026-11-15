import { FullScreenContainer } from '@/ui/layout/fullscreen/components/FullScreenContainer';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { ComponentDecorator } from 'twenty-ui/testing';
import { ComponentWithRouterDecorator } from '~/testing/decorators/ComponentWithRouterDecorator';
import * as stylex from '@stylexjs/stylex';

const meta: Meta<typeof FullScreenContainer> = {
  title: 'UI/Layout/FullScreenContainer',
  component: FullScreenContainer,
  decorators: [ComponentDecorator, ComponentWithRouterDecorator],
};
export default meta;

type Story = StoryObj<typeof FullScreenContainer>;

const styles = stylex.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const Default: Story = {
  args: {
    children: (
      <div {...stylex.props(styles.container)}>This is full-screen content</div>
    ),
    links: [
      {
        children: 'Layout',
        href: '/',
      },
      {
        children: 'FullScreen',
        href: '/',
      },
    ],
    exitFullScreen: () => {},
  },
  decorators: [ComponentDecorator],
};
