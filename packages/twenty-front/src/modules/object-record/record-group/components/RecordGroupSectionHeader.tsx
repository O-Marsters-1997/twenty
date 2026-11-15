import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { RecordGroupChip } from '@/object-record/record-group/components/RecordGroupChip';
import { type RecordGroupDefinition } from '@/object-record/record-group/types/RecordGroupDefinition';
import { t } from '@lingui/core/macro';
import { IconChevronDown } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  sectionToggle: {
    alignItems: 'center',
    background: 'transparent',
    borderStyle: 'none',
    cursor: 'pointer',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    height: '100%',
    minWidth: '0',
    overflow: 'hidden',
    paddingTop: '0',
    paddingRight: '0',
    paddingBottom: '0',
    paddingLeft: '0',
  },
  chevronContainer: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    transform: 'rotate(0deg)',
  },
  chevronCollapsed: {
    transform: 'rotate(-90deg)',
  },
  chevronWidth: (width: number | undefined) => ({
    minWidth: width,
    width,
  }),
});

type RecordGroupSectionHeaderProps = {
  recordGroupDefinition: RecordGroupDefinition;
  fieldMetadataItem?: FieldMetadataItem | null;
  isExpanded: boolean;
  onToggle: () => void;
  chevronWidth?: number;
};

export const RecordGroupSectionHeader = ({
  recordGroupDefinition,
  fieldMetadataItem,
  isExpanded,
  onToggle,
  chevronWidth,
}: RecordGroupSectionHeaderProps) => {
  const theme = useTheme();

  return (
    <button
      type="button"
      aria-expanded={isExpanded}
      aria-label={t`Toggle ${recordGroupDefinition.title} group`}
      onClick={onToggle}
      {...stylex.props(styles.sectionToggle)}
    >
      <div
        {...stylex.props(
          styles.chevronContainer,
          !isExpanded && styles.chevronCollapsed,
          styles.chevronWidth(chevronWidth),
        )}
      >
        <IconChevronDown
          aria-hidden
          size={theme.icon.size.sm}
          stroke={theme.icon.stroke.sm}
        />
      </div>
      <RecordGroupChip
        recordGroupDefinition={recordGroupDefinition}
        fieldMetadataItem={fieldMetadataItem}
        valueTagWeight="medium"
      />
    </button>
  );
};
