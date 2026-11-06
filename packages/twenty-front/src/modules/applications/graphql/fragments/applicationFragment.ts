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
    createdAt
    defaultRoleId
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
  }
`;
