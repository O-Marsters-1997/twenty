/* oxlint-disable twenty/no-navigate-prefer-link */
import { ObjectMetadataIcon } from '@/object-metadata/components/ObjectMetadataIcon';
import { useGetIsMetadataItemCustom } from '@/object-metadata/hooks/useGetIsMetadataItemCustom';
import { SettingsCard } from '@/settings/components/SettingsCard';
import { useFilterObjectMetadataItemsWithPermissionOverride } from '@/settings/roles/role-permissions/object-level-permissions/hooks/useFilterObjectWithPermissionOverride';
import { useObjectMetadataItemsThatCanHavePermission } from '@/settings/roles/role-permissions/object-level-permissions/hooks/useObjectMetadataItemsThatCanHavePermission';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { t } from '@lingui/core/macro';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SettingsPath } from 'twenty-shared/types';
import { Section } from 'twenty-ui/components/layout';
import { IconSearch } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  typeSelectContainer: {
    gap: 'inherit',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  container: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    width: '100%',
  },
  cardContainer: {
    cursor: 'pointer',
    display: 'flex',
    position: 'relative',
    width: `calc(50% - ${spacing['--t-spacing-1']})`,
  },
  searchContainer: {
    paddingBottom: spacing['--t-spacing-2'],
  },
});

export const SettingsRolePermissionsObjectLevelObjectPicker = ({
  roleId,
}: {
  roleId: string;
}) => {
  const theme = useTheme();
  const navigate = useNavigateSettings();
  const getIsMetadataItemCustom = useGetIsMetadataItemCustom();
  const [searchParams] = useSearchParams();
  const fromAgentId = searchParams.get('fromAgent');
  const [searchFilter, setSearchFilter] = useState('');

  const { objectMetadataItemsThatCanHavePermission } =
    useObjectMetadataItemsThatCanHavePermission();

  const handleSearchChange = (text: string) => {
    setSearchFilter(text);
  };

  const handleSelectObjectMetadata = (objectMetadataId: string) => {
    navigate(
      SettingsPath.RoleObjectLevel,
      { roleId, objectMetadataId },
      fromAgentId ? { fromAgent: fromAgentId } : undefined,
    );
  };

  const { filterObjectMetadataItemsWithPermissionOverride } =
    useFilterObjectMetadataItemsWithPermissionOverride({
      roleId,
    });

  const objectMetadataItemIdsWithPermission =
    objectMetadataItemsThatCanHavePermission
      .filter(filterObjectMetadataItemsWithPermissionOverride)
      .map((objectMetadataItem) => objectMetadataItem.id);

  const filteredObjectMetadataItems =
    objectMetadataItemsThatCanHavePermission.filter(
      (objectMetadataItem) =>
        objectMetadataItem.labelPlural
          .toLowerCase()
          .includes(searchFilter.toLowerCase()) &&
        !objectMetadataItemIdsWithPermission.includes(objectMetadataItem.id),
    );

  const standardObjects = filteredObjectMetadataItems.filter(
    (item) => !getIsMetadataItemCustom(item),
  );
  const customObjects = filteredObjectMetadataItems.filter((item) =>
    getIsMetadataItemCustom(item),
  );

  return (
    <div {...stylex.props(styles.typeSelectContainer)}>
      <Section.Root>
        <div {...stylex.props(styles.searchContainer)}>
          <SettingsTextInput
            instanceId="role-permissions-object-search"
            value={searchFilter}
            onChange={handleSearchChange}
            placeholder={t`Search an object`}
            fullWidth
            LeftIcon={IconSearch}
            sizeVariant="lg"
          />
        </div>
      </Section.Root>

      {standardObjects.length > 0 && (
        <Section.Root>
          <Section.Header
            title={t`Standard`}
            description={t`All the standard objects`}
          />
          <div {...stylex.props(styles.container)}>
            {standardObjects.map((objectMetadataItem) => (
              <div
                key={objectMetadataItem.id}
                {...stylex.props(styles.cardContainer)}
              >
                <SettingsCard
                  Icon={
                    <ObjectMetadataIcon
                      objectMetadataItem={objectMetadataItem}
                      size={theme.icon.size.lg}
                      stroke={theme.icon.stroke.sm}
                    />
                  }
                  title={objectMetadataItem.labelPlural}
                  onClick={() =>
                    handleSelectObjectMetadata(objectMetadataItem.id)
                  }
                />
              </div>
            ))}
          </div>
        </Section.Root>
      )}
      {customObjects.length > 0 && (
        <Section.Root>
          <Section.Header
            title={t`Custom`}
            description={t`All your custom objects`}
          />
          <div {...stylex.props(styles.container)}>
            {customObjects.map((objectMetadataItem) => (
              <div
                key={objectMetadataItem.id}
                {...stylex.props(styles.cardContainer)}
              >
                <SettingsCard
                  Icon={
                    <ObjectMetadataIcon
                      objectMetadataItem={objectMetadataItem}
                      size={theme.icon.size.lg}
                      stroke={theme.icon.stroke.sm}
                    />
                  }
                  title={objectMetadataItem.labelPlural}
                  onClick={() =>
                    handleSelectObjectMetadata(objectMetadataItem.id)
                  }
                />
              </div>
            ))}
          </div>
        </Section.Root>
      )}
    </div>
  );
};
