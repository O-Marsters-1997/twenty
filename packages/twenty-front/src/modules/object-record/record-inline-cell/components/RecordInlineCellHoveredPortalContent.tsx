import { RecordInlineCellHoveredPortal } from '@/object-record/record-inline-cell/components/RecordInlineCellHoveredPortal';
import * as stylex from '@stylexjs/stylex';
import { background, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  inlineCellBaseContainer: {
    background: `var(
    --record-card-background-color,
    ${background['--t-background-primary']}
  )`,
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    userSelect: 'text',
    height: 'fit-content',
    width: '100%',
  },
  content: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'normal',
    width: '100%',
  },
  contentCentered: {
    justifyContent: 'center',
  },
});

type RecordInlineCellHoveredPortalContentProps = {
  children: React.ReactNode;
  readonly: boolean;
  isCentered?: boolean;
  onMouseLeave?: () => void;
};

export const RecordInlineCellHoveredPortalContent = ({
  children,
  isCentered,
  onMouseLeave,
}: RecordInlineCellHoveredPortalContentProps) => {
  return (
    <RecordInlineCellHoveredPortal>
      <div
        onMouseLeave={onMouseLeave}
        {...stylex.props(styles.inlineCellBaseContainer)}
      >
        <div
          {...stylex.props(
            styles.content,
            isCentered === true && styles.contentCentered,
          )}
        >
          {children}
        </div>
      </div>
    </RecordInlineCellHoveredPortal>
  );
};
