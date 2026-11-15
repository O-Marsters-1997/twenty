import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

import {
  itemsLayout,
  separatorMarker,
} from '@/ui/layout/dropdown/components/DropdownMenuItemsContainer.stylex';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-xxs'],
    justifyContent: 'flex-start',
    marginBottom: `calc(${itemsLayout.padding} - ${itemsLayout.rowGap})`,
    marginInline: `calc(0px - ${itemsLayout.padding})`,
    marginTop: {
      default: null,
      ':first-child': `calc(0px - ${itemsLayout.padding})`,
      [stylex.when.siblingBefore(':is(*)', separatorMarker)]:
        `calc(0px - ${itemsLayout.rowGap})`,
    },
    minHeight: '20px',
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    userSelect: 'none',
    width: `calc(100% + ${itemsLayout.padding} + ${itemsLayout.padding})`,
  },
});

export type DropdownMenuSectionLabelProps = {
  label: string;
};

export const DropdownMenuSectionLabel = ({
  label,
}: DropdownMenuSectionLabelProps) => {
  return <div {...stylex.props(styles.root)}>{label}</div>;
};
