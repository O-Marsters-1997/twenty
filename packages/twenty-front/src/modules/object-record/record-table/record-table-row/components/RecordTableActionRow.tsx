import { styled } from '@linaria/react';

import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { RECORD_TABLE_COLUMN_MIN_WIDTH } from '@/object-record/record-table/constants/RecordTableColumnMinWidth';
import { useRecordTableFirstColumnWidthOverride } from '@/object-record/record-table/hooks/useRecordTableFirstColumnWidthOverride';
import { recordTableLayout } from '../../constants/recordTableLayout.stylex';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { RecordTableDragAndDropPlaceholderCell } from '@/object-record/record-table/record-table-cell/components/RecordTableDragAndDropPlaceholderCell';
import { RecordTableAddButtonPlaceholderCell } from '@/object-record/record-table/record-table-row/components/RecordTableAddButtonPlaceholderCell';
import { RecordTableGroupSectionLastDynamicFillingCell } from '@/object-record/record-table/record-table-row/components/RecordTableGroupSectionLastDynamicFillingCell';
import {
  filterOutByProperty,
  findByProperty,
  sumByProperty,
} from 'twenty-shared/utils';
import { type IconComponent } from 'twenty-ui/icon';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const StyledRecordTableDraggableTr = styled.div`
  align-items: center;

  background: ${themeCssVariables.background.primary};
  border: none;

  cursor: pointer;
  display: flex;
  flex-direction: row;

  @media (hover: hover) {
    &:hover {
      div:not(:first-of-type) {
        background-color: ${themeCssVariables.background.secondary};
      }
    }
  }

  div:not(:first-of-type) {
    border-bottom: 1px solid ${themeCssVariables.border.color.light};
  }

  width: 100%;
`;

const styles = stylex.create({
  fieldPlaceholderCell: (widthOfFields: number) => ({
    height: recordTableLayout.rowHeight,
    minWidth: widthOfFields,
    width: widthOfFields,
  }),
  iconContainer: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRightStyle: 'none',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    height: recordTableLayout.rowHeight,
    justifyContent: 'center',
    left: recordTableLayout.dragAndDropColumnWidth,
    position: 'sticky',
    width: recordTableLayout.checkboxColumnWidth,
  },
  actionTextContainer: {
    alignItems: 'center',
    borderRightStyle: 'none',
    display: 'flex',
    height: recordTableLayout.rowHeight,
    justifyContent: 'flex-start',
    left:
      recordTableLayout.dragAndDropColumnWidth +
      recordTableLayout.checkboxColumnWidth,
    position: 'sticky',
  },
  actionTextWidth: (width: number) => ({ width }),
  text: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-md'],
    marginLeft: spacing['--t-spacing-2'],
    position: 'absolute',
    textAlign: 'left',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  },
});

type RecordTableActionRowProps = {
  LeftIcon: IconComponent;
  text: string;
  onClick?: (event?: React.MouseEvent<HTMLDivElement>) => void;
};

export const RecordTableActionRow = ({
  LeftIcon,
  text,
  onClick,
}: RecordTableActionRowProps) => {
  const theme = useTheme();

  const { visibleRecordFields } = useRecordTableContextOrThrow();
  const { labelIdentifierFieldMetadataItem } = useRecordIndexContextOrThrow();

  const visibleRecordFieldsWithoutLabelIdentifier = visibleRecordFields.filter(
    filterOutByProperty(
      'fieldMetadataItemId',
      labelIdentifierFieldMetadataItem?.id,
    ),
  );

  const firstColumnWidthOverride = useRecordTableFirstColumnWidthOverride();

  const labelIdentifierRecordField = visibleRecordFields.find(
    findByProperty('fieldMetadataItemId', labelIdentifierFieldMetadataItem?.id),
  );

  const firstColumnWidth =
    firstColumnWidthOverride ??
    labelIdentifierRecordField?.size ??
    RECORD_TABLE_COLUMN_MIN_WIDTH;

  const sumOfWidthOfVisibleRecordFieldsAfterLabelIdentifierField =
    visibleRecordFieldsWithoutLabelIdentifier.reduce(sumByProperty('size'), 0);

  const sumOfBorderWidthForFields =
    visibleRecordFieldsWithoutLabelIdentifier.length;

  return (
    <StyledRecordTableDraggableTr onClick={onClick}>
      <RecordTableDragAndDropPlaceholderCell />
      <div {...stylex.props(styles.iconContainer)}>
        <LeftIcon
          stroke={theme.icon.stroke.sm}
          size={theme.icon.size.sm}
          color={theme.font.color.tertiary}
        />
      </div>
      <div
        {...stylex.props(
          styles.actionTextContainer,
          styles.actionTextWidth(firstColumnWidth),
        )}
      >
        <span {...stylex.props(styles.text)}>{text}</span>
      </div>
      <div
        {...stylex.props(
          styles.fieldPlaceholderCell(
            sumOfWidthOfVisibleRecordFieldsAfterLabelIdentifierField +
              sumOfBorderWidthForFields,
          ),
        )}
      />
      <RecordTableAddButtonPlaceholderCell />
      <RecordTableGroupSectionLastDynamicFillingCell />
    </StyledRecordTableDraggableTr>
  );
};
