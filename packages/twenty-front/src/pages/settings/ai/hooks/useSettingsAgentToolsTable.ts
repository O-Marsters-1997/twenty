import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';

import { useGetToolIndex } from '@/ai/hooks/useGetToolIndex';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { ToolCategory } from 'twenty-shared/ai';
import { type FindManyApplicationsForToolTableQuery } from '~/generated-metadata/graphql';
import { FIND_MANY_APPLICATIONS_FOR_TOOL_TABLE } from '~/pages/settings/ai/graphql/queries/findManyApplicationsForToolTable';
import { type SettingsAgentToolItem } from '~/pages/settings/ai/types/SettingsAgentToolItem';

export const useSettingsAgentToolsTable = () => {
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const {
    toolIndex,
    loading: toolIndexLoading,
    error: toolIndexError,
  } = useGetToolIndex();

  const { data: applicationsData } =
    useQuery<FindManyApplicationsForToolTableQuery>(
      FIND_MANY_APPLICATIONS_FOR_TOOL_TABLE,
    );

  const allTools: SettingsAgentToolItem[] = useMemo(
    () => [
      ...toolIndex
        .filter((tool) => tool.category !== ToolCategory.LOGIC_FUNCTION)
        .map((tool) => ({
          identifier: tool.name,
          name: tool.name,
          label: tool.label,
          description: tool.description,
          category: tool.category,
          objectName: tool.objectName,
          icon: tool.icon,
        })),
    ],
    [toolIndex],
  );

  const applicationById = new Map(
    (applicationsData?.findManyApplications ?? []).map((application) => [
      application.id,
      application,
    ]),
  );

  const isLoading = toolIndexLoading && !toolIndexError;

  return {
    allTools,
    applicationById,
    currentWorkspace,
    isLoading,
  };
};
