import { useGetRelationMetadata } from '@/object-metadata/hooks/useGetRelationMetadata';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { SettingsItemTypeTag } from '@/settings/components/SettingsItemTypeTag';
import { SettingsNameCellSecondaryLabel } from '@/settings/components/SettingsNameCellSecondaryLabel';
import { SettingsTextLink } from '@/settings/components/SettingsTextLink';
import { RELATION_TYPES } from '@/settings/data-model/constants/RelationTypes';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { FieldMetadataType, SettingsPath } from 'twenty-shared/types';
import { getSettingsPath, isDefined } from 'twenty-shared/utils';
import { IconRelationManyToMany, useIcons } from 'twenty-ui/icon';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

type SettingsObjectRelationItemTableRowProps = {
  fieldMetadataItem: FieldMetadataItem;
  objectMetadataItem: EnrichedObjectMetadataItem;
};

export const OBJECT_RELATION_TABLE_ROW_GRID_TEMPLATE_COLUMNS =
  'minmax(0, 1fr) 148px 148px 36px';

const styles = stylex.create({
  nameContainer: {
    flex: '1',
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    minWidth: '0',
  },
  nameLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  relationType: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
  },
});

export const SettingsObjectRelationItemTableRow = ({
  fieldMetadataItem,
  objectMetadataItem,
}: SettingsObjectRelationItemTableRowProps) => {
  const theme = useTheme();
  const { t } = useLingui();
  const { getIcon } = useIcons();

  const Icon = getIcon(fieldMetadataItem.icon);

  const getRelationMetadata = useGetRelationMetadata();
  const { relationObjectMetadataItem, relationType } =
    useMemo(
      () => getRelationMetadata({ fieldMetadataItem }),
      [fieldMetadataItem, getRelationMetadata],
    ) ?? {};

  const isRelatedObjectLinkable = isDefined(
    relationObjectMetadataItem?.namePlural,
  );

  const isMorphRelation =
    fieldMetadataItem.type === FieldMetadataType.MORPH_RELATION;

  const morphRelationCount = fieldMetadataItem.morphRelations?.length ?? 0;
  const morphRelationTargetLabel =
    morphRelationCount === 1 ? t`1 Object` : t`${morphRelationCount} Objects`;
  const morphRelationFieldLabel = fieldMetadataItem.label;
  const displayRelationType = isMorphRelation
    ? fieldMetadataItem.morphRelations?.[0]?.type
    : relationType;

  const relationTypeLabel = (() => {
    if (isDefined(displayRelationType) === true) {
      return RELATION_TYPES[displayRelationType].label;
    }
    return '';
  })();

  const RelationIcon = displayRelationType
    ? RELATION_TYPES[displayRelationType].Icon
    : undefined;

  const NameIcon = isMorphRelation ? IconRelationManyToMany : Icon;

  const targetObjectLabel = isMorphRelation
    ? morphRelationTargetLabel
    : isRelatedObjectLinkable && isDefined(relationObjectMetadataItem)
      ? relationObjectMetadataItem.labelPlural
      : fieldMetadataItem.label;

  const fieldLabelSubtitle = isMorphRelation
    ? morphRelationFieldLabel
    : fieldMetadataItem.label;

  const shouldDisplayFieldLabelAsSubtitle =
    isMorphRelation || isDefined(relationObjectMetadataItem);

  return (
    <TableRow
      gridTemplateColumns={OBJECT_RELATION_TABLE_ROW_GRID_TEMPLATE_COLUMNS}
    >
      <TableCell
        color={themeCssVariables.font.color.primary}
        gap={themeCssVariables.spacing[2]}
      >
        {isDefined(NameIcon) && (
          <NameIcon
            style={{
              minWidth: theme.icon.size.md,
            }}
            size={theme.icon.size.md}
            stroke={theme.icon.stroke.sm}
          />
        )}
        <div {...stylex.props(styles.nameContainer)}>
          {isRelatedObjectLinkable ? (
            <SettingsTextLink
              to={getSettingsPath(SettingsPath.ObjectDetail, {
                objectNamePlural: relationObjectMetadataItem.namePlural,
              })}
              title={targetObjectLabel}
            >
              {targetObjectLabel}
            </SettingsTextLink>
          ) : (
            <div title={targetObjectLabel} {...stylex.props(styles.nameLabel)}>
              {targetObjectLabel}
            </div>
          )}
          {shouldDisplayFieldLabelAsSubtitle && (
            <SettingsNameCellSecondaryLabel title={fieldLabelSubtitle}>
              {fieldLabelSubtitle}
            </SettingsNameCellSecondaryLabel>
          )}
          {!fieldMetadataItem.isActive && (
            <SettingsNameCellSecondaryLabel>
              {t`Deactivated`}
            </SettingsNameCellSecondaryLabel>
          )}
        </div>
      </TableCell>

      <TableCell>
        <SettingsItemTypeTag
          item={{
            isRemote: objectMetadataItem.isRemote,
            applicationId: fieldMetadataItem.applicationId,
          }}
        />
      </TableCell>

      <TableCell>
        <div {...stylex.props(styles.relationType)}>
          {RelationIcon && (
            <RelationIcon
              size={theme.icon.size.sm}
              stroke={theme.icon.stroke.sm}
            />
          )}
          {relationTypeLabel}
        </div>
      </TableCell>

      <TableCell />
    </TableRow>
  );
};
