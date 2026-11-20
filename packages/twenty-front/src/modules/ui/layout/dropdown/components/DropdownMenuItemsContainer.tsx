import * as stylex from '@stylexjs/stylex';
import { borderColor } from 'twenty-ui/theme/tokens.stylex';

import { itemsLayout } from '@/ui/layout/dropdown/components/DropdownMenuItemsContainer.stylex';
import { layoutSize } from '@/ui/layout/constants/layout.stylex';

const styles = stylex.create({
  external: {
    padding: itemsLayout.padding,
    alignItems: 'flex-start',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: 'fit-content',
    width: '100%',
  },
  scrollable: {
    boxSizing: 'border-box',
    display: 'flex',
    scrollbarColor: `${borderColor['--t-border-color-medium']} transparent`,
    scrollbarWidth: 'thin',
    overflowY: 'auto',
    width: '100%',
  },
  scrollableMaxHeight: {
    maxHeight: layoutSize.dropdownMenuItemsContainerMaxHeight,
  },
  internal: {
    gap: itemsLayout.rowGap,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  },
});

export const DropdownMenuItemsContainer = ({
  children,
  hasMaxHeight,
  scrollable = true,
  isMultiSelect = false,
  className,
}: {
  children: React.ReactNode;
  hasMaxHeight?: boolean;
  scrollable?: boolean;
  isMultiSelect?: boolean;
  className?: string;
}) => {
  const scrollableProps = stylex.props(
    styles.scrollable,
    hasMaxHeight && styles.scrollableMaxHeight,
  );
  const externalProps = stylex.props(styles.external);

  return scrollable === true ? (
    <div
      {...scrollableProps}
      className={[scrollableProps.className, className].join(' ')}
    >
      <div
        role="listbox"
        aria-multiselectable={isMultiSelect || undefined}
        {...externalProps}
      >
        <div {...stylex.props(styles.internal)}>{children}</div>
      </div>
    </div>
  ) : (
    <div
      role="listbox"
      aria-multiselectable={isMultiSelect || undefined}
      {...externalProps}
      className={[externalProps.className, className].join(' ')}
    >
      <div {...stylex.props(styles.internal)}>{children}</div>
    </div>
  );
};
