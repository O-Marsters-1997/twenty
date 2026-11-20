import { RECORD_TABLE_CELL_DISPLAY_CLASS_NAME } from '@/object-record/record-table/constants/RecordTableCellDisplayClassName';
import { t } from '@lingui/core/macro';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import { type Ref } from 'react';
import * as stylex from '@stylexjs/stylex';
import { fontColor } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  outerContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    height: '100%',
    paddingLeft: 8,
    width: '100%',
  },
  innerContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    whiteSpace: 'nowrap',
    height: '100%',
    width: '100%',
  },
  emptyPlaceholderField: {
    color: fontColor['--t-font-color-light'],
    paddingLeft: '4px',
  },
});

export type EditableCellDisplayContainerProps = {
  focus?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  scrollRef?: Ref<HTMLDivElement>;
  isHovered?: boolean;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  placeholderForEmptyCell?: string;
};

export const RecordTableCellDisplayContainer = ({
  children,
  focus,
  onClick,
  scrollRef,
  onContextMenu,
  placeholderForEmptyCell,
}: React.PropsWithChildren<EditableCellDisplayContainerProps>) => {
  const outerContainerProps = stylex.props(styles.outerContainer);

  return (
    <div
      {...mergeClassName(
        outerContainerProps,
        RECORD_TABLE_CELL_DISPLAY_CLASS_NAME,
      )}
      data-testid={
        focus ? 'editable-cell-focus-mode' : 'editable-cell-display-mode'
      }
      onClick={onClick}
      ref={scrollRef}
      onContextMenu={onContextMenu}
    >
      {placeholderForEmptyCell ? (
        <div {...stylex.props(styles.emptyPlaceholderField)}>
          {t`Set ${placeholderForEmptyCell}`}
        </div>
      ) : (
        <div {...stylex.props(styles.innerContainer)}>{children}</div>
      )}
    </div>
  );
};
