export type AuthPrincipalVariant =
  | {
      kind: 'userSession';
      variant: 'standard' | 'playground' | 'workspaceAgnostic';
    }
  | { kind: 'apiKey' }
  | {
      kind: 'oauthClient' | 'application';
      variant: 'withUser' | 'withoutUser';
    };
