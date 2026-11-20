import { useMergeRecordsSelectedRecords } from '@/object-record/record-merge/hooks/useMergeRecordsSelectedRecords';
import { useMergeRecordsSettings } from '@/object-record/record-merge/hooks/useMergeRecordsSettings';
import { getPositionNumberIcon } from '@/object-record/record-merge/utils/getPositionNumberIcon';
import { getPositionWordLabel } from '@/object-record/record-merge/utils/getPositionWordLabel';
import { Select } from '@/ui/input/components/Select';
import { t } from '@lingui/core/macro';
import { Section } from 'twenty-ui/components/layout';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  sectionContainer: {
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
    width: 'auto',
  },
});

export const MergeSettingsTab = () => {
  const { mergeSettings, updatePriorityRecordIndex } =
    useMergeRecordsSettings();
  const { selectedRecords } = useMergeRecordsSelectedRecords();

  const priorityOptions = selectedRecords.map((_, index) => {
    const positionLabel = getPositionWordLabel(index);
    return {
      value: index,
      label: t`${positionLabel} record holds priority`,
      Icon: getPositionNumberIcon(index),
      recordIndex: index,
    };
  });

  const handleSelectionChange = (index: number) => {
    updatePriorityRecordIndex(index);
  };

  if (selectedRecords.length === 0) {
    return null;
  }

  return (
    <div {...stylex.props(styles.sectionContainer)}>
      <Section.Root>
        <Select
          dropdownId="merge-settings-priority-select"
          options={priorityOptions}
          value={mergeSettings.conflictPriorityIndex}
          onChange={handleSelectionChange}
          label={t`Fields conflicts`}
        />
      </Section.Root>
    </div>
  );
};
