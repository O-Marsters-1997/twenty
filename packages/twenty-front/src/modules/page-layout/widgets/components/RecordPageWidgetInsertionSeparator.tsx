import { useNavigateToMoreWidgets } from '@/page-layout/hooks/useNavigateToMoreWidgets';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { t } from '@lingui/core/macro';
import { IconButton } from 'twenty-ui/components/input';
import { IconPlus } from 'twenty-ui/icon';
import {
  spacing,
  backgroundTransparent,
  borderColor,
  borderRadius,
} from 'twenty-ui/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { separatorMarker } from './RecordPageWidgetInsertionSeparator.stylex';

type RecordPageWidgetInsertionSeparatorProps = {
  widget: Pick<PageLayoutWidget, 'id' | 'title'>;
};

export const RecordPageWidgetInsertionSeparator = ({
  widget,
}: RecordPageWidgetInsertionSeparatorProps) => {
  const { navigateToMoreWidgets } = useNavigateToMoreWidgets();

  return (
    <div {...stylex.props(separatorMarker, styles.separator)}>
      <div {...stylex.props(styles.line)} />
      <IconButton
        elevated
        {...stylex.props(styles.insertButton)}
        aria-label={t`Add widget above ${widget.title}`}
        size="sm"
        onClick={() =>
          navigateToMoreWidgets({
            targetWidgetId: widget.id,
            direction: 'above',
          })
        }
      >
        <IconPlus />
      </IconButton>
      <div {...stylex.props(styles.line)} />
    </div>
  );
};

const styles = stylex.create({
  separator: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: 0,
    height: spacing['--t-spacing-4'],
    overflow: 'visible',
    paddingInline: spacing['--t-spacing-4'],
    position: 'relative',
    zIndex: 4,
  },
  line: {
    backgroundColor: borderColor['--t-border-color-strong'],
    borderRadius: borderRadius['--t-border-radius-pill'],
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    height: 1,
    opacity: {
      default: 0,
      [stylex.when.ancestor(':hover', separatorMarker)]: 1,
      [stylex.when.ancestor(':focus-within', separatorMarker)]: 1,
      '@media (hover: none)': 1,
    },
  },
  insertButton: {
    backgroundColor:
      backgroundTransparent['--t-background-transparent-primary'],
    borderColor: backgroundTransparent['--t-background-transparent-light'],
    flexShrink: 0,
    opacity: {
      default: 0,
      [stylex.when.ancestor(':hover', separatorMarker)]: 1,
      [stylex.when.ancestor(':focus-within', separatorMarker)]: 1,
      '@media (hover: none)': 1,
    },
    pointerEvents: {
      default: 'none',
      [stylex.when.ancestor(':hover', separatorMarker)]: 'auto',
      [stylex.when.ancestor(':focus-within', separatorMarker)]: 'auto',
      '@media (hover: none)': 'auto',
    },
  },
});
