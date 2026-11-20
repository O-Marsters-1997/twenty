import { getLabelIdentifierFieldMetadataItem } from '@/object-metadata/utils/getLabelIdentifierFieldMetadataItem';
import { getLabelIdentifierFieldValue } from '@/object-metadata/utils/getLabelIdentifierFieldValue';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { RECORD_TABLE_ROW_HEIGHT } from '@/object-record/record-table/constants/RecordTableRowHeight';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { dataLoadingStatusByRealIndexComponentFamilySelector } from '@/object-record/record-table/virtualization/states/dataLoadingStatusByRealIndexComponentFamilySelector';
import { realIndexByVirtualIndexComponentFamilyState } from '@/object-record/record-table/virtualization/states/realIndexByVirtualIndexComponentFamilyState';
import { recordIdByRealIndexComponentFamilySelector } from '@/object-record/record-table/virtualization/states/recordIdByRealIndexComponentFamilySelector';

import { useAtomComponentFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilySelectorValue';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { color, fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  debugColumn: (width: number) => ({
    textWrapMode: 'nowrap',
    overflow: 'hidden',
    display: 'flex',
    maxWidth: width,
    minWidth: width,
    paddingLeft: spacing['--t-spacing-0_5'],
    paddingRight: spacing['--t-spacing-0_5'],
  }),
  debugRow: {
    borderColor: color['--t-color-blue8'],
    borderStyle: 'solid',
    borderWidth: '1px',
    overflow: 'hidden',
    backgroundColor: color['--t-color-gray3'],
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    position: 'absolute',
    zIndex: '20',
    left: '250px',
    maxHeight: spacing['--t-spacing-4'],
    paddingBottom: spacing['--t-spacing-0_5'],
    paddingLeft: spacing['--t-spacing-0_5'],
    paddingRight: spacing['--t-spacing-0_5'],
    paddingTop: spacing['--t-spacing-0_5'],
    top: '5px',
  },
});

type RecordTableRowVirtualizedDebugRowHelperProps = {
  virtualIndex: number;
};

export const RecordTableRowVirtualizedDebugRowHelper = ({
  virtualIndex,
}: RecordTableRowVirtualizedDebugRowHelperProps) => {
  const realIndexByVirtualIndex = useAtomComponentFamilyStateValue(
    realIndexByVirtualIndexComponentFamilyState,
    { virtualIndex },
  );

  const recordId = useAtomComponentFamilySelectorValue(
    recordIdByRealIndexComponentFamilySelector,
    realIndexByVirtualIndex,
  );

  const dataLoadingStatus = useAtomComponentFamilySelectorValue(
    dataLoadingStatusByRealIndexComponentFamilySelector,
    realIndexByVirtualIndex,
  );

  const pixelsFromTop =
    (realIndexByVirtualIndex ?? 0) * (RECORD_TABLE_ROW_HEIGHT + 1) +
    (RECORD_TABLE_ROW_HEIGHT + 1);

  const recordStore = useAtomFamilyStateValue(
    recordStoreFamilyState,
    recordId ?? '',
  );
  const { objectMetadataItem } = useRecordTableContextOrThrow();
  const labelIdentifierFieldMetadataItem =
    getLabelIdentifierFieldMetadataItem(objectMetadataItem);

  const labelIdentifier = isDefined(recordStore)
    ? getLabelIdentifierFieldValue(
        recordStore,
        labelIdentifierFieldMetadataItem,
      )
    : '-';

  const position = recordStore?.position;

  return (
    <div {...stylex.props(styles.debugRow)}>
      <div {...stylex.props(styles.debugColumn(70))}>
        virtual :{virtualIndex}
      </div>
      <div {...stylex.props(styles.debugColumn(70))}>
        real :{realIndexByVirtualIndex}
      </div>
      <div {...stylex.props(styles.debugColumn(100))}>pos :{position}</div>
      <div {...stylex.props(styles.debugColumn(80))}>
        px:
        {pixelsFromTop}
      </div>
      <div {...stylex.props(styles.debugColumn(150))}>
        <b>{labelIdentifier}</b>
      </div>
      <div {...stylex.props(styles.debugColumn(300))}>
        id:
        {recordId}
      </div>
      <div {...stylex.props(styles.debugColumn(100))}>
        status :{isDefined(dataLoadingStatus) ? dataLoadingStatus : 'undefined'}
      </div>
    </div>
  );
};
