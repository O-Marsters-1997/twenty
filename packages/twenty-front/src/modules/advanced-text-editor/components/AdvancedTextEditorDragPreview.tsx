import { type Ref } from 'react';
import { createPortal } from 'react-dom';
import { type IconComponent, IconPlus } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  blur,
  borderRadius,
  color,
  font,
  fontSize,
  fontWeight,
  spacing,
  tooltip,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  dragPreview: {
    alignItems: 'center',
    backdropFilter: blur['--t-blur-strong'],
    backgroundColor: tooltip['--t-tooltip-background'],
    borderRadius: borderRadius['--t-border-radius-md'],
    color: tooltip['--t-tooltip-color'],
    display: 'inline-flex',
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    left: '-10000px',
    paddingBlock: spacing['--t-spacing-1'],
    paddingInline: spacing['--t-spacing-2'],
    pointerEvents: 'none',
    position: 'fixed',
    top: 0,
    whiteSpace: 'nowrap',
  },
  insertion: {
    paddingInlineStart: spacing['--t-spacing-1'],
  },
  insertionBadge: {
    alignItems: 'center',
    backgroundColor: color['--t-color-blue'],
    borderTopLeftRadius: borderRadius['--t-border-radius-rounded'],
    borderTopRightRadius: borderRadius['--t-border-radius-rounded'],
    borderBottomRightRadius: borderRadius['--t-border-radius-rounded'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-rounded'],
    display: 'inline-flex',
    height: '16px',
    justifyContent: 'center',
    width: '16px',
  },
});

type AdvancedTextEditorDragPreviewProps = {
  Icon: IconComponent;
  label: string;
  isInsertion?: boolean;
  ref: Ref<HTMLDivElement>;
};

export const AdvancedTextEditorDragPreview = ({
  Icon,
  label,
  isInsertion = false,
  ref,
}: AdvancedTextEditorDragPreviewProps) => {
  const theme = useTheme();

  return createPortal(
    <div
      ref={ref}
      aria-hidden
      {...stylex.props(styles.dragPreview, isInsertion && styles.insertion)}
    >
      {isInsertion && (
        <span {...stylex.props(styles.insertionBadge)}>
          <IconPlus size={10} stroke={theme.icon.stroke.lg} />
        </span>
      )}
      <Icon size={theme.icon.size.sm} stroke={theme.icon.stroke.sm} />
      {label}
    </div>,
    document.body,
  );
};
