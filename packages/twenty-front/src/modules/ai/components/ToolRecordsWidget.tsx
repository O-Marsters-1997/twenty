import { getChipLabel } from '@/ui/field/display/utils/getChipLabel';
import { useLingui } from '@lingui/react/macro';

import { LinkChip } from '@/ui/navigation/link/components/LinkChip/LinkChip';
import { type ToolRecordReference } from 'twenty-shared/ai';
import { AppPath } from 'twenty-shared/types';
import { getAppPath, isDefined } from 'twenty-shared/utils';
import { useIcons } from 'twenty-ui/icon';

import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import * as stylex from '@stylexjs/stylex';
import {
  font,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const MAX_VISIBLE_RECORDS = 12;

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: '0',
    paddingRight: '0',
    paddingTop: spacing['--t-spacing-2'],
  },
  header: {
    color: fontColor['--t-font-color-tertiary'],
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-sm'],
  },
  chips: {
    gap: spacing['--t-spacing-1'],
    display: 'flex',
    flexWrap: 'wrap',
  },
  overflow: {
    alignSelf: 'center',
    color: fontColor['--t-font-color-tertiary'],
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-sm'],
  },
});

type ToolRecordsWidgetProps = {
  message: string;
  recordReferences: ToolRecordReference[];
};

export const ToolRecordsWidget = ({
  message,
  recordReferences,
}: ToolRecordsWidgetProps) => {
  const { t } = useLingui();
  const { objectMetadataItems } = useObjectMetadataItems();
  const { getIcon } = useIcons();

  const visibleReferences = recordReferences.slice(0, MAX_VISIBLE_RECORDS);
  const hiddenCount = recordReferences.length - visibleReferences.length;

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.header)}>{message}</div>
      <div {...stylex.props(styles.chips)}>
        {visibleReferences.map((recordReference) => {
          const objectMetadataItem = objectMetadataItems.find(
            (item) => item.nameSingular === recordReference.objectNameSingular,
          );
          const Icon = getIcon(objectMetadataItem?.icon);

          return (
            <LinkChip
              key={recordReference.recordId}
              to={getAppPath(AppPath.RecordShowPage, {
                objectNameSingular: recordReference.objectNameSingular,
                objectRecordId: recordReference.recordId,
              })}
              startElement={isDefined(Icon) ? <Icon size={14} /> : undefined}
            >
              {getChipLabel(recordReference.displayName).content}
            </LinkChip>
          );
        })}
        {hiddenCount > 0 && (
          <span
            {...stylex.props(styles.overflow)}
          >{t`and ${hiddenCount} more`}</span>
        )}
      </div>
    </div>
  );
};
