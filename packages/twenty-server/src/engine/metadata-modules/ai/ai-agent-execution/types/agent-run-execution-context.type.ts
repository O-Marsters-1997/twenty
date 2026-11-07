import { type ActorMetadata } from 'twenty-shared/types';

import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type AgentRunRoleIds } from 'src/engine/metadata-modules/ai/ai-agent-execution/types/agent-run-role-ids.type';
import { type AgentConversationActor } from 'src/engine/metadata-modules/ai/ai-history/types/agent-conversation-actor.type';
import { type RolePermissionConfig } from 'src/engine/twenty-orm/types/role-permission-config.type';

export type AgentRunExecutionContext = {
  authContext: WorkspaceAuthContext;
  actorContext?: ActorMetadata;
  // who the run's turns are recorded as sent by
  turnCreatedBy: ActorMetadata;
  userWorkspaceId: string | null;
  // what the run itself can read, such as the record an awaited event is about
  rolePermissionConfig: RolePermissionConfig;
  // narrows the agent's own role, such as to the application a run belongs to
  agentRunRoleIds?: AgentRunRoleIds;
  // who the continued conversation is read for, so turns others acted on read as theirs
  conversationActor?: AgentConversationActor;
  // the application the caller is bound to, whose tools are the only ones a call it posts can propose
  application?: FlatApplication;
};
