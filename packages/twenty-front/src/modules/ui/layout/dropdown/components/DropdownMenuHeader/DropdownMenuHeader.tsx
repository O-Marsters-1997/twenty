import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { type ComponentProps, type MouseEvent } from 'react';
import { isDefined } from 'twenty-shared/utils';

const styles = stylex.create({
  header: {
    padding: spacing['--t-spacing-1'],
    alignItems: 'center',
    boxSizing: 'content-box',
    color: fontColor['--t-font-color-primary'],
    cursor: 'default',
    display: 'flex',
    flexShrink: 0,
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    userSelect: 'none',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderTopLeftRadius: `calc(${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']})`,
    borderTopRightRadius: `calc(${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']})`,
    height: spacing['--t-spacing-6'],
  },
  headerClickable: {
    backgroundColor: {
      default: null,
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    cursor: 'pointer',
    fontSize: fontSize['--t-font-size-sm'],
  },
  childrenWrapper: {
    overflow: 'hidden',
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-1'],
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  endComponent: {
    color: fontColor['--t-font-color-tertiary'],
    display: 'inline-flex',
    marginLeft: 'auto',
    marginRight: 0,
  },
});

type DropdownMenuHeaderProps = ComponentProps<'li'> & {
  onClick?: (event: MouseEvent<HTMLLIElement>) => void;
  testId?: string;
  className?: string;
  StartComponent?: React.ReactNode;
  EndComponent?: React.ReactNode;
};

export const DropdownMenuHeader = ({
  children,
  StartComponent,
  onClick,
  testId,
  className,
  EndComponent,
}: DropdownMenuHeaderProps) => {
  const headerProps = stylex.props(
    styles.header,
    isDefined(onClick) && styles.headerClickable,
  );

  return (
    <li
      data-testid={testId}
      onClick={onClick}
      {...headerProps}
      className={[headerProps.className, className].join(' ')}
    >
      {isDefined(StartComponent) && StartComponent}
      <span {...stylex.props(styles.childrenWrapper)}>{children}</span>
      {isDefined(EndComponent) && (
        <div {...stylex.props(styles.endComponent)}>{EndComponent}</div>
      )}
    </li>
  );
};
