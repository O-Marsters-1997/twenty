import { type Meta, type StoryObj } from '@storybook/react-vite';
import { createStore, Provider } from 'jotai';
import { type ReactNode, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ComponentDecorator } from 'twenty-ui/testing';
import { AiChatContextUsageButton } from '@/ai/components/internal/AiChatContextUsageButton';
import { AiChatContextUsageDetails } from '@/ai/components/internal/AiChatContextUsageDetails';
import {
  agentChatUsageFamilyState,
  type AgentChatUsageState,
} from '@/ai/states/agentChatUsageFamilyState';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';

const USAGE: AgentChatUsageState = {
  conversationSize: 200000,
  contextWindowTokens: 1000000,
  inputTokens: 200000,
  outputTokens: 40000,
  cachedInputTokens: 75000,
  lastMessage: {
    inputTokens: 100000,
    outputTokens: 20000,
    cachedInputTokens: 50000,
  },
};

const UsageStory = ({
  usage = null,
  children,
}: {
  usage?: AgentChatUsageState | null;
  children?: ReactNode;
}) => {
  const [store] = useState(() => {
    const storyStore = createStore();
    storyStore.set(currentAiChatThreadState.atom, 'story-thread');
    storyStore.set(
      agentChatUsageFamilyState.atomFamily({ threadId: 'story-thread' }),
      usage,
    );
    return storyStore;
  });
  return (
    <Provider store={store}>
      {children ?? <AiChatContextUsageButton />}
    </Provider>
  );
};

const meta = {
  title: 'Modules/AI/AiChatContextUsageButton',
  component: AiChatContextUsageButton,
  decorators: [ComponentDecorator],
  parameters: { container: { width: 400, height: 650 } },
} satisfies Meta<typeof AiChatContextUsageButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const NewChat: Story = {
  render: () => <UsageStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: /^Context and usage/ });
    await expect(trigger).toHaveAccessibleName(
      'Context and usage, context window unavailable',
    );
    await userEvent.click(trigger);
    await waitFor(() => expect(page.getByRole('dialog')).toBeVisible());
    await expect(
      page.queryByRole('button', { name: /^More/ }),
    ).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(page.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  },
};
export const Expanded: Story = {
  render: () => <UsageStory usage={USAGE} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: /^Context and usage/ });
    await expect(trigger).toHaveAccessibleName(
      'Context and usage, 20% of context window used',
    );
    await userEvent.tab();
    await waitFor(() => expect(page.getByRole('dialog')).toBeVisible());
    await expect(
      page.getByRole('progressbar', { name: 'Context window' }),
    ).toHaveAttribute('aria-valuetext', '20% used, 200k of 1M tokens');
    await userEvent.click(page.getByRole('button', { name: /^More/ }));
    await expect(page.getByText('Last message')).toBeVisible();
    await expect(page.getByText('Conversation')).toBeVisible();
    await expect(page.getAllByText('Cached input')).toHaveLength(2);
    await expect(page.getByText('50k')).toBeVisible();
    await expect(page.getByText('75k')).toBeVisible();
    await userEvent.click(page.getByRole('button', { name: /^Less/ }));
    await expect(page.queryByText('Last message')).not.toBeInTheDocument();
    await userEvent.click(trigger);
  },
};
export const ReopenedConversation: Story = {
  render: () => <UsageStory usage={{ ...USAGE, lastMessage: null }} />,
};
export const Details: Story = {
  render: () => (
    <UsageStory usage={USAGE}>
      <AiChatContextUsageDetails />
    </UsageStory>
  ),
};
