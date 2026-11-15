import { RecordInlineCellHoveredPortal } from '@/object-record/record-inline-cell/components/RecordInlineCellHoveredPortal';
import * as stylex from '@stylexjs/stylex';
import { background, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  inlineCellBaseContainer: {
    alignItems: 'center',
    background: `var(
    --record-card-background-color,
    ${background['--t-background-primary']}
  )`,
    boxSizing: 'border-box',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    height: 'fit-content',
    userSelect: 'text',
    width: '100%',
  },
  content: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
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
