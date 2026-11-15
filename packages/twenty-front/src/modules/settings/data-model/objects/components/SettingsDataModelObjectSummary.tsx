import { t } from '@lingui/core/macro';

import { ObjectMetadataIcon } from '@/object-metadata/components/ObjectMetadataIcon';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { SettingsItemTypeTag } from '@/settings/components/SettingsItemTypeTag';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { IconBox } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { background, fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

export type SettingsDataModelObjectPreviewProps = {
  className?: string;
  objectMetadataItems: Pick<
    EnrichedObjectMetadataItem,
    | 'icon'
    | 'labelSingular'
    | 'labelPlural'
    | 'applicationId'
    | 'isRemote'
    | 'nameSingular'
    | 'color'
    | 'isSystem'
  >[];
  pluralizeLabel?: boolean;
};

const styles = stylex.create({
  objectPreview: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  objectName: {
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    maxWidth: '60%',
  },
  overflowingTextWithTooltip: {
    color: fontColor['--t-font-color-tertiary'],
  },
  number: {
    color: fontColor['--t-font-color-tertiary'],
    paddingRight: spacing['--t-spacing-2'],
  },
  iconContainer: {
    flexShrink: '0',
  },
  separator: {
    alignSelf: 'stretch',
    background: background['--t-background-quaternary'],
    height: '1px',
    marginBottom: spacing['--t-spacing-2'],
    marginTop: spacing['--t-spacing-2'],
  },
});

type SettingsDataModelObjectPreviewItemProps = {
  objectMetadataItem: Pick<
    EnrichedObjectMetadataItem,
    | 'icon'
    | 'labelSingular'
    | 'labelPlural'
    | 'applicationId'
    | 'isRemote'
    | 'nameSingular'
    | 'color'
    | 'isSystem'
  >;
  pluralizeLabel: boolean;
  index: number;
};

const SettingsDataModelObjectPreviewItem = ({
  objectMetadataItem,
  pluralizeLabel = true,
  index,
}: SettingsDataModelObjectPreviewItemProps) => {
  const theme = useTheme();

  return (
    <>
      {index > 0 && <div {...stylex.props(styles.separator)} />}
      <div
        key={`${objectMetadataItem.labelSingular}-${index}`}
        {...stylex.props(styles.objectPreview)}
      >
        <div {...stylex.props(styles.objectName)}>
          <div {...stylex.props(styles.iconContainer)}>
            <ObjectMetadataIcon
              objectMetadataItem={objectMetadataItem}
              size={theme.icon.size.sm}
              stroke={theme.icon.stroke.md}
            />
          </div>
          <OverflowingTextWithTooltip
            text={
              pluralizeLabel
                ? objectMetadataItem.labelPlural
                : objectMetadataItem.labelSingular
            }
          />
        </div>
        <SettingsItemTypeTag item={objectMetadataItem} />
      </div>
    </>
  );
};

const SettingsDataModelObjectPreviewOtherObjects = ({
  selected,
}: {
  selected: number;
}) => {
  const theme = useTheme();

  return (
    <>
      <div {...stylex.props(styles.separator)} />
      <div key={`other-objects`} {...stylex.props(styles.objectPreview)}>
        <div {...stylex.props(styles.objectName)}>
          <div {...stylex.props(styles.iconContainer)}>
            <IconBox
              size={theme.icon.size.sm}
              stroke={theme.icon.stroke.md}
              color={theme.font.color.tertiary}
            />
          </div>
          <div {...stylex.props(styles.overflowingTextWithTooltip)}>
            <OverflowingTextWithTooltip text={t`Other objects`} />
          </div>
        </div>
        <div {...stylex.props(styles.number)}>
          <OverflowingTextWithTooltip text={`${selected - 3}`} />
        </div>
      </div>
    </>
  );
};

export const SettingsDataModelObjectPreview = ({
  objectMetadataItems,
  pluralizeLabel = true,
}: SettingsDataModelObjectPreviewProps) => {
  let selected = 0;

  return (
    <>
      {objectMetadataItems.map((objectMetadataItem, index) => {
        selected++;
        return selected <= 3 ? (
          <SettingsDataModelObjectPreviewItem
            key={`${objectMetadataItem.labelSingular}-${index}`}
            objectMetadataItem={objectMetadataItem}
            pluralizeLabel={pluralizeLabel}
            index={index}
          />
        ) : (
          <></>
        );
      })}
      {selected > 3 && (
        <SettingsDataModelObjectPreviewOtherObjects selected={selected} />
      )}
    </>
  );
};
