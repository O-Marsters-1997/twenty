import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { isHiddenSystemField } from '@/object-metadata/utils/isHiddenSystemField';
import { useCombinedGetTotalCount } from '@/object-record/multiple-objects/hooks/useCombinedGetTotalCount';
import { StyledSettingsDataModelTableBodyContainer } from '@/settings/data-model/components/SettingsDataModelTableBodyContainer';
import { SettingsObjectMetadataItemTableRow } from '@/settings/data-model/object-details/components/SettingsObjectItemTableRow';
import {
  SETTINGS_OBJECT_TABLE_ROW_GRID_TEMPLATE_COLUMNS,
  SETTINGS_OBJECT_TABLE_ROW_MOBILE_MIN_WIDTH,
  StyledStickyFirstCell,
} from '@/settings/data-model/object-details/components/SettingsObjectItemTableRowStyledComponents';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { SortableTableHeader } from '@/ui/layout/table/components/SortableTableHeader';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { useSortedArray } from '@/ui/layout/table/hooks/useSortedArray';
import { isAdvancedModeEnabledState } from '@/ui/navigation/navigation-drawer/states/isAdvancedModeEnabledState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { SearchInput } from 'twenty-ui/components/input';
import { Dropdown } from 'twenty-ui/components/navigation';
import { SettingsRow } from 'twenty-ui/components/settings';
import { IconArchive, IconChevronRight, IconSettings } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import { GET_SETTINGS_OBJECT_TABLE_METADATA } from '~/pages/settings/data-model/constants/SettingsObjectTableMetadata';
import type { SettingsObjectTableItem } from '~/pages/settings/data-model/types/SettingsObjectTableItem';
import { normalizeSearchText } from 'twenty-ui/utilities';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
  scrollableContent: (mobileMinWidth: string) => ({
    minWidth: {
      default: null,
      [media.mobile]: mobileMinWidth,
    },
  }),
  iconChevronRightContainer: {
    color: fontColor['--t-font-color-tertiary'],
  },
  searchInputContainer: {
    paddingBottom: spacing['--t-spacing-2'],
  },
  scrollWrapper: {
    overflowX: { default: null, [media.mobile]: 'auto' },
    WebkitOverflowScrolling: { default: null, [media.mobile]: 'touch' },
  },
});

