import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { t } from '@lingui/core/macro';
import { IconChevronDown } from 'twenty-ui/icon';
import { Dropdown, TabButton } from 'twenty-ui/components/navigation';

const TAB_MORE_BUTTON_TEST_ID = 'tab-tab-more-button';

const styles = stylex.create({
  container: {
    display: 'flex',
    height: `var(--tab-list-row-height, ${spacing['--t-spacing-10']})`,
  },
});

type TabMoreButtonProps = {
  hiddenTabsCount: number;
  active: boolean;
  className?: string;
  disableTestId?: boolean;
  isDropdownTrigger?: boolean;
};

export const TabMoreButton = ({
  hiddenTabsCount,
  active,
  className,
  disableTestId,
  isDropdownTrigger = false,
}: TabMoreButtonProps) => {
  const testId = disableTestId ? undefined : TAB_MORE_BUTTON_TEST_ID;

  const tabButton = (
    <TabButton
      data-testid={testId}
      active={active}
      children={`+${hiddenTabsCount} ${t`More`}`}
      endIcon={<IconChevronDown />}
      className={className}
    />
  );

  return (
    <div {...stylex.props(styles.container)}>
      {isDropdownTrigger ? <Dropdown.Trigger render={tabButton} /> : tabButton}
    </div>
  );
};
