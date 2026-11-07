import { gql } from '@apollo/client';

export const CURRENT_USER_SESSIONS = gql`
  query CurrentUserSessions {
    currentUserSessions {
      id
      workspaceId
      authProvider
      userAgent
      ipAddress
      createdAt
      lastActiveAt
      expiresAt
      isCurrent
    }
  }
`;
