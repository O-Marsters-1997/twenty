import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { type ComponentPropsWithoutRef, type Ref, forwardRef } from 'react';

const styles = stylex.create({
  header: {
    alignItems: 'center',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    color: fontColor['--t-font-color-tertiary'],
    cursor: 'default',
    display: 'flex',
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    height: spacing['--t-spacing-8'],
    justifyContent: 'flex-start',
    padding: `0 ${spacing['--t-spacing-2']}`,
    textAlign: 'left',
  },
  clickable: { cursor: 'pointer' },
  alignCenter: { justifyContent: 'center', textAlign: 'center' },
  alignRight: { justifyContent: 'flex-end', textAlign: 'right' },
  padding: (padding: string) => ({ padding }),
});

type TableHeaderProps = Omit<ComponentPropsWithoutRef<'div'>, 'onClick'> & {
  align?: 'left' | 'center' | 'right';
  onClick?: () => void;
  padding?: string;
};

export const TableHeader = forwardRef(
  (
    { align, padding, className, ...props }: TableHeaderProps,
    ref: Ref<HTMLDivElement>,
  ) => {
    const headerProps = stylex.props(
      styles.header,
      props.onClick !== undefined && styles.clickable,
      align === 'center' && styles.alignCenter,
      align === 'right' && styles.alignRight,
      padding !== undefined && styles.padding(padding),
    );

    return (
      <div
        // oxlint-disable-next-line react/jsx-props-no-spreading
        {...props}
        ref={ref}
        data-table-header
        {...headerProps}
        className={[headerProps.className, className].join(' ')}
      />
    );
  },
);
