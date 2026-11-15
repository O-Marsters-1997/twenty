import { type Meta, type StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { within } from 'storybook/test';
import { IconGoogle } from 'twenty-ui/icon';

import { ImportContacts } from '~/pages/onboarding/ImportContacts';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  viewport: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100%',
  },
});

const meta: Meta<typeof ImportContacts> = {
  title: 'Pages/Onboarding/ImportContacts',
  component: ImportContacts,
  parameters: { layout: 'fullscreen' },
  args: {
    providerActions: [
      {
        label: 'Continue with Google',
        Icon: IconGoogle,
        onClick: action('continue-with-google'),
      },
    ],
    onSkip: action('skip'),
  },
  decorators: [
    (Story) => (
      <div {...stylex.props(styles.viewport)}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ImportContacts>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText('Import your contacts');
  },
};
