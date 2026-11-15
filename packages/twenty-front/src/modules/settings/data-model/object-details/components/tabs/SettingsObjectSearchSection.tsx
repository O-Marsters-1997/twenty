import { formatShortcut } from 'twenty-ui/primitives/typography';
import { useUpdateOneFieldMetadataItem } from '@/object-metadata/hooks/useUpdateOneFieldMetadataItem';
import { useUpdateOneObjectMetadataItem } from '@/object-metadata/hooks/useUpdateOneObjectMetadataItem';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { SEARCH_VECTOR_FIELD_NAME } from '@/object-record/constants/SearchVectorFieldName';
import { SettingsOptionCardContentSwitch } from '@/settings/components/SettingsOptions/SettingsOptionCardContentSwitch';
import { canBeSearchable } from '@/settings/data-model/fields/forms/utils/canBeSearchable';
import { SettingsObjectFieldDataType } from '@/settings/data-model/object-details/components/SettingsObjectFieldDataType';
import { type SettingsFieldType } from '@/settings/data-model/types/SettingsFieldType';
import { SelectOptionIcon } from '@/ui/input/components/SelectOptionIcon';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { Table } from '@/ui/layout/table/components/Table';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import { useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { useToast } from 'twenty-ui/components/feedback';
import { LightIconButton } from 'twenty-ui/components/input';
import { Dropdown } from 'twenty-ui/components/navigation';
import {
  IconEye,
  IconPlus,
  IconSearch,
  IconTrash,
  useIcons,
} from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { Card } from 'twenty-ui/primitives/surfaces';
import { useTheme } from 'twenty-ui/theme';
import { FeatureFlagKey } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type SettingsObjectSearchSectionProps = {
  objectMetadataItem: EnrichedObjectMetadataItem;
  isReadOnly: boolean;
};

type SearchFieldEntry = {
  id: string;
  label: string;
  icon?: string | null;
  fieldType: string;
  isLabelIdentifier: boolean;
};

const styles = stylex.create({
  searchSectionContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-4'],
  },
  nameLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
});

const SEARCH_FIELDS_GRID_TEMPLATE_COLUMNS = 'minmax(0, 1fr) 148px 40px';

const ADD_SEARCH_FIELD_DROPDOWN_ID = 'settings-object-add-search-field';

const extractSearchFields = (
  objectMetadataItem: EnrichedObjectMetadataItem,
): SearchFieldEntry[] => {
  const positionByFieldMetadataId = new Map(
    objectMetadataItem.searchFieldMetadatas.map((searchFieldMetadata) => [
      searchFieldMetadata.fieldMetadataId,
      searchFieldMetadata.position,
    ]),
  );

  return objectMetadataItem.fields
    .filter(
      (field) =>
        field.isSearchable === true && field.name !== SEARCH_VECTOR_FIELD_NAME,
    )
    .sort(
      (fieldA, fieldB) =>
        (positionByFieldMetadataId.get(fieldA.id) ?? Number.MAX_SAFE_INTEGER) -
        (positionByFieldMetadataId.get(fieldB.id) ?? Number.MAX_SAFE_INTEGER),
    )
    .map(
      (field) =>
        ({
          id: field.id,
          label: field.label,
          icon: field.icon,
          fieldType: field.type,
          isLabelIdentifier:
            objectMetadataItem.labelIdentifierFieldMetadataId === field.id,
        }) satisfies SearchFieldEntry,
    );
};

