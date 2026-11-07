import { type LanguageModel, NoSuchToolError, Output, generateText } from 'ai';
import { type z } from 'zod';

import { buildAiTelemetry } from 'src/engine/metadata-modules/ai/ai-models/utils/build-ai-telemetry.util';

type ToolCall = {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  input: string;
};

export const repairToolCall = async ({
  toolCall,
  tools,
  inputSchema,
  error,
  model,
  workspaceId,
  userWorkspaceId,
}: {
  toolCall: ToolCall;
  tools: Record<string, unknown>;
  inputSchema: (toolCall: { toolName: string }) => unknown;
  error: Error;
  model: LanguageModel;
  workspaceId: string;
  userWorkspaceId: string | null;
}): Promise<ToolCall | null> => {
  if (NoSuchToolError.isInstance(error)) {
    return null;
  }

  const tool = tools[toolCall.toolName];

  if (!tool || typeof tool !== 'object' || !('inputSchema' in tool)) {
    return null;
  }

  const schema = inputSchema(toolCall);

  if (!schema || typeof schema !== 'object') {
    return null;
  }

  try {
    const result = await generateText({
      model,
      output: Output.object({ schema: schema as z.ZodTypeAny }),
      prompt: [
        `The AI model attempted to call the tool "${toolCall.toolName}" with invalid input.`,
        ``,
        `Input provided:`,
        JSON.stringify(toolCall.input, null, 2),
        ``,
        `Error encountered:`,
        error.message,
        ``,
        `Please fix the input to exactly match the required schema.`,
        `Pay special attention to:`,
        `- Enum values must match exactly (e.g., "DescNullsLast" not "desc")`,
        `- Object structures must match the schema shape`,
        `- Array items must follow the specified format`,
      ].join('\n'),
      ...buildAiTelemetry({
        functionId: 'repair-tool-call',
        workspaceId,
        userWorkspaceId,
      }),
    });

    const repairedInput = result.output;

    if (repairedInput == null) {
      return null;
    }

    return {
      type: 'tool-call',
      toolCallId: toolCall.toolCallId,
      toolName: toolCall.toolName,
      input: JSON.stringify(repairedInput),
    };
  } catch {
    return null;
  }
};
