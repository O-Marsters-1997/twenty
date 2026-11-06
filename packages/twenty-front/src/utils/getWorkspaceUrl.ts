import { type WorkspaceUrls } from '~/generated-metadata/graphql';

export const getWorkspaceUrl = (workspaceUrls: WorkspaceUrls) => {
  return workspaceUrls.subdomainUrl;
};