export const SettingsObjectSearchSection = ({
  objectMetadataItem,
  isReadOnly,
}: SettingsObjectSearchSectionProps) => {
  const { t } = useLingui();
  const { getIcon } = useIcons();
  const theme = useTheme();
  const { updateOneObjectMetadataItem } = useUpdateOneObjectMetadataItem();
  const { updateOneFieldMetadataItem } = useUpdateOneFieldMetadataItem();
  const { enqueueToast } = useToast();

  const isConfigurableSearchFieldsEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_CONFIGURABLE_SEARCH_FIELDS_ENABLED,
  );

  const [isSearchable, setIsSearchable] = useState(
    objectMetadataItem.isSearchable,
  );
  const [searchTerm, setSearchTerm] = useState('');

  const searchFields = useMemo(
    () => extractSearchFields(objectMetadataItem),
    [objectMetadataItem],
  );

  const isEditable =
    isConfigurableSearchFieldsEnabled &&
    !isReadOnly &&
    objectMetadataItem.isSearchable;

  const searchFieldIds = useMemo(
    () => new Set(searchFields.map((entry) => entry.id)),
    [searchFields],
  );

  const addableFields = useMemo(
    () =>
      objectMetadataItem.fields.filter(
        (field) =>
          field.isActive === true &&
          !searchFieldIds.has(field.id) &&
          canBeSearchable(field),
      ),
    [objectMetadataItem.fields, searchFieldIds],
  );

  const filteredSearchFields = searchTerm
    ? searchFields.filter((entry) =>
        entry.label.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : searchFields;

  const handleToggleSearchable = async (value: boolean) => {
    setIsSearchable(value);
    await updateOneObjectMetadataItem({
      idToUpdate: objectMetadataItem.id,
      updatePayload: { isSearchable: value },
    });
  };

  const handleSetFieldSearchable = async (
    fieldMetadataId: string,
    value: boolean,
  ) => {
    const result = await updateOneFieldMetadataItem({
      objectMetadataId: objectMetadataItem.id,
      fieldMetadataIdToUpdate: fieldMetadataId,
      updatePayload: { isSearchable: value },
    });

    if (result.status === 'successful') {
      enqueueToast({
        status: 'success',
        children: value
          ? t`Field added to search`
          : t`Field removed from search`,
      });
    }
  };

  return (
    <div {...stylex.props(styles.searchSectionContent)}>
      {!isReadOnly && (
        <Card.Root rounded>
          <SettingsOptionCardContentSwitch
            Icon={IconEye}
            title={t`Global search`}
            description={t`Show this object's records in the command menu (${formatShortcut({ shortcut: ['Mod', 'K'] })}).`}
            checked={isSearchable}
            advancedMode
            onChange={handleToggleSearchable}
          />
        </Card.Root>
      )}
      {searchFields.length > 0 && (
        <>
          <SettingsTextInput
            instanceId="search-fields-filter"
            LeftIcon={IconSearch}
            placeholder={t`Search fields...`}
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <Table>
            <TableRow gridTemplateColumns={SEARCH_FIELDS_GRID_TEMPLATE_COLUMNS}>
              <TableHeader>{t`Name`}</TableHeader>
              <TableHeader>{t`Data type`}</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
            {filteredSearchFields.map((entry) => {
              const FieldIcon = getIcon(entry.icon);
              return (
                <TableRow
                  key={entry.id}
                  gridTemplateColumns={SEARCH_FIELDS_GRID_TEMPLATE_COLUMNS}
                >
                  <TableCell
                    color={theme.font.color.primary}
                    gap={theme.spacing[2]}
                  >
                    <FieldIcon
                      size={theme.icon.size.md}
                      stroke={theme.icon.stroke.sm}
                    />
                    <div {...stylex.props(styles.nameLabel)}>{entry.label}</div>
                  </TableCell>
                  <TableCell>
                    <SettingsObjectFieldDataType
                      value={entry.fieldType as SettingsFieldType}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {isEditable && !entry.isLabelIdentifier && (
                      <LightIconButton
                        emphasis="subtle"
                        onClick={() =>
                          handleSetFieldSearchable(entry.id, false)
                        }
                        aria-label={t`Remove searchable field`}
                      >
                        <IconTrash />
                      </LightIconButton>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>
        </>
      )}
      {isEditable && (
        <div {...stylex.props(styles.buttonContainer)}>
          <DropdownRoot dropdownId={ADD_SEARCH_FIELD_DROPDOWN_ID} type="menu">
            <Dropdown.Trigger
              disabled={addableFields.length === 0}
              render={
                <Button
                  startIcon={<IconPlus />}
                  size="sm"
                  disabled={addableFields.length === 0}
                  variant="outline"
                >{t`Add field`}</Button>
              }
            />
            <DropdownContent align="end" sideOffset={8}>
              <Dropdown.Section scrollable>
                {addableFields.map((field) => {
                  const FieldIcon = getIcon(field.icon);

                  return (
                    <Dropdown.ActionItem
                      key={field.id}
                      startIcon={<SelectOptionIcon Icon={FieldIcon} />}
                      onClick={() => handleSetFieldSearchable(field.id, true)}
                    >
                      {field.label}
                    </Dropdown.ActionItem>
                  );
                })}
              </Dropdown.Section>
            </DropdownContent>
          </DropdownRoot>
        </div>
      )}
    </div>
  );
};
