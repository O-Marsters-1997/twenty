import { useGetStandardObjectIcon } from '@/object-metadata/hooks/useGetStandardObjectIcon';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { useRecordChipData } from '@/object-record/hooks/useRecordChipData';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';
import * as stylex from '@stylexjs/stylex';
import { Avatar } from 'twenty-ui/primitives/data-display';
import { useTheme } from 'twenty-ui/theme';
import {
  background,
  borderColor as borderColorVariables,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    display: 'flex',
    justifyContent: 'center',
    marginLeft: {
      default: `calc(${spacing['--t-spacing-1']} * -1)`,
      ':first-of-type': '0',
    },
  },
  withIconBackground: {
    backgroundColor: background['--t-background-primary'],
  },
  borderTransparent: {
    borderColor: 'transparent',
  },
  borderColor: (color: string) => ({
    borderColor: color,
  }),
});

export const SidePanelContextRecordChipAvatars = ({
  objectMetadataItem,
  record,
  borderColor = borderColorVariables['--t-border-color-medium'],
}: {
  objectMetadataItem: EnrichedObjectMetadataItem;
  record: ObjectRecord;
  borderColor?: string;
}) => {
  const theme = useTheme();
  const { recordChipData } = useRecordChipData({
    objectNameSingular: objectMetadataItem.nameSingular,
    record,
  });
  const { Icon, IconColor } = useGetStandardObjectIcon(
    objectMetadataItem.nameSingular,
  );
  const hasIconBackground = recordChipData.avatarShape !== 'circle';

  return (
    <div
      {...stylex.props(
        styles.root,
        hasIconBackground && styles.withIconBackground,
        hasIconBackground
          ? styles.borderColor(borderColor)
          : styles.borderTransparent,
      )}
    >
      {Icon ? (
        <Icon color={IconColor} size={theme.icon.size.sm} />
      ) : (
        <Avatar
          src={getAbsoluteImageUrl(recordChipData.avatarUrl)}
          colorSeed={recordChipData.recordId}
          name={recordChipData.name}
          shape={recordChipData.avatarShape}
          size="sm"
        />
      )}
    </div>
  );
};
