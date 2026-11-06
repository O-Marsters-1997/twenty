import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { type ToolExecuteFunction, type ToolSet } from 'ai';
import { isDefined, isPlainObject } from 'twenty-shared/utils';
import { isToolOutputSuccessful } from 'src/engine/core-modules/tool-provider/utils/is-tool-output-successful.util';

import { JSON_RPC_ERROR_CODE } from 'src/engine/api/mcp/constants/json-rpc-error-code.const';
import { MCP_PROGRESS_NOTIFICATION_METHOD } from 'src/engine/api/mcp/constants/mcp-progress-notification.const';
import { type McpToolAnnotations } from 'src/engine/api/mcp/types/mcp-tool-annotations.type';
import { getProgressToken } from 'src/engine/api/mcp/utils/get-progress-token.util';
import { wrapJsonRpcResponse } from 'src/engine/api/mcp/utils/wrap-jsonrpc-response.util';

type McpToolDefinition = ToolSet[string] & {
  annotations?: McpToolAnnotations;
};

const unwrapJsonSchema = (schema: unknown) =>
  schema && typeof schema === 'object' && 'jsonSchema' in schema
    ? schema.jsonSchema
    : schema;

@Injectable()
export class McpToolExecutorService {
  async handleToolCall(
    id: string | number,
    toolSet: ToolSet,
    params: Record<string, unknown>,
    sseWriter?: (data: Record<string, unknown>) => void,
  ) {
    if (!isNonEmptyString(params.name)) {
      return wrapJsonRpcResponse(id, {
        error: {
          code: JSON_RPC_ERROR_CODE.INVALID_PARAMS,
          message: 'Tool name is required',
        },
      });
    }

    const toolName = params.name;
    const tool = toolSet[toolName];

    if (!isDefined(tool) || !isDefined(tool.execute)) {
      return wrapJsonRpcResponse(id, {
        error: {
          code: JSON_RPC_ERROR_CODE.INVALID_PARAMS,
          message: `Unknown tool: ${toolName}`,
        },
      });
    }

    const progressToken = getProgressToken(params);

    if (isDefined(sseWriter) && isDefined(progressToken)) {
      sseWriter({
        jsonrpc: '2.0',
        method: MCP_PROGRESS_NOTIFICATION_METHOD,
        params: {
          progressToken,
          progress: 0,
          total: 1,
        },
      });
    }

    try {
      // ToolSet widens execute to a union no argument satisfies
      const execute = tool.execute as ToolExecuteFunction<
        unknown,
        unknown,
        undefined
      >;
      const result = await execute(params.arguments, {
        toolCallId: '1',
        messages: [],
        context: undefined,
      });
      const succeeded = isToolOutputSuccessful(result);
      return wrapJsonRpcResponse(id, {
        result: {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          isError: !succeeded,
        },
      });
    } catch (executionError) {
      return wrapJsonRpcResponse(id, {
        result: {
          content: [
            {
              type: 'text',
              text:
                executionError instanceof Error
                  ? executionError.message
                  : 'Tool execution failed',
            },
          ],
          isError: true,
        },
      });
    }
  }

  handleToolsListing(id: string | number, toolSet: ToolSet) {
    const toolsArray = Object.entries(toolSet)
      .filter(([, def]) => !!def.inputSchema)
      .map(([name, def]) => {
        const toolDefinition = def as McpToolDefinition;
        // The AI SDK wraps schemas as { jsonSchema } but MCP expects the bare schema
        const inputSchema = unwrapJsonSchema(toolDefinition.inputSchema);

        return {
          name,
          description: toolDefinition.description,
          inputSchema: {
            ...(isPlainObject(inputSchema) ? inputSchema : {}),
            type: 'object',
          },
          ...(isDefined(toolDefinition.annotations) && {
            annotations: toolDefinition.annotations,
          }),
        };
      });

    return wrapJsonRpcResponse(id, {
      result: {
        tools: toolsArray,
      },
    });
  }
}
