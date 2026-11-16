import { StyledHeaderDropdownButton } from '@/ui/layout/dropdown/components/StyledHeaderDropdownButton';
import { isDropdownOpenComponentState } from '@/ui/layout/dropdown/states/isDropdownOpenComponentState';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { type Nullable } from 'twenty-shared/types';
import { Dropdown } from 'twenty-ui/components/navigation';
import { isDefined } from 'twenty-shared/utils';
import { Tag } from 'twenty-ui/primitives/data-display';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  tagContainer: {
    width: '100%',
  },
  headerButton: {
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
  },
});

export const RecordGroupAggregateDropdownButton = ({
  dropdownId,
  value,
  tooltip,
}: {
  dropdownId: string;
  value?: Nullable<string | number>;
  tooltip?: Nullable<string>;
}) => {
  const isDropdownOpen = useAtomComponentStateValue(
    isDropdownOpenComponentState,
    dropdownId,
  );

  return (
    <Tooltip
      content={tooltip ?? ''}
      side="right"
      positionMethod="fixed"
      delay={TooltipDelay.mediumDelay}
      disabled={isDropdownOpen}
    >
      <Dropdown.Trigger
        id={dropdownId}
        render={
          <StyledHeaderDropdownButton
            isUnfolded={isDropdownOpen}
            {...stylex.props(styles.headerButton)}
          />
        }
      >
        <div {...stylex.props(styles.tagContainer)}>
          <Tag color="transparent" weight="regular">
            {isDefined(value) ? value.toString() : '-'}
          </Tag>
        </div>
      </Dropdown.Trigger>
    </Tooltip>
  );
};
