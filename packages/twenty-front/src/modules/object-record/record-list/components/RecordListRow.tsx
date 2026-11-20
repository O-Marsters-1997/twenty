import { getLinkToShowPage } from '@/object-metadata/utils/getLinkToShowPage';
import { RecordChip } from '@/object-record/components/RecordChip';
import { visibleRecordFieldsComponentSelector } from '@/object-record/record-field/states/visibleRecordFieldsComponentSelector';
import { CoreRecordReferenceFieldsContext } from '@/object-record/record-field/ui/contexts/CoreRecordReferenceFieldsContext';
import { getFieldValueSourceDefinition } from '@/object-record/record-field/ui/utils/getFieldValueSourceDefinition';
import { isFieldValueEmpty } from '@/object-record/record-field/ui/utils/isFieldValueEmpty';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { useOpenRecordFromIndexView } from '@/object-record/record-index/hooks/useOpenRecordFromIndexView';
import { RecordListRowField } from '@/object-record/record-list/components/RecordListRowField';
import { RECORD_LIST_ROW_LABEL_IDENTIFIER_WIDTH } from '@/object-record/record-list/constants/RecordListRowLabelIdentifierWidth';
import { RECORD_LIST_ROW_OVERFLOW_CHIP_SLOT_WIDTH } from '@/object-record/record-list/constants/RecordListRowOverflowChipSlotWidth';
import { recordListRowWidthComponentState } from '@/object-record/record-list/states/recordListRowWidthComponentState';
import { computeRecordListDisplayedFields } from '@/object-record/record-list/utils/computeRecordListDisplayedFields';
import { useOpenRecordContextMenu } from '@/object-record/record-selection/hooks/useOpenRecordContextMenu';
import { useResetRecordSelection } from '@/object-record/record-selection/hooks/useResetRecordSelection';
import { useToggleRecordSelection } from '@/object-record/record-selection/hooks/useToggleRecordSelection';
import { isRecordSelectedComponentFamilyState } from '@/object-record/record-selection/states/isRecordSelectedComponentFamilyState';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { LinkChip } from '@/ui/navigation/link/components/LinkChip/LinkChip';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { recordListRowMarker } from './RecordListRow.stylex';
import { plural, t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { type MouseEvent, type Ref, useContext } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Chip } from 'twenty-ui/primitives/data-display';
import * as stylex from '@stylexjs/stylex';
import {
  accent,
  backgroundTransparent,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const isRowHovered = stylex.when.ancestor(':hover', recordListRowMarker);
const isRowActive = stylex.when.ancestor(':active', recordListRowMarker);
const isRowSelected = stylex.when.ancestor(
  ':is([data-selected="true"])',
  recordListRowMarker,
);

const styles = stylex.create({
  rowContainer: {
    cursor: 'pointer',
    paddingBottom: '2px',
  },
  row: {
    gap: spacing['--t-spacing-3'],
    alignItems: 'center',
    backgroundColor: {
      default: null,
      [isRowHovered]:
        backgroundTransparent['--t-background-transparent-lighter'],
      [isRowActive]: accent['--t-accent-quaternary'],
      [isRowSelected]: accent['--t-accent-quaternary'],
    },
    display: 'flex',
    justifyContent: 'space-between',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    height: '32px',
    paddingBottom: '0',
    paddingLeft: '6px',
    paddingRight: '6px',
    paddingTop: '0',
  },
  fieldsContainer: {
    gap: spacing['--t-spacing-3'],
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    flexShrink: '0',
    justifyContent: 'flex-end',
  },
  recordChipContainer: {
    overflow: 'hidden',
    display: 'flex',
    minWidth: 0,
  },
  recordChipFlexBasis: (basis: number) => ({
    flex: `1 1 ${basis}px`,
  }),
  overflowChipContainer: {
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'flex-end',
  },
  overflowChipWidth: (width: number) => ({
    width: `${width}px`,
  }),
});

type RecordListRowProps = {
  recordId: string;
  rowRef?: Ref<HTMLDivElement>;
};

export const RecordListRow = ({ recordId, rowRef }: RecordListRowProps) => {
  const { objectNameSingular } = useRecordIndexContextOrThrow();
  const {
    labelIdentifierFieldMetadataItem,
    fieldDefinitionByFieldMetadataItemId,
  } = useRecordIndexContextOrThrow();

  const recordStore = useAtomFamilyStateValue(recordStoreFamilyState, recordId);

  const coreRecordReferenceFields = useContext(
    CoreRecordReferenceFieldsContext,
  );

  const visibleRecordFields = useAtomComponentSelectorValue(
    visibleRecordFieldsComponentSelector,
  );

  const recordListRowWidth = useAtomComponentStateValue(
    recordListRowWidthComponentState,
  );

  const { openRecordFromIndexView } = useOpenRecordFromIndexView();

  const isRecordSelected = useAtomComponentFamilyStateValue(
    isRecordSelectedComponentFamilyState,
    recordId,
  );
  const { toggleRecordSelection } = useToggleRecordSelection();
  const { resetRecordSelection } = useResetRecordSelection();
  const { openRecordContextMenu } = useOpenRecordContextMenu();

  if (!isDefined(recordStore)) {
    return null;
  }

  const visibleRecordFieldsExceptLabelIdentifier = visibleRecordFields.filter(
    (recordField) =>
      recordField.fieldMetadataItemId !== labelIdentifierFieldMetadataItem?.id,
  );

  const nonEmptyRecordFields = visibleRecordFieldsExceptLabelIdentifier.flatMap(
    (recordField) => {
      const fieldDefinition =
        fieldDefinitionByFieldMetadataItemId[recordField.fieldMetadataItemId];

      if (!isDefined(fieldDefinition)) {
        return [];
      }

      const fieldValueSourceDefinition = getFieldValueSourceDefinition({
        fieldDefinition,
        coreRecordReferenceFields,
      });

      if (
        isFieldValueEmpty({
          fieldDefinition: fieldValueSourceDefinition,
          fieldValue:
            recordStore[fieldValueSourceDefinition.metadata.fieldName],
        })
      ) {
        return [];
      }

      return [{ recordField, fieldDefinition }];
    },
  );

  const displayedFieldsLayout = computeRecordListDisplayedFields({
    rowWidth: recordListRowWidth,
    populatedFieldCount: nonEmptyRecordFields.length,
  });

  const displayedRecordFields = nonEmptyRecordFields.slice(
    0,
    displayedFieldsLayout.displayedFieldCount,
  );

  const hiddenFieldCount =
    nonEmptyRecordFields.length - displayedRecordFields.length;

  const openRecord = () => {
    resetRecordSelection();
    openRecordFromIndexView({ recordId });
  };

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    toggleRecordSelection({ recordId, shouldSelectRange: event.shiftKey });
  };

  const linkToRecord = getLinkToShowPage(objectNameSingular, recordStore);

  const overflowChipLabel = `+${hiddenFieldCount}`;
  const overflowChipTooltipLabel = plural(hiddenFieldCount, {
    one: '# more populated field available',
    other: '# more populated fields available',
  });

  return (
    <div
      ref={rowRef}
      role="button"
      tabIndex={0}
      aria-label={t`Open record`}
      data-selected={isRecordSelected}
      onClickCapture={handleClickCapture}
      onMouseDown={(event) => {
        // Shift+click selects a range of records, not the text in between
        if (event.shiftKey) {
          event.preventDefault();
        }
      }}
      onClick={openRecord}
      onContextMenu={(event) => openRecordContextMenu({ event, recordId })}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openRecord();
        }
      }}
      {...stylex.props(recordListRowMarker, styles.rowContainer)}
    >
      <div {...stylex.props(styles.row)}>
        <div
          {...stylex.props(
            styles.recordChipContainer,
            styles.recordChipFlexBasis(RECORD_LIST_ROW_LABEL_IDENTIFIER_WIDTH),
          )}
        >
          <RecordChip
            objectNameSingular={objectNameSingular}
            record={recordStore}
            to={linkToRecord}
            variant="ghost"
            isBold
            onClick={openRecord}
            triggerEvent={'CLICK'}
          />
        </div>
        <div {...stylex.props(styles.fieldsContainer)}>
          {displayedRecordFields.map(({ recordField, fieldDefinition }) => (
            <RecordListRowField
              key={recordField.fieldMetadataItemId}
              recordId={recordId}
              recordField={recordField}
              fieldDefinition={fieldDefinition}
              maxWidth={displayedFieldsLayout.displayedFieldMaxWidth}
            />
          ))}
          {hiddenFieldCount > 0 && (
            <div
              {...stylex.props(
                styles.overflowChipContainer,
                styles.overflowChipWidth(
                  RECORD_LIST_ROW_OVERFLOW_CHIP_SLOT_WIDTH,
                ),
              )}
            >
              {isNonEmptyString(linkToRecord) ? (
                <LinkChip
                  to={linkToRecord}
                  onClick={openRecord}
                  triggerEvent="CLICK"
                  tooltipContent={overflowChipTooltipLabel}
                  tooltipPlace={'top'}
                  alwaysShowTooltip
                  variant="soft"
                >
                  {overflowChipLabel}
                </LinkChip>
              ) : (
                <Chip
                  tooltipContent={overflowChipTooltipLabel}
                  tooltipPlace={'top'}
                  alwaysShowTooltip
                  variant="soft"
                >
                  {overflowChipLabel}
                </Chip>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
