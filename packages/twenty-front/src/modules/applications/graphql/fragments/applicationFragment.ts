import { AGENT_FRAGMENT } from '@/ai/graphql/fragments/agentFragment';
import { OBJECT_METADATA_FRAGMENT } from '@/object-metadata/graphql/fragment';
import { gql } from '@apollo/client';

export const APPLICATION_FRAGMENT = gql`
  ${AGENT_FRAGMENT}
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
    settingsCustomTabFrontComponentId
    healthCheckLogicFunctionId
    availablePackages
    agents {
      ...AgentFields
    }
    frontComponents {
      id
      name
      description
      applicationId
      componentName
      builtComponentChecksum
      universalIdentifier
      isHeadless
      usesSdkClient
      frontComponentSharedDependenciesChecksum
      createdAt
      updatedAt
    }
    commandMenuItems {
      id
      label
      shortLabel
      icon
      isPinned
      availabilityType
      conditionalAvailabilityExpression
      frontComponentId
      universalIdentifier
      applicationId
      createdAt
      updatedAt
    }
    settingsMenuItems {
      id
      universalIdentifier
      applicationId
      frontComponentId
      title
      icon
      position
      scope
    }
    objects {
      ...ObjectMetadataFields
    }
  }
`;
