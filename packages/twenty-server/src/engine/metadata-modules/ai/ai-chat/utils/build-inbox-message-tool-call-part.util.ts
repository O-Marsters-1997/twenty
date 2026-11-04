import {
  ASK_QUESTION_TOOL_NAME,
  type ExtendedUIMessagePart,
  PROPOSE_TOOL_CALL_TOOL_NAME,
  REQUEST_FORM_TOOL_NAME,
} from 'twenty-shared/ai';
import { isPlainObject } from 'twenty-shared/utils';
import { type z } from 'zod';

import { buildToolPart } from 'src/engine/metadata-modules/ai/ai-chat/utils/build-tool-part.util';
import { type ResolveInboxProposal } from 'src/engine/metadata-modules/ai/ai-chat/types/resolve-inbox-proposal.type';
import {
  askQuestionInputSchema,
  buildAskQuestionPendingOutput,
} from 'src/engine/metadata-modules/ai/ai-agent-execution/pausing-tools/ask-question.pausing-tool';
import {
  buildProposeToolCallPendingOutput,
  proposeToolCallInputSchema,
} from 'src/engine/metadata-modules/ai/ai-agent-execution/pausing-tools/propose-tool-call.pausing-tool';
import {
  buildRequestFormPendingOutput,
  requestFormInputSchema,
} from 'src/engine/metadata-modules/ai/ai-agent-execution/pausing-tools/request-form.pausing-tool';
import {
  AiException,
  AiExceptionCode,
} from 'src/engine/metadata-modules/ai/ai.exception';

type InboxMessageToolCallPart = {
  part: ExtendedUIMessagePart;
  isAwaitingAnswer: boolean;
};

const throwInvalidToolCall = (reason: string): never => {
  throw new AiException(
    `Invalid inbox message tool call: ${reason}`,
    AiExceptionCode.INVALID_AGENT_INPUT,
  );
};

const parseInput = <TInput>(schema: z.ZodType<TInput>, input: unknown) => {
  const parseResult = schema.safeParse(input);

  return parseResult.success
    ? parseResult.data
    : throwInvalidToolCall(parseResult.error.message);
};


const buildPausingToolPart = async ({
  toolName,
  toolCallId,
  input,
  resolveProposal,
}: {
  toolName: unknown;
  toolCallId: string;
  input: unknown;
  resolveProposal: ResolveInboxProposal;
}): Promise<ExtendedUIMessagePart> => {
  switch (toolName) {
    case ASK_QUESTION_TOOL_NAME: {
      const question = parseInput(askQuestionInputSchema, input);

      return buildToolPart({
        toolName,
        toolCallId,
        input: question,
        output: buildAskQuestionPendingOutput(question),
      });
    }
    case REQUEST_FORM_TOOL_NAME:
      return buildToolPart({
        toolName,
        toolCallId,
        input: parseInput(requestFormInputSchema, input),
        output: buildRequestFormPendingOutput(),
      });
    case PROPOSE_TOOL_CALL_TOOL_NAME: {
      const proposeToolCallInput = parseInput(
        proposeToolCallInputSchema,
        input,
      );
      const resolution = await resolveProposal(proposeToolCallInput);

      if ('error' in resolution) {
        return throwInvalidToolCall(resolution.error);
      }

      return buildToolPart({
        toolName,
        toolCallId,
        input: proposeToolCallInput,
        output: buildProposeToolCallPendingOutput(resolution.proposal),
      });
    }
    default:
      return throwInvalidToolCall(
        `toolName must be ${ASK_QUESTION_TOOL_NAME}, ${REQUEST_FORM_TOOL_NAME} or ${PROPOSE_TOOL_CALL_TOOL_NAME}`,
      );
  }
};

export const buildInboxMessageToolCallPart = async ({
  toolCall,
  toolCallId,
  resolveProposal,
}: {
  toolCall: unknown;
  toolCallId: string;
  resolveProposal: ResolveInboxProposal;
}): Promise<InboxMessageToolCallPart> => {
  if (!isPlainObject(toolCall)) {
    return throwInvalidToolCall('toolCall must be an object');
  }

  return {
    part: await buildPausingToolPart({
      toolName: toolCall.toolName,
      toolCallId,
      input: toolCall.input,
      resolveProposal,
    }),
    isAwaitingAnswer: true,
  };
};
