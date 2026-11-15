import { useContextStoreObjectMetadataItemOrThrow } from '@/context-store/hooks/useContextStoreObjectMetadataItemOrThrow';
import { AdvancedFilterAddFilterRuleSelect } from '@/object-record/advanced-filter/components/AdvancedFilterAddFilterRuleSelect';
import { AdvancedFilterRecordFilterGroupRow } from '@/object-record/advanced-filter/components/AdvancedFilterRecordFilterGroupRow';
import { AdvancedFilterRecordFilterRow } from '@/object-record/advanced-filter/components/AdvancedFilterRecordFilterRow';
import { AdvancedFilterSSEEffect } from '@/object-record/advanced-filter/components/AdvancedFilterSSEEffect';

import { ADVANCED_FILTER_DROPDOWN_CONTENT_WIDTH } from '@/object-record/advanced-filter/constants/AdvancedFilterDropdownContentWidth';
import { useChildRecordFiltersAndRecordFilterGroups } from '@/object-record/advanced-filter/hooks/useChildRecordFiltersAndRecordFilterGroups';
import { AdvancedFilterContext } from '@/object-record/advanced-filter/states/context/AdvancedFilterContext';
import { rootLevelRecordFilterGroupComponentSelector } from '@/object-record/advanced-filter/states/rootLevelRecordFilterGroupComponentSelector';
import { isRecordFilterGroupChildARecordFilterGroup } from '@/object-record/advanced-filter/utils/isRecordFilterGroupChildARecordFilterGroup';
import { LegacyDropdownContent } from '@/ui/layout/dropdown/components/LegacyDropdownContent';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'start',
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
  },
});

export const AdvancedFilterRootRecordFilterGroup = () => {
  const rootRecordFilterGroup = useAtomComponentSelectorValue(
    rootLevelRecordFilterGroupComponentSelector,
  );

  const { childRecordFiltersAndRecordFilterGroups } =
    useChildRecordFiltersAndRecordFilterGroups({
      recordFilterGroupId: rootRecordFilterGroup?.id,
    });

  const { objectMetadataItem } = useContextStoreObjectMetadataItemOrThrow();

  if (!isDefined(rootRecordFilterGroup)) {
    return null;
  }

  return (
    <ScrollWrapper
      componentInstanceId={`scroll-wrapper-dropdown-menu-${rootRecordFilterGroup.id}`}
    >
      <LegacyDropdownContent
        widthInPixels={ADVANCED_FILTER_DROPDOWN_CONTENT_WIDTH}
      >
        <AdvancedFilterContext.Provider value={{ objectMetadataItem }}>
          <AdvancedFilterSSEEffect />
          <div {...stylex.props(styles.container)}>
            {childRecordFiltersAndRecordFilterGroups.map(
              (recordFilterGroupChild, recordFilterGroupChildIndex) =>
                isRecordFilterGroupChildARecordFilterGroup(
                  recordFilterGroupChild,
                ) ? (
                  <AdvancedFilterRecordFilterGroupRow
                    key={recordFilterGroupChild.id}
                    parentRecordFilterGroup={rootRecordFilterGroup}
                    recordFilterGroup={recordFilterGroupChild}
                    recordFilterGroupIndex={recordFilterGroupChildIndex}
                  />
                ) : (
                  <AdvancedFilterRecordFilterRow
                    key={recordFilterGroupChild.id}
                    recordFilterGroup={rootRecordFilterGroup}
                    recordFilter={recordFilterGroupChild}
                    recordFilterIndex={recordFilterGroupChildIndex}
                  />
                ),
            )}
            <AdvancedFilterAddFilterRuleSelect
              recordFilterGroup={rootRecordFilterGroup}
            />
          </div>
        </AdvancedFilterContext.Provider>
      </LegacyDropdownContent>
    </ScrollWrapper>
  );
};
