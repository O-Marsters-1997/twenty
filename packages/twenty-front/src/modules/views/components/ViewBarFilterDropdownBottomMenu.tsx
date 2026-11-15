import { ViewBarFilterDropdownAdvancedFilterButton } from '@/views/components/ViewBarFilterDropdownAdvancedFilterButton';
import { ViewBarFilterDropdownAnyFieldSearchButton } from '@/views/components/ViewBarFilterDropdownAnyFieldSearchButton';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
  },
});

export const ViewBarFilterDropdownBottomMenu = () => {
  return (
    <div {...stylex.props(styles.container)}>
      <ViewBarFilterDropdownAnyFieldSearchButton />
      <ViewBarFilterDropdownAdvancedFilterButton />
    </div>
  );
};
