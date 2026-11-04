import { AGENT_FRAGMENT } from '@/ai/graphql/fragments/agentFragment';
import { OBJECT_METADATA_FRAGMENT } from '@/object-metadata/graphql/fragment';
import { LOGIC_FUNCTION_FRAGMENT } from '@/logic-functions/graphql/fragments/logicFunctionFragment';
import { gql } from '@apollo/client';

export const APPLICATION_FRAGMENT = gql`
  ${AGENT_FRAGMENT}
  ${LOGIC_FUNCTION_FRAGMENT}
  ${OBJECT_METADATA_FRAGMENT}
  fragment ApplicationFields on Application {
    id
    name
    description
    logoUrl
    version
    universalIdentifier
    canBeUninstalled
    autoUpgrade
    createdAt
    defaultRoleId
    healthCheckLogicFunctionId
    availablePackages
    agents {
      ...AgentFields
    }
    commandMenuItems {
      id
      label
      shortLabel
      icon
      isPinned
      availabilityType
      conditionalAvailabilityExpression
      universalIdentifier
      applicationId
      createdAt
      updatedAt
    }
    objects {
      ...ObjectMetadataFields
    }
    logicFunctions {
      ...LogicFunctionFields
    }
  }
`;
