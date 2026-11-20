import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { type RecordTitleCellContainerType } from '@/object-record/record-title-cell/types/RecordTitleCellContainerType';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useContext } from 'react';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import * as stylex from '@stylexjs/stylex';
import {
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  div: {
    background: 'inherit',
    borderStyle: 'none',
    overflow: 'hidden',
    alignItems: 'center',
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    justifyContent: 'center',
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    height: '24px',
    paddingBottom: spacing['--t-spacing-0'],
    paddingLeft: '5px',
    paddingRight: '5px',
    paddingTop: spacing['--t-spacing-0'],
  },
});

export const RecordTitleCellUuidFieldDisplay = ({
  containerType: _containerType,
}: {
  containerType: RecordTitleCellContainerType;
}) => {
  const { recordId, fieldDefinition } = useContext(FieldContext);

  const recordStore = useAtomFamilyStateValue(recordStoreFamilyState, recordId);

  const uuidValue = recordStore?.[fieldDefinition.metadata.fieldName] ?? '';

  return (
    <div {...stylex.props(styles.div)}>
      <OverflowingTextWithTooltip text={uuidValue} />
    </div>
  );
};
