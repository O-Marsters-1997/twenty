import { recordTableLayout } from '../../constants/recordTableLayout.stylex';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';
import { media } from 'twenty-ui/theme/constants.stylex';
import {
  background,
  borderColor,
  fontColor,
} from 'twenty-ui/theme/tokens.stylex';

type RecordTableHeaderCellContainerProps = ComponentProps<'div'> & {
  shouldDisplayBorderBottom: boolean;
  isResizing: boolean;
  isReadOnly: boolean;
};

export const RecordTableHeaderCellContainer = ({
  shouldDisplayBorderBottom,
  isResizing,
  isReadOnly,
  className,
  ...divProps
}: RecordTableHeaderCellContainerProps) => {
  const stylexProps = stylex.props(
    styles.cell,
    shouldDisplayBorderBottom && styles.borderBottom,
    isReadOnly
      ? styles.readOnly
      : isResizing
        ? styles.resizing
        : styles.interactive,
  );

  return (
    <div
      // oxlint-disable-next-line react/jsx-props-no-spreading
      {...divProps}
      {...mergeClassName(stylexProps, className)}
    />
  );
};

const styles = stylex.create({
  cell: {
    backgroundColor: background['--t-background-primary'],
    borderRightColor: borderColor['--t-border-color-light'],
    borderRightStyle: 'solid',
    borderRightWidth: 1,
    color: fontColor['--t-font-color-tertiary'],
    height: recordTableLayout.rowHeight,
    maxHeight: recordTableLayout.rowHeight,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    position: 'relative',
    textAlign: 'left',
    userSelect: 'none',
  },
  borderBottom: {
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
  },
  readOnly: {
    cursor: 'default',
  },
  resizing: {
    cursor: 'col-resize',
  },
  interactive: {
    backgroundColor: {
      default: background['--t-background-primary'],
      ':active': background['--t-background-tertiary'],
      ':hover': {
        default: null,
        [media.hoverCapable]: background['--t-background-secondary'],
      },
    },
    cursor: 'pointer',
  },
});
