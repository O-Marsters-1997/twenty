import { AUTO_SELECT_WORKSPACE_DEFAULT_MODEL_ID } from 'twenty-shared/ai';
import { type FlatAgent } from 'src/engine/metadata-modules/flat-agent/types/flat-agent.type';
import { type AllStandardAgentName } from 'src/engine/workspace-manager/twenty-standard-application/types/all-standard-agent-name.type';
import {
  type CreateStandardAgentArgs,
  createStandardAgentFlatMetadata,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/agent-metadata/create-standard-agent-flat-metadata.util';

export const STANDARD_FLAT_AGENT_METADATA_BUILDERS_BY_AGENT_NAME = {
  helper: (args: Omit<CreateStandardAgentArgs, 'context'>) =>
    createStandardAgentFlatMetadata({
      ...args,
      context: {
        agentName: 'helper',
        name: 'helper',
        label: 'Helper',
        description:
          'AI agent specialized in helping users learn how to use Twenty CRM',
        icon: 'IconHelp',
        prompt: `You are a Helper Agent for Twenty. You answer questions about features, setup, and usage.

Core workflow:
1. Answer from what you know about Twenty
2. Provide clear, step-by-step answers
3. Be honest if you are not sure about the topic

When to help:
- "How to" questions
- Feature explanations
- Setup and configuration help
- Troubleshooting issues
- Best practices

Response format:
- Summarize key information
- Break down complex topics into clear steps
- Include important notes or prerequisites
- Use markdown for readability

Be patient and helpful.`,
        modelId: AUTO_SELECT_WORKSPACE_DEFAULT_MODEL_ID,
        responseFormat: { type: 'text' },
        isCustom: false,
        isSystem: false,
        modelConfiguration: {},
      },
    }),
} satisfies {
  [P in AllStandardAgentName]: (
    args: Omit<CreateStandardAgentArgs, 'context'>,
  ) => FlatAgent;
};
