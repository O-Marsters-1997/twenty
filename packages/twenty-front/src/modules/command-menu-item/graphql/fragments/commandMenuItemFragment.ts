import { gql } from '@apollo/client';

export const COMMAND_MENU_ITEM_FRAGMENT = gql`
  fragment CommandMenuItemFields on CommandMenuItem {
    id
    universalIdentifier
    applicationId
    coreWorkflowVersionId
    workflowVersionId
    engineComponentKey
    label
    icon
    shortLabel
    position
    isPinned
    payload {
      ... on PathCommandMenuItemPayload {
        path
      }
    }
    hotKeys
    conditionalAvailabilityExpression
    conditionalPinnedExpression
    availabilityType
    availabilityObjectMetadataId
    navigationTargetObjectMetadataId
    pageLayoutId
    isActive
  }
`;
