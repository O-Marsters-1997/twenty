import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import * as stylex from '@stylexjs/stylex';
import { FieldDescriptionTooltip } from '@/object-record/record-field/ui/components/FieldDescriptionTooltip';

import { fieldMetadataItemByIdSelector } from '@/object-metadata/states/fieldMetadataItemByIdSelector';
import { type RecordField } from '@/object-record/record-field/types/RecordField';
import { RECORD_TABLE_CELL_CONTENT_CLASS_NAME } from '@/object-record/record-table/constants/RecordTableCellContentClassName';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { useIcons } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import { fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

type RecordTableColumnHeadProps = {
  recordField: RecordField;
};

export const RecordTableColumnHead = ({
  recordField,
}: RecordTableColumnHeadProps) => {
  const theme = useTheme();

  const correspondingFieldMetadataItem = useAtomFamilySelectorValue(
    fieldMetadataItemByIdSelector,
    { fieldMetadataItemId: recordField.fieldMetadataItemId },
  );

  const { getIcon } = useIcons();
  const Icon = getIcon(
    correspondingFieldMetadataItem.foundFieldMetadataItem?.icon,
  );
  const fieldMetadataItem =
    correspondingFieldMetadataItem.foundFieldMetadataItem;

  return (
    <div
      {...mergeClassName(
        stylex.props(styles.title),
        RECORD_TABLE_CELL_CONTENT_CLASS_NAME,
      )}
    >
      <div {...stylex.props(styles.icon)}>
        <Icon size={theme.icon.size.md} />
      </div>
      <FieldDescriptionTooltip
        label={fieldMetadataItem?.label}
        description={fieldMetadataItem?.description}
      />
    </div>
  );
};

const styles = stylex.create({
  title: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    fontWeight: fontWeight['--t-font-weight-medium'],
    height: spacing['--t-spacing-8'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
  },
  icon: {
    display: 'flex',
    flexShrink: 0,
  },
});
