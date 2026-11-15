import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useStore } from 'jotai';
import { type ReactNode, useEffect } from 'react';
import { FieldMetadataType } from 'twenty-shared/types';
import { ComponentDecorator } from 'twenty-ui/testing';

import { AiChatFormCard } from '@/ai/components/AiChatFormCard';
import { agentChatDisplayedThreadState } from '@/ai/states/agentChatDisplayedThreadState';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';

import { MemoryRouterDecorator } from '~/testing/decorators/MemoryRouterDecorator';
import { RootDecorator } from '~/testing/decorators/RootDecorator';
import { ToastDecorator } from '~/testing/decorators/ToastDecorator';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: {
    maxWidth: '400px',
    paddingTop: '24px',
    paddingRight: '24px',
    paddingBottom: '24px',
    paddingLeft: '24px',
  },
});

const StoreSeeder = ({ children }: { children: ReactNode }) => {
  const store = useStore();

  useEffect(() => {
    store.set(currentAiChatThreadState.atom, 'thread-1');
    store.set(agentChatDisplayedThreadState.atom, 'thread-1');
  }, [store]);

  return <>{children}</>;
};

const meta: Meta<typeof AiChatFormCard> = {
  title: 'Modules/AiChat/AiChatFormCard',
  component: AiChatFormCard,
  decorators: [
    (Story) => (
      <StoreSeeder>
        <div {...stylex.props(styles.container)}>
          <Story />
        </div>
      </StoreSeeder>
    ),
    ToastDecorator,
    ComponentDecorator,
    MemoryRouterDecorator,
    RootDecorator,
  ],
};

export default meta;

type Story = StoryObj<typeof AiChatFormCard>;

export const Default: Story = {
  args: {
    toolCallId: 'call-1',
    fields: [
      {
        name: 'amount',
        label: 'Amount (USD)',
        type: FieldMetadataType.NUMBER,
        placeholder: '50000',
      },
      {
        name: 'closeDate',
        label: 'Expected close',
        type: FieldMetadataType.DATE,
      },
      {
        name: 'nextStep',
        label: 'Next step',
        type: FieldMetadataType.TEXT,
        placeholder: 'Security review with their IT team',
      },
    ],
  },
};
