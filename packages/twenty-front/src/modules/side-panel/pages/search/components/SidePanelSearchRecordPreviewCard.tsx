import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { allowRequestsToTwentyIconsState } from '@/client-config/states/allowRequestsToTwentyIcons';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { formatFieldMetadataItemAsColumnDefinition } from '@/object-metadata/utils/formatFieldMetadataItemAsColumnDefinition';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { FieldDisplay } from '@/object-record/record-field/ui/components/FieldDisplay';
import { RecordFieldComponentInstanceContext } from '@/object-record/record-field/ui/states/contexts/RecordFieldComponentInstanceContext';
import { recordStoreIdentifierFamilySelector } from '@/object-record/record-store/states/selectors/recordStoreIdentifierFamilySelector';
import { getRecordFieldInputInstanceId } from '@/object-record/utils/getRecordFieldInputId';
import { FieldWidgetShowMoreButton } from '@/page-layout/widgets/field/components/FieldWidgetShowMoreButton';
import { HeaderIdentifier } from '@/ui/layout/page/components/HeaderIdentifier';
import { SIDE_PANEL_SEARCH_RECORD_PREVIEW_MAX_COLLAPSED_FIELDS } from '@/side-panel/pages/search/constants/SidePanelSearchRecordPreviewMaxCollapsedFields';
import { SIDE_PANEL_SEARCH_RECORD_PREVIEW_WIDTH } from '@/side-panel/pages/search/constants/SidePanelSearchRecordPreviewWidth';
import { useSidePanelSearchRecordPreviewFields } from '@/side-panel/pages/search/hooks/useSidePanelSearchRecordPreviewFields';
import { useSidePanelSearchRecordPreviewRecord } from '@/side-panel/pages/search/hooks/useSidePanelSearchRecordPreviewRecord';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useState } from 'react';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import { useIcons } from 'twenty-ui/icon';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const SKELETON_HEIGHT = SKELETON_HEIGHT_SIZES.s;

const styles = stylex.create({
  card: (width: number) => ({
    backgroundColor: background['--t-background-primary'],
    borderRadius: borderRadius['--t-border-radius-md'],
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    width: `${width}px`,
  }),
  header: {
    alignItems: 'center',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-light'],
    boxSizing: 'border-box',
    display: 'flex',
    height: '40px',
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-2'],
  },
  titleText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fieldList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    maxHeight: 'calc(50dvh / var(--t-zoom, 1))',
    overflowY: 'auto',
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
  },
  fieldRow: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    height: '24px',
  },
  fieldLabel: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexShrink: '0',
    fontSize: fontSize['--t-font-size-md'],
    gap: spacing['--t-spacing-2'],
    width: '104px',
  },
  fieldLabelText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fieldIcon: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: '0',
    height: '16px',
    width: '16px',
  },
  showMoreContainer: {
    display: 'flex',
  },
  fieldValue: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    minWidth: '0',
    overflow: 'hidden',
  },
});

// Rows keep a fixed height so the card does not resize as values arrive
type SidePanelSearchRecordPreviewCardProps = {
  objectNameSingular: string;
  recordId: string;
  label: string;
};

export const SidePanelSearchRecordPreviewCard = ({
  objectNameSingular,
  recordId,
  label,
}: SidePanelSearchRecordPreviewCardProps) => {
  const { objectMetadataItem } = useObjectMetadataItem({ objectNameSingular });
  const { getIcon } = useIcons();

  const [areAllFieldsVisible, setAreAllFieldsVisible] = useState(false);

  const { visibleFields, hiddenFields } =
    useSidePanelSearchRecordPreviewFields(objectMetadataItem);

  const { isRecordLoaded } = useSidePanelSearchRecordPreviewRecord({
    objectNameSingular,
    recordId,
  });

  const allowRequestsToTwentyIcons = useAtomStateValue(
    allowRequestsToTwentyIconsState,
  );

  const recordIdentifier = useAtomFamilySelectorValue(
    recordStoreIdentifierFamilySelector,
    { recordId, allowRequestsToTwentyIcons },
  );

  const collapsedFields = visibleFields.slice(
    0,
    SIDE_PANEL_SEARCH_RECORD_PREVIEW_MAX_COLLAPSED_FIELDS,
  );

  const displayedFields = areAllFieldsVisible
    ? [...visibleFields, ...hiddenFields]
    : collapsedFields;

  const remainingFieldCount =
    visibleFields.length + hiddenFields.length - collapsedFields.length;

  const renderFieldRow = (
    fieldMetadataItem: FieldMetadataItem,
    index: number,
  ) => {
    const fieldDefinition = formatFieldMetadataItemAsColumnDefinition({
      field: fieldMetadataItem,
      position: index,
      objectMetadataItem,
      showLabel: true,
      labelWidth: 90,
    });

    const FieldIcon = getIcon(fieldMetadataItem.icon);

    const instanceId = getRecordFieldInputInstanceId({
      recordId,
      fieldName: fieldMetadataItem.name,
      prefix: 'side-panel-search-record-preview',
    });

    return (
      <div key={fieldMetadataItem.id} {...stylex.props(styles.fieldRow)}>
        <div {...stylex.props(styles.fieldLabel)}>
          <span {...stylex.props(styles.fieldIcon)}>
            <FieldIcon size={16} />
          </span>
          <span {...stylex.props(styles.fieldLabelText)}>{fieldMetadataItem.label}</span>
        </div>
        <div {...stylex.props(styles.fieldValue)}>
          {isRecordLoaded ? (
            <RecordFieldComponentInstanceContext.Provider
              value={{ instanceId }}
            >
              <FieldContext.Provider
                value={{
                  recordId,
                  isLabelIdentifier: false,
                  fieldDefinition,
                  isDisplayModeFixHeight: true,
                  isRecordFieldReadOnly: true,
                  disableChipClick: true,
                }}
              >
                <FieldDisplay />
              </FieldContext.Provider>
            </RecordFieldComponentInstanceContext.Provider>
          ) : (
            <SkeletonLine width={120} height={SKELETON_HEIGHT} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      {...stylex.props(styles.card(SIDE_PANEL_SEARCH_RECORD_PREVIEW_WIDTH))}
    >
      <div {...stylex.props(styles.header)}>
        <HeaderIdentifier
          avatar={{
            src: getAbsoluteImageUrl(recordIdentifier?.avatarUrl),
            name: recordIdentifier?.name ?? label,
            colorSeed: recordId,
            shape: recordIdentifier?.avatarShape ?? 'circle',
          }}
          title={
            <div {...stylex.props(styles.titleText)}>{recordIdentifier?.name ?? label}</div>
          }
        />
      </div>

      <div {...stylex.props(styles.fieldList)}>
        {displayedFields.map(renderFieldRow)}
        {!areAllFieldsVisible && remainingFieldCount > 0 && (
          // Keeping focus on the search input so arrow keys still move through results
          <div
            onMouseDown={(event) => event.preventDefault()} {...stylex.props(styles.showMoreContainer)}
          >
            <FieldWidgetShowMoreButton
              remainingCount={remainingFieldCount}
              onClick={() => setAreAllFieldsVisible(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
