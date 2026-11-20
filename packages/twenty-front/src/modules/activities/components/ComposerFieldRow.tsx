import { type MouseEventHandler, type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const ROW_MIN_HEIGHT = '40px';

const styles = stylex.create({
  row: {
    gap: spacing['--t-spacing-2'],
    paddingBlock: spacing['--t-spacing-1'],
    alignItems: 'center',
    boxSizing: 'border-box',
    cursor: 'default',
    display: 'flex',
    paddingInlineEnd: spacing['--t-spacing-2'],
    paddingInlineStart: spacing['--t-spacing-3'],
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: {
      default: 'solid',
      ':last-of-type': 'none',
    },
    borderBottomWidth: '1px',
    minHeight: ROW_MIN_HEIGHT,
    width: '100%',
  },
  rowClickable: {
    cursor: 'pointer',
  },
  label: {
    color: fontColor['--t-font-color-tertiary'],
    flexShrink: 0,
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    minWidth: 'auto',
  },
  labelMinWidth: (minWidth: string) => ({ minWidth }),
  content: {
    flex: '1',
    alignItems: 'center',
    display: 'flex',
    minWidth: '0',
  },
  trailing: {
    alignItems: 'center',
    display: 'flex',
  },
});

type ComposerFieldRowProps = {
  label: string;
  children: ReactNode;
  trailing?: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
  // A floor, not a fixed width, so a long translation doesn't run under its control.
  labelMinWidth?: string;
};

// The label is a plain span, so the row is named as a group to give assistive technology the field name.
export const ComposerFieldRow = ({
  label,
  children,
  trailing,
  onClick,
  labelMinWidth,
}: ComposerFieldRowProps) => (
  <div
    role="group"
    aria-label={label}
    {...stylex.props(styles.row, isDefined(onClick) && styles.rowClickable)}
    onClick={onClick}
  >
    <span
      aria-hidden="true"
      {...stylex.props(
        styles.label,
        isDefined(labelMinWidth) && styles.labelMinWidth(labelMinWidth),
      )}
    >
      {label}
    </span>
    <div {...stylex.props(styles.content)}>{children}</div>
    {isDefined(trailing) && (
      <div
        onClick={(event) => event.stopPropagation()}
        {...stylex.props(styles.trailing)}
      >
        {trailing}
      </div>
    )}
  </div>
);
