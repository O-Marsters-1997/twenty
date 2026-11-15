import { layoutSize } from '@/ui/layout/constants/layout.stylex';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import * as stylex from '@stylexjs/stylex';
import { borderColor, general, spacing } from 'twenty-ui/theme/tokens.stylex';
import { type ReactNode, type Ref } from 'react';
import { isDefined } from 'twenty-shared/utils';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  containerWidth: (widthInPixels: number) => ({
    width: `${widthInPixels}px`,
  }),
  scrollable: {
    boxSizing: 'border-box',
    display: 'flex',
    maxHeight: layoutSize.dropdownMenuItemsContainerMaxHeight,
    overflowY: 'auto',
    scrollbarColor: `${borderColor['--t-border-color-medium']} transparent`,
    scrollbarWidth: 'thin',
    width: '100%',
  },
  items: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: general['--t-between-siblings-gap'],
    height: 'fit-content',
    padding: spacing['--t-spacing-1'],
    width: '100%',
  },
});

type OverlayMenuListProps = {
  children?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  width?: number;
  ref?: Ref<HTMLDivElement>;
};

export const OverlayMenuList = ({
  children,
  header,
  footer,
  width = GenericDropdownContentWidth.Medium,
  ref,
}: OverlayMenuListProps) => (
  <div
    ref={ref}
    {...stylex.props(styles.container, styles.containerWidth(width))}
  >
    {header}
    {isDefined(children) && (
      <div {...stylex.props(styles.scrollable)}>
        <div {...stylex.props(styles.items)}>{children}</div>
      </div>
    )}
    {footer}
  </div>
);
