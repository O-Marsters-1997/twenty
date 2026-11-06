import { gql } from '@apollo/client';

export const GET_MY_CONNECTED_ACCOUNTS = gql`
  query MyConnectedAccounts {
    myConnectedAccounts {
      id
      handle
      provider
      authFailedAt
      authFailedReason
      archivedAt
      scopes
      handleAliases
      lastSignedInAt
      userWorkspaceId
      applicationId
      name
      visibility
      lastCredentialsRefreshedAt
      createdAt
      updatedAt
    }
  }
`;
