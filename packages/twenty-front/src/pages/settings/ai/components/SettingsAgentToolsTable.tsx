import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';

import { type CurrentWorkspace } from '@/auth/states/currentWorkspaceState';
import { Table } from '@/ui/layout/table/components/Table';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { IconChevronRight } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import { SettingsToolIcon } from '~/pages/settings/ai/components/SettingsToolIcon';
import {
  SettingsToolTableRow,
  TOOL_TABLE_ROW_GRID_TEMPLATE_COLUMNS,
} from '~/pages/settings/ai/components/SettingsToolTableRow';
import { type SettingsAgentToolApplication } from '~/pages/settings/ai/types/SettingsAgentToolApplication';
import { type SettingsAgentToolItem } from '~/pages/settings/ai/types/SettingsAgentToolItem';
import { getToolApplicationId } from '~/pages/settings/ai/utils/getToolApplicationId';
import { getToolLink } from '~/pages/settings/ai/utils/getToolLink';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type SettingsAgentToolsTableProps = {
  tools: SettingsAgentToolItem[];
  isLoading: boolean;
  applicationById: Map<string, SettingsAgentToolApplication>;
  currentWorkspace: CurrentWorkspace | null;
};

const styles = stylex.create({
  tableHeaderRowContainer: {
    marginBottom: spacing['--t-spacing-2'],
  },
});

export const SettingsAgentToolsTable = ({
  tools,
  isLoading,
  applicationById,
  currentWorkspace,
}: SettingsAgentToolsTableProps) => {
  const theme = useTheme();
  const { t } = useLingui();

  return (
    <Table>
      <div {...stylex.props(styles.tableHeaderRowContainer)}>
        <TableRow gridTemplateColumns={TOOL_TABLE_ROW_GRID_TEMPLATE_COLUMNS}>
          <TableHeader>{t`Name`}</TableHeader>
          <TableHeader>{t`App`}</TableHeader>
          <TableHeader />
        </TableRow>
      </div>
      {isLoading
        ? Array.from({ length: 3 }).map((_, index) => (
            <SkeletonLine height={32} key={index} />
          ))
        : tools.map((tool) => {
            const application = isDefined(tool.applicationId)
              ? applicationById.get(tool.applicationId)
              : undefined;

            return (
              <SettingsToolTableRow
                key={tool.identifier}
                leftIcon={
                  <SettingsToolIcon
                    icon={tool.icon}
                    toolName={tool.name}
                    objectName={tool.objectName ?? undefined}
                    application={application}
                  />
                }
                name={tool.label ?? tool.name}
                applicationId={getToolApplicationId(tool, currentWorkspace)}
                action={
                  <IconChevronRight
                    size={theme.icon.size.md}
                    stroke={theme.icon.stroke.sm}
                    color={theme.font.color.tertiary}
                  />
                }
                link={getToolLink(tool)}
              />
            );
          })}
    </Table>
  );
};
