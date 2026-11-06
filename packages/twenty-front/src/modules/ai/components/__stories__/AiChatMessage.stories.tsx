import {
  type Decorator,
  type Meta,
  type StoryObj,
} from '@storybook/react-vite';
import { Suspense, useEffect } from 'react';
import { userEvent, within } from 'storybook/test';
import { type ExtendedUIMessage } from 'twenty-shared/ai';
import { ComponentDecorator } from 'twenty-ui/testing';

import { AiChatMessage } from '@/ai/components/AiChatMessage';
import { MarkdownLoadingSkeleton } from '@/ai/components/LazyMarkdownRenderer';

import { agentChatDisplayedThreadState } from '@/ai/states/agentChatDisplayedThreadState';
import { agentChatMessagesFamilyState } from '@/ai/states/agentChatMessagesFamilyState';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';

import { styled } from '@linaria/react';
import { useStore } from 'jotai';
import { RootDecorator } from '~/testing/decorators/RootDecorator';
import { ToastDecorator } from '~/testing/decorators/ToastDecorator';

const StyledConversationContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 700px;
  padding: 24px;
`;

const mockUserMessage: ExtendedUIMessage = {
  id: 'msg-user-1',
  role: 'user',
  parts: [
    {
      type: 'text',
      text: 'Can you analyze my sales data and create a chart showing the monthly trends?',
    },
  ],
  metadata: {
    createdAt: new Date(Date.now() - 120000).toISOString(),
  },
};

const mockSimpleTextResponse: ExtendedUIMessage = {
  id: 'msg-assistant-text',
  role: 'assistant',
  parts: [
    {
      type: 'text',
      text: "Hello! I'm your AI assistant. I can help you with:\n\n- **Data analysis** - Analyze your CRM data and generate insights\n- **Code execution** - Run Python code for complex calculations\n- **Record management** - Create, update, or find records\n\nHow can I assist you today?",
    },
  ],
  metadata: {
    createdAt: new Date().toISOString(),
  },
};

const mockStreamingMessage: ExtendedUIMessage = {
  id: 'msg-streaming',
  role: 'assistant',
  parts: [
    {
      type: 'text',
      text: 'Let me look into that for you',
    },
  ],
  metadata: {
    createdAt: new Date().toISOString(),
  },
};

const mockThinkingStepsStreaming: ExtendedUIMessage = {
  id: 'msg-thinking-streaming',
  role: 'assistant',
  parts: [
    {
      type: 'tool-web_search',
      toolCallId: 'tool-web-search-streaming',
      input: { query: 'top leads status' },
      output: { result: { ok: true } },
      state: 'output-available',
    },
    {
      type: 'reasoning',
      text: 'I need to evaluate the latest lead activity and pipeline stage changes before I can answer accurately.',
      state: 'streaming',
    },
  ],
  metadata: {
    createdAt: new Date().toISOString(),
  },
};

const mockThinkingStepsDone: ExtendedUIMessage = {
  id: 'msg-thinking-done',
  role: 'assistant',
  parts: [
    {
      type: 'tool-web_search',
      toolCallId: 'tool-web-search-done',
      input: { query: 'top leads status' },
      output: { result: { ok: true } },
      state: 'output-available',
    },
    {
      type: 'reasoning',
      text: 'I filtered the most engaged leads and checked the latest interactions to determine which opportunities are moving forward.',
      state: 'done',
    },
    {
      type: 'text',
      text: 'You currently have 5 top leads in active stages. Two are in proposal review and three are in scheduled demo follow-up.',
    },
  ],
  metadata: {
    createdAt: new Date().toISOString(),
    startedAt: '2026-01-01T10:00:00.000Z',
    finishedAt: '2026-01-01T10:01:23.000Z',
  },
};

const mockAnsweredForm: ExtendedUIMessage = {
  id: 'msg-answered-form',
  role: 'assistant',
  parts: [
    {
      type: 'tool-request_form',
      toolCallId: 'tool-request-form',
      input: {
        fields: [
          { name: 'callDate', label: 'Call date', type: 'DATE' },
          { name: 'summary', label: 'Summary', type: 'TEXT' },
        ],
      },
      output: {
        success: true,
        result: {
          status: 'answered',
          values: {
            callDate: '2026-09-29',
            summary: 'Pipeline import first, SSO the week after.',
          },
        },
      },
      state: 'output-available',
    },
  ],
  metadata: {
    createdAt: new Date().toISOString(),
  },
};

const allMockMessages = [
  mockUserMessage,
  mockSimpleTextResponse,
  mockStreamingMessage,
  mockThinkingStepsStreaming,
  mockThinkingStepsDone,
  mockAnsweredForm,
];

const AgentChatMessagesSetterEffect = ({
  messages,
}: {
  messages: ExtendedUIMessage[];
}) => {
  const store = useStore();

  useEffect(() => {
    const currentThreadId = store.get(currentAiChatThreadState.atom);

    store.set(agentChatDisplayedThreadState.atom, currentThreadId);

    store.set(
      agentChatMessagesFamilyState.atomFamily({ threadId: currentThreadId }),
      messages,
    );
  }, [messages, store]);

  return null;
};

const AgentChatMessagesDecorator: Decorator = (Story) => (
  <>
    <AgentChatMessagesSetterEffect messages={allMockMessages} />
    <Suspense fallback={<MarkdownLoadingSkeleton />}>
      <Story />
    </Suspense>
  </>
);

const meta: Meta<typeof AiChatMessage> = {
  title: 'Modules/AI/AiChatMessage',
  component: AiChatMessage,
  decorators: [
    ComponentDecorator,
    RootDecorator,
    ToastDecorator,
    AgentChatMessagesDecorator,
  ],
  parameters: {
    container: { width: 700 },
  },
};

export default meta;
type Story = StoryObj<typeof AiChatMessage>;

export const UserMessage: Story = {
  render: () => <AiChatMessage messageId={mockUserMessage.id} />,
};

export const AssistantTextResponse: Story = {
  render: () => <AiChatMessage messageId={mockSimpleTextResponse.id} />,
};

export const AssistantStreaming: Story = {
  render: () => <AiChatMessage messageId={mockStreamingMessage.id} />,
};

export const ThinkingStepsThinkingState: Story = {
  render: () => <AiChatMessage messageId={mockThinkingStepsStreaming.id} />,
};

export const ThinkingStepsDoneCollapsed: Story = {
  render: () => <AiChatMessage messageId={mockThinkingStepsDone.id} />,
};

export const ThinkingStepsDoneExpanded: Story = {
  render: () => <AiChatMessage messageId={mockThinkingStepsDone.id} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const summaryButton = await canvas.findByRole('button', {
      name: /worked for 1m 23s/i,
    });

    await userEvent.click(summaryButton);
  },
};

export const AnsweredForm: Story = {
  render: () => <AiChatMessage messageId={mockAnsweredForm.id} />,
};
