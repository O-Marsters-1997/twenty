import {
  ObjectMetadataIcon,
  type ObjectMetadataIconInput,
} from '@/object-metadata/components/ObjectMetadataIcon';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  objectIconContainer: {
    display: 'flex',
    flexShrink: '0',
    opacity: '0.64',
  },
});

type SettingsObjectNewFieldHeaderIconProps = {
  objectMetadataItem: ObjectMetadataIconInput;
};

export const SettingsObjectNewFieldHeaderIcon = ({
  objectMetadataItem,
}: SettingsObjectNewFieldHeaderIconProps) => (
  <div {...stylex.props(styles.objectIconContainer)}>
    <ObjectMetadataIcon objectMetadataItem={objectMetadataItem} />
  </div>
);