export const SettingsObjectTable = ({
  objectMetadataItems,
  withSearchBar = true,
}: {
  objectMetadataItems: EnrichedObjectMetadataItem[];
  withSearchBar?: boolean;
}) => {
  const theme = useTheme();
  const { t } = useLingui();

  const isAdvancedModeEnabled = useAtomStateValue(isAdvancedModeEnabledState);

  const [searchTerm, setSearchTerm] = useState('');
  const [showDeactivated, setShowDeactivated] = useState(true);
  const [showSystemObjects, setShowSystemObjects] = useState(true);
  const shouldShowSystemObjects = isAdvancedModeEnabled && showSystemObjects;

  const { totalCountByObjectMetadataItemNamePlural } =
    useCombinedGetTotalCount();

  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const installedApplications = currentWorkspace?.installedApplications;

  const allObjectSettingsArray = useMemo(
    () =>
      objectMetadataItems.map(
        (objectMetadataItem) =>
          ({
            objectMetadataItem,
            labelPlural: objectMetadataItem.labelPlural,
            objectTypeLabel:
              installedApplications?.find(
                (application) =>
                  application.id === objectMetadataItem.applicationId,
              )?.name ?? (objectMetadataItem.isRemote ? 'Remote' : ''),
            fieldsCount: objectMetadataItem.fields.filter(
              (field) => !isHiddenSystemField(field),
            ).length,
            totalObjectCount:
              totalCountByObjectMetadataItemNamePlural[
                objectMetadataItem.namePlural
              ] ?? 0,
          }) satisfies SettingsObjectTableItem,
      ),
    [
      objectMetadataItems,
      totalCountByObjectMetadataItemNamePlural,
      installedApplications,
    ],
  );

  const sortedObjectSettingsItems = useSortedArray(
    allObjectSettingsArray,
    GET_SETTINGS_OBJECT_TABLE_METADATA,
  );

  const filteredObjectSettingsItems = useMemo(
    () =>
      sortedObjectSettingsItems.filter((item) => {
        const searchNormalized = normalizeSearchText(searchTerm);
        const matchesSearch =
          normalizeSearchText(item.labelPlural).includes(searchNormalized) ||
          normalizeSearchText(item.objectTypeLabel).includes(searchNormalized);

        if (!matchesSearch) {
          return false;
        }

        const isActive = item.objectMetadataItem.isActive;
        if (!isActive && !showDeactivated) {
          return false;
        }

        const isSystem = item.objectMetadataItem.isSystem;
        if (isSystem && !shouldShowSystemObjects) {
          return false;
        }

        return true;
      }),
    [
      sortedObjectSettingsItems,
      searchTerm,
      showDeactivated,
      shouldShowSystemObjects,
    ],
  );

  return (
    <>
      {withSearchBar && (
        <div {...stylex.props(styles.searchInputContainer)}>
          <SearchInput
            placeholder={t`Search for an object...`}
            value={searchTerm}
            onValueChange={setSearchTerm}
            filterDropdown={(filterButton) => (
              <DropdownRoot
                dropdownId="settings-objects-filter-dropdown"
                type="panel"
              >
                <Dropdown.Trigger render={filterButton} />
                <DropdownContent
                  side="bottom"
                  align="end"
                  sideOffset={8}
                  alignOffset={0}
                >
                  <Dropdown.Section>
                    <SettingsRow
                      startElement={<IconArchive />}
                      onCheckedChange={() =>
                        setShowDeactivated(!showDeactivated)
                      }
                      checked={showDeactivated}
                    >{t`Deactivated`}</SettingsRow>
                    {isAdvancedModeEnabled && (
                      <SettingsRow
                        startElement={<IconSettings />}
                        onCheckedChange={() =>
                          setShowSystemObjects(!showSystemObjects)
                        }
                        checked={showSystemObjects}
                      >{t`System objects`}</SettingsRow>
                    )}
                  </Dropdown.Section>
                </DropdownContent>
              </DropdownRoot>
            )}
          />
        </div>
      )}

      <div {...stylex.props(styles.scrollWrapper)}>
        <div {...stylex.props(styles.scrollableContent(SETTINGS_OBJECT_TABLE_ROW_MOBILE_MIN_WIDTH))}>
          <Table>
            <TableRow
              gridTemplateColumns={
                SETTINGS_OBJECT_TABLE_ROW_GRID_TEMPLATE_COLUMNS
              }
            >
              {GET_SETTINGS_OBJECT_TABLE_METADATA.fields.map(
                (settingsObjectsTableMetadataField, index) =>
                  index === 0 ? (
                    <StyledStickyFirstCell
                      key={settingsObjectsTableMetadataField.fieldName}
                    >
                      <SortableTableHeader
                        fieldName={settingsObjectsTableMetadataField.fieldName}
                        label={t(settingsObjectsTableMetadataField.fieldLabel)}
                        tableId={GET_SETTINGS_OBJECT_TABLE_METADATA.tableId}
                        align={settingsObjectsTableMetadataField.align}
                        initialSort={
                          GET_SETTINGS_OBJECT_TABLE_METADATA.initialSort
                        }
                      />
                    </StyledStickyFirstCell>
                  ) : (
                    <SortableTableHeader
                      key={settingsObjectsTableMetadataField.fieldName}
                      fieldName={settingsObjectsTableMetadataField.fieldName}
                      label={t(settingsObjectsTableMetadataField.fieldLabel)}
                      tableId={GET_SETTINGS_OBJECT_TABLE_METADATA.tableId}
                      align={settingsObjectsTableMetadataField.align}
                      initialSort={
                        GET_SETTINGS_OBJECT_TABLE_METADATA.initialSort
                      }
                    />
                  ),
              )}
              <TableHeader></TableHeader>
            </TableRow>
            <StyledSettingsDataModelTableBodyContainer>
              <TableBody>
                {filteredObjectSettingsItems.map((objectSettingsItem) => (
                  <SettingsObjectMetadataItemTableRow
                    key={objectSettingsItem.objectMetadataItem.namePlural}
                    objectMetadataItem={objectSettingsItem.objectMetadataItem}
                    totalObjectCount={objectSettingsItem.totalObjectCount}
                    action={
                      <div {...stylex.props(styles.iconChevronRightContainer)}>
                        <IconChevronRight
                          size={theme.icon.size.md}
                          stroke={theme.icon.stroke.sm}
                        />
                      </div>
                    }
                    link={getSettingsPath(SettingsPath.ObjectDetail, {
                      objectNamePlural:
                        objectSettingsItem.objectMetadataItem.namePlural,
                    })}
                  />
                ))}
              </TableBody>
            </StyledSettingsDataModelTableBodyContainer>
          </Table>
        </div>
      </div>
    </>
  );
};
