import { isDefined } from 'twenty-shared/utils';

import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { useIcons } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

type ObjectFieldRowWithoutRelationProps = {
  field: FieldMetadataItem;
};

const styles = stylex.create({
  row: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    position: 'relative',
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: '0',
    width: '100%',
  },
  fieldName: {
    color: fontColor['--t-font-color-primary'],
  },
});

export const ObjectFieldRowWithoutRelation = ({
  field,
}: ObjectFieldRowWithoutRelationProps) => {
  const theme = useTheme();
  const { getIcon } = useIcons();

  const Icon = getIcon(field?.icon);

  return (
    <div {...stylex.props(styles.row)}>
      {isDefined(Icon) && <Icon size={theme.icon.size.md} />}
      <div {...stylex.props(styles.fieldName)}>{field.label}</div>
    </div>
  );
};
