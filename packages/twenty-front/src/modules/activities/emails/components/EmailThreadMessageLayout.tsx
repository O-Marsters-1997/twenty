import { type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  threadMessage: {
    paddingBlock: spacing['--t-spacing-4'],
    cursor: 'auto',
    display: 'flex',
    flexDirection: 'column',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
  },
  threadMessageWithoutBottomBorder: {
    borderBottomStyle: 'none',
  },
  threadMessageClickable: {
    cursor: 'pointer',
  },
  header: {
    paddingInline: spacing['--t-spacing-2'],
    cursor: 'auto',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginBottom: spacing['--t-spacing-2'],
  },
  headerClickable: {
    cursor: 'pointer',
  },
  body: {
    paddingBlock: spacing['--t-spacing-0'],
    paddingInline: spacing['--t-spacing-2'],
  },
});

type EmailThreadMessageLayoutProps = {
  header: ReactNode;
  children: ReactNode;
  hideBottomBorder?: boolean;
  isRowClickable?: boolean;
  isHeaderClickable?: boolean;
  onRowClick?: () => void;
  onHeaderClick?: () => void;
};

export const EmailThreadMessageLayout = ({
  header,
  children,
  hideBottomBorder = false,
  isRowClickable = false,
  isHeaderClickable = false,
  onRowClick,
  onHeaderClick,
}: EmailThreadMessageLayoutProps) => (
  <div
    onClick={onRowClick}
    {...stylex.props(
      styles.threadMessage,
      hideBottomBorder && styles.threadMessageWithoutBottomBorder,
      isRowClickable && styles.threadMessageClickable,
    )}
  >
    <div
      onClick={onHeaderClick}
      {...stylex.props(
        styles.header,
        isHeaderClickable && styles.headerClickable,
      )}
    >
      {header}
    </div>
    <div {...stylex.props(styles.body)}>{children}</div>
  </div>
);
