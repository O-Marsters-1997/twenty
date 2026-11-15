import { type Meta, type StoryObj } from '@storybook/react-vite';

import { StylexTokenSample } from './StylexTokenSample';

const meta: Meta<typeof StylexTokenSample> = {
  title: 'Theme/StylexTokenSample',
  component: StylexTokenSample,
};

export default meta;
type Story = StoryObj<typeof StylexTokenSample>;

export const Default: Story = {};
