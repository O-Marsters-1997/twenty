import { type WidgetContentPadding } from '@/page-layout/widgets/utils/getWidgetContentPadding';
import { isWidgetCardFlushInViewMode } from '@/page-layout/widgets/utils/isWidgetCardFlushInViewMode';
import * as stylex from '@stylexjs/stylex';
import { type WidgetCardVariant } from '@/page-layout/widgets/types/WidgetCardVariant';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type WidgetCardContentProps = {
  variant: WidgetCardVariant;
  hasHeader: boolean;
  isEditable: boolean;
  hasInteractiveContent?: boolean;
  isFixedHeight?: boolean;
  contentPadding?: WidgetContentPadding;
  children?: React.ReactNode;
};

export const WidgetCardContent = ({
  variant,
  hasHeader,
  isEditable,
  hasInteractiveContent = false,
  isFixedHeight = false,
  contentPadding = 'default',
  children,
}: WidgetCardContentProps) => {
  const handleContentClick = (event: React.MouseEvent) => {
    if (!isEditable || !hasInteractiveContent) {
      return;
    }

    event.stopPropagation();
  };

  const isFlushWithHeader =
    hasHeader && isWidgetCardFlushInViewMode({ isEditable, variant });

  return (
    <div
      onClick={handleContentClick}
      {...stylex.props(
        styles.content,
        isFixedHeight ? styles.fixedHeight : styles.fluidHeight,
        hasHeader && variant === 'framed' && styles.marginWithFramedHeader,
        contentPadding === 'none'
          ? styles.paddingNone
          : isFlushWithHeader
            ? styles.paddingFlushWithHeader
            : styles.paddingDefault,
        contentPadding === 'none'
          ? styles.paddingInlineNone
          : styles.paddingInlineCard,
        hasHeader && variant === 'flush' && styles.emptyPaddingForTitle,
      )}
    >
      {children}
    </div>
  );
};

const styles = stylex.create({
  content: {
    boxSizing: 'border-box',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
  },
  fixedHeight: {
    height: '40rem',
    minHeight: '40rem',
    overflow: 'clip',
  },
  fluidHeight: {
    height: 'var(--widget-height, 100%)',
    minHeight: 0,
    overflow: 'var(--widget-card-content-overflow, hidden)',
  },
  marginWithFramedHeader: {
    marginTop: { default: spacing['--t-spacing-2'], ':empty': 0 },
  },
  paddingNone: { paddingBottom: 0, paddingTop: 0 },
  paddingDefault: {
    paddingBottom: { default: spacing['--t-spacing-2'], ':empty': 0 },
    paddingTop: { default: spacing['--t-spacing-2'], ':empty': 0 },
  },
  paddingFlushWithHeader: {
    paddingBottom: { default: spacing['--t-spacing-2'], ':empty': 0 },
    paddingTop: { default: spacing['--t-spacing-3'], ':empty': 0 },
  },
  paddingInlineNone: { paddingInline: 0 },
  paddingInlineCard: {
    paddingInline: {
      default: 'var(--widget-card-padding-inline)',
      ':empty': 0,
    },
  },
  emptyPaddingForTitle: {
    paddingBottom: {
      default: null,
      ':empty': 'var(--widget-card-title-padding-top)',
    },
  },
});
