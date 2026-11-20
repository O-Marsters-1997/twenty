import * as stylex from '@stylexjs/stylex';
import {
  accent,
  animationDuration,
  backgroundTransparent,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { type ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
  row: {
    borderRadius: borderRadius['--t-border-radius-md'],
    textDecoration: 'none',
    backgroundColor: {
      default: 'transparent',
      ':hover': 'transparent',
    },
    cursor: 'default',
    display: 'grid',
    gridAutoColumns: '1fr',
    gridAutoFlow: 'column',
    gridTemplateColumns: 'none',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: 'background-color',
    height: 'auto',
    marginBottom: {
      default: null,
      ':last-child:not(:has([data-table-header]))': spacing['--t-spacing-2'],
    },
    marginTop: {
      default: null,
      ':first-child:not(:has([data-table-header]))': spacing['--t-spacing-2'],
    },
    width: '100%',
  },
  selected: {
    backgroundColor: accent['--t-accent-quaternary'],
  },
  expanded: {
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
  },
  interactive: {
    backgroundColor: {
      default: null,
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    cursor: 'pointer',
  },
  clickable: { cursor: 'pointer' },
  cursor: (cursor: string) => ({ cursor }),
  hoverBackgroundColor: (hoverBackgroundColor: string) => ({
    backgroundColor: { default: null, ':hover': hoverBackgroundColor },
  }),
  gridAutoColumns: (
    gridAutoColumns: string,
    mobileGridAutoColumns: string,
  ) => ({
    gridAutoColumns: {
      default: gridAutoColumns,
      [media.mobile]: mobileGridAutoColumns,
    },
  }),
  gridTemplateColumns: (gridTemplateColumns: string) => ({
    gridTemplateColumns,
  }),
  height: (height: string) => ({ height }),
});

type TableRowProps = {
  id?: string;
  isSelected?: boolean;
  isExpanded?: boolean;
  isClickable?: boolean;
  onClick?: () => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  role?: React.AriaRole;
  tabIndex?: number;
  ariaExpanded?: boolean;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
  to?: string;
  className?: string;
  style?: React.CSSProperties;
  gridAutoColumns?: string;
  gridTemplateColumns?: string;
  mobileGridAutoColumns?: string;
  height?: string;
  cursor?: string;
  hoverBackgroundColor?: string;
};

export const TableRow = ({
  id,
  isSelected,
  isExpanded,
  isClickable,
  onClick,
  onKeyDown,
  role,
  tabIndex,
  ariaExpanded,
  onMouseEnter,
  onMouseLeave,
  to,
  className,
  style,
  children,
  gridAutoColumns,
  gridTemplateColumns,
  mobileGridAutoColumns,
  height,
  cursor,
  hoverBackgroundColor,
}: React.PropsWithChildren<TableRowProps>) => {
  const isInteractive = Boolean(onClick || to);
  const rowProps = stylex.props(
    styles.row,
    isInteractive && styles.interactive,
    isExpanded === true && !isSelected && styles.expanded,
    isSelected === true && styles.selected,
    isClickable === true && styles.clickable,
    cursor !== undefined && styles.cursor(cursor),
    hoverBackgroundColor !== undefined &&
      styles.hoverBackgroundColor(hoverBackgroundColor),
    (gridAutoColumns !== undefined || mobileGridAutoColumns !== undefined) &&
      styles.gridAutoColumns(
        gridAutoColumns ?? '1fr',
        mobileGridAutoColumns ?? gridAutoColumns ?? '1fr',
      ),
    gridTemplateColumns !== undefined &&
      styles.gridTemplateColumns(gridTemplateColumns),
    height !== undefined && styles.height(height),
  );

  const sharedProps = {
    id,
    onClick,
    onKeyDown,
    role,
    tabIndex,
    'aria-expanded': ariaExpanded,
    onMouseEnter,
    onMouseLeave,
    'data-clickable': isClickable,
    'data-expanded': isExpanded || undefined,
    'data-table-row': true,
    className: [rowProps.className, className].join(' '),
    style: { ...rowProps.style, ...style },
  };

  return to ? (
    <Link to={to} {...(sharedProps as Omit<ComponentProps<typeof Link>, 'to'>)}>
      {children}
    </Link>
  ) : (
    <div {...sharedProps}>{children}</div>
  );
};
