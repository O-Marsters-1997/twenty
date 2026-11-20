import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { Icon123, useIcons } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

type EventFieldDiffLabelProps = {
  fieldMetadataItem: FieldMetadataItem;
};

const styles = stylex.create({
  updatedFieldContainer: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
  },
  updatedFieldIconContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    height: '14px',
    width: '14px',
  },
});

export const EventFieldDiffLabel = ({
  fieldMetadataItem,
}: EventFieldDiffLabelProps) => {
  const { getIcon } = useIcons();

  const IconComponent = fieldMetadataItem?.icon
    ? getIcon(fieldMetadataItem?.icon)
    : Icon123;

  return (
    <div {...stylex.props(styles.updatedFieldContainer)}>
      <div {...stylex.props(styles.updatedFieldIconContainer)}>
        <IconComponent />
      </div>
      {fieldMetadataItem.label}
    </div>
  );
};
