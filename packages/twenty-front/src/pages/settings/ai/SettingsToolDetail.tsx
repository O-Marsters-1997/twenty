import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { TextArea } from '@/ui/input/components/TextArea';
import { useQuery } from '@apollo/client/react';
import { t } from '@lingui/core/macro';

import { useParams } from 'react-router-dom';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath, isDefined } from 'twenty-shared/utils';
import { Section } from 'twenty-ui/components/layout';
import {
  GetToolIndexDocument,
  GetToolInputSchemaDocument,
} from '~/generated-metadata/graphql';
import { SettingsToolIcon } from '~/pages/settings/ai/components/SettingsToolIcon';
import { SettingsToolParameterTable } from '@/settings/ai/components/SettingsToolParameterTable';

export const SettingsToolDetail = () => {
  const { toolIdentifier } = useParams();

  const { data: toolIndexData, loading: toolIndexLoading } =
    useQuery(GetToolIndexDocument);

  const systemTool = toolIndexData?.getToolIndex.find(
    (entry) => entry.name === toolIdentifier,
  );

  const { data: schemaData, loading: schemaLoading } = useQuery(
    GetToolInputSchemaDocument,
    {
      variables: { toolName: toolIdentifier ?? '' },
      skip: !isDefined(systemTool),
    },
  );

  const loading = toolIndexLoading || schemaLoading;

  const displayName = systemTool?.label ?? toolIdentifier;
  const inputSchema = schemaData?.getToolInputSchema;

  return (
    <SettingsPageLayout
      title={displayName ?? ''}
      icon={
        <SettingsToolIcon
          icon={systemTool?.icon}
          toolName={systemTool?.name}
          objectName={systemTool?.objectName ?? undefined}
        />
      }
      links={[
        {
          children: t`Workspace`,
          href: getSettingsPath(SettingsPath.General),
        },
        {
          children: t`AI`,
          href: getSettingsPath(SettingsPath.AI, undefined, undefined, 'tools'),
        },
        { children: displayName ?? '' },
      ]}
    >
      <SettingsPageContainer>
        {loading ? (
          <Section.Root>
            <SkeletonLine height={20} width={200} />
            <SkeletonLine height={20} width={400} />

            <SkeletonLine height={80} />
          </Section.Root>
        ) : (
          <>
            <Section.Root>
              <Section.Header
                title={t`Parameters`}
                description={t`Input parameters accepted by this tool`}
              />
              <SettingsToolParameterTable
                schemaProperties={inputSchema?.properties ?? {}}
                requiredFields={inputSchema?.required}
              />
            </Section.Root>

            <Section.Root>
              <Section.Header
                title={t`Description`}
                description={t`Define what this tool does`}
              />
              <TextArea
                textAreaId="tool-description-textarea"
                placeholder={t`Write a description`}
                minRows={3}
                maxRows={5}
                value={systemTool?.description ?? ''}
                onChange={() => {}}
                disabled
              />
            </Section.Root>
          </>
        )}
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
