import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { RecordGroupAggregateDropdownButton } from '@/object-record/record-group/components/RecordGroupAggregateDropdownButton';
import { RecordGroupAggregateDropdownContent } from '@/object-record/record-group/components/RecordGroupAggregateDropdownContent';
import { RecordGroupAggregateDropdownComponentInstanceContext } from '@/object-record/record-group/states/context/RecordGroupAggregateDropdownComponentInstanceContext';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { DROPDOWN_OFFSET_Y } from '@/ui/layout/dropdown/constants/DropdownOffsetY';
import { t } from '@lingui/core/macro';
import { type Nullable } from 'twenty-shared/types';
import * as stylex from '@stylexjs/stylex';

type RecordGroupAggregateDropdownProps = {
  aggregateValue?: Nullable<string | number>;
  aggregateLabel?: Nullable<string>;
  objectMetadataItem: EnrichedObjectMetadataItem;
  dropdownId: string;
};

const styles = stylex.create({
  container: {
    flexShrink: '0',
  },
});

export const RecordGroupAggregateDropdown = ({
  objectMetadataItem,
  aggregateValue,
  aggregateLabel,
  dropdownId,
}: RecordGroupAggregateDropdownProps) => {
  return (
    <RecordGroupAggregateDropdownComponentInstanceContext.Provider
      value={{ instanceId: dropdownId }}
    >
      <div {...stylex.props(styles.container)}>
        <DropdownRoot dropdownId={dropdownId} type="picker">
          <RecordGroupAggregateDropdownButton
            dropdownId={dropdownId}
            value={aggregateValue}
            tooltip={aggregateLabel}
          />
          <DropdownContent
            aria-label={t`Aggregate`}
            align="end"
            sideOffset={DROPDOWN_OFFSET_Y}
          >
            <RecordGroupAggregateDropdownContent
              objectMetadataItem={objectMetadataItem}
            />
          </DropdownContent>
        </DropdownRoot>
      </div>
    </RecordGroupAggregateDropdownComponentInstanceContext.Provider>
  );
};
