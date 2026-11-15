import { allowRequestsToTwentyIconsState } from '@/client-config/states/allowRequestsToTwentyIcons';
import { useNumberFormat } from '@/localization/hooks/useNumberFormat';
import { ObjectMetadataIcon } from '@/object-metadata/components/ObjectMetadataIcon';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { useIsRecordFieldReadOnly } from '@/object-record/read-only/hooks/useIsRecordFieldReadOnly';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { useRecordShowContainerActions } from '@/object-record/record-show/hooks/useRecordShowContainerActions';
import { useRecordShowPageGroupByBreadcrumbInfo } from '@/object-record/record-show/hooks/useRecordShowPageGroupByBreadcrumbInfo';
import { useRecordShowPagePagination } from '@/object-record/record-show/hooks/useRecordShowPagePagination';
import { getRecordShowPageBreadcrumbPaginationLabel } from '@/object-record/record-show/utils/getRecordShowPageBreadcrumbPaginationLabel';
import { recordStoreIdentifierFamilySelector } from '@/object-record/record-store/states/selectors/recordStoreIdentifierFamilySelector';
import { RecordTitleCell } from '@/object-record/record-title-cell/components/RecordTitleCell';
import { RecordTitleCellContainerType } from '@/object-record/record-title-cell/types/RecordTitleCellContainerType';
import { useIsMobile } from 'twenty-ui/utilities';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useState } from 'react';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { Avatar } from 'twenty-ui/primitives/data-display';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  editableTitleContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    overflowX: 'hidden',
    width: '100%',
  },
  editableTitlePrefix: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'row',
    gap: spacing['--t-spacing-1'],
  },
  breadcrumbPrefixObjectIcon: {
    display: 'flex',
    flexShrink: '0',
    opacity: '0.64',
  },
  avatarContainer: {
    alignItems: 'center',
    background: backgroundTransparent['--t-background-transparent-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    display: 'flex',
    flexShrink: '0',
    justifyContent: 'center',
    marginRight: spacing['--t-spacing-0_5'],
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
  },
  paginationInformation: {
    color: fontColor['--t-font-color-tertiary'],
  },
  title: {
    fontSize: 'inherit',
    fontWeight: 'inherit',
    maxWidth: '100%',
    overflow: 'hidden',
    width: 'fit-content',
  },
  titleEmphasized: {
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
});

export const ObjectRecordShowPageBreadcrumb = ({
  objectNameSingular,
  objectRecordId,
  objectLabel,
  labelIdentifierFieldMetadataItem,
}: {
  objectNameSingular: string;
  objectRecordId: string;
  objectLabel: string;
  labelIdentifierFieldMetadataItem?: FieldMetadataItem;
}) => {
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const isMobile = useIsMobile();

  const { loading } = useFindOneRecord({
    objectNameSingular,
    objectRecordId,
    recordGqlFields: {
      [labelIdentifierFieldMetadataItem?.name ?? 'name']: true,
    },
  });

  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular,
  });

  const allowRequestsToTwentyIcons = useAtomStateValue(
    allowRequestsToTwentyIconsState,
  );

  const recordIdentifier = useAtomFamilySelectorValue(
    recordStoreIdentifierFamilySelector,
    {
      recordId: objectRecordId,
      allowRequestsToTwentyIcons,
    },
  );

  const { useUpdateOneObjectRecordMutation } = useRecordShowContainerActions({
    objectNameSingular,
  });

  const isLabelIdentifierReadOnly = useIsRecordFieldReadOnly({
    recordId: objectRecordId,
    objectMetadataId: objectMetadataItem.id,
    fieldMetadataId: labelIdentifierFieldMetadataItem?.id ?? '',
  });

  const { navigateToIndexView, rankInView, totalCount } =
    useRecordShowPagePagination(objectNameSingular, objectRecordId);

  const { viewName, groupValueLabel, isGroupByActive, isGroupValueLoading } =
    useRecordShowPageGroupByBreadcrumbInfo({
      objectNameSingular,
      objectRecordId,
    });

  const { formatNumber } = useNumberFormat();

  const paginationInformation = getRecordShowPageBreadcrumbPaginationLabel({
    rank: formatNumber(rankInView + 1),
    total: formatNumber(totalCount),
    isGroupByActive,
    viewName,
    isGroupValueLoading,
    groupValueLabel,
  });

  if (!loading && isInitialLoad) {
    setIsInitialLoad(false);
  }

  if (isInitialLoad && loading) {
    return null;
  }

  return (
    <div
      data-testid="top-bar-title"
      {...stylex.props(styles.editableTitleContainer)}
    >
      {isMobile ? (
        isDefined(recordIdentifier) && (
          <div {...stylex.props(styles.avatarContainer)}>
            <Avatar
              src={getAbsoluteImageUrl(recordIdentifier.avatarUrl)}
              name={recordIdentifier.name}
              colorSeed={objectRecordId}
              size="md"
              shape={recordIdentifier.avatarShape ?? undefined}
            />
          </div>
        )
      ) : (
        <div
          onClick={() => {
            navigateToIndexView();
          }}
          {...stylex.props(styles.editableTitlePrefix)}
        >
          <div {...stylex.props(styles.breadcrumbPrefixObjectIcon)}>
            <ObjectMetadataIcon objectMetadataItem={objectMetadataItem} />
          </div>
          {objectLabel}
          <span>{' / '}</span>
        </div>
      )}
      <div {...stylex.props(styles.title, isMobile && styles.titleEmphasized)}>
        <FieldContext.Provider
          value={{
            recordId: objectRecordId,
            isLabelIdentifier: false,
            fieldDefinition: {
              type:
                labelIdentifierFieldMetadataItem?.type ||
                FieldMetadataType.TEXT,
              iconName: '',
              fieldMetadataId: labelIdentifierFieldMetadataItem?.id ?? '',
              label: labelIdentifierFieldMetadataItem?.label || '',
              metadata: {
                fieldName: labelIdentifierFieldMetadataItem?.name || '',
                objectMetadataNameSingular: objectNameSingular,
              },
              defaultValue: labelIdentifierFieldMetadataItem?.defaultValue,
            },
            useUpdateRecord: useUpdateOneObjectRecordMutation,
            isCentered: false,
            isDisplayModeFixHeight: true,
            isRecordFieldReadOnly: isLabelIdentifierReadOnly,
          }}
        >
          <RecordTitleCell
            sizeVariant={isMobile ? 'sm' : 'xs'}
            containerType={RecordTitleCellContainerType.PageHeader}
          />
        </FieldContext.Provider>
      </div>
      {!isMobile && (
        <span {...stylex.props(styles.paginationInformation)}>
          {paginationInformation}
        </span>
      )}
    </div>
  );
};
