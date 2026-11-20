import { recordCardMarker } from '@/object-record/record-card/components/RecordCardMarker.stylex';
import * as stylex from '@stylexjs/stylex';
import { type ComponentPropsWithoutRef } from 'react';
import {
  accent,
  background,
  borderColor,
  borderRadius,
  color,
  fontColor,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  card: {
    '--record-card-background-color': {
      default: background['--t-background-secondary'],
      ':is([data-active="true"])': accent['--t-accent-quaternary'],
      ':is([data-focused="true"])': background['--t-background-tertiary'],
      ':is([data-selected="true"])': accent['--t-accent-quaternary'],
    },
    borderColor: {
      default: borderColor['--t-border-color-medium'],
      ':is([data-active="true"])': color['--t-color-blue7'],
      ':hover': borderColor['--t-border-color-strong'],
    },
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    backgroundColor: 'var(--record-card-background-color)',
    color: fontColor['--t-font-color-primary'],
    cursor: 'pointer',
    width: '100%',
  },
  dragging: {
    opacity: 'var(--dnd-drag-source-opacity)',
  },
});

type RecordCardProps = ComponentPropsWithoutRef<'div'> & {
  isDragging?: boolean;
};

export const RecordCard = ({
  isDragging,
  children,
  ...divProps
}: RecordCardProps) => (
  <div
    {...divProps}
    {...stylex.props(
      recordCardMarker,
      styles.card,
      isDragging && styles.dragging,
    )}
  >
    {children}
  </div>
);
