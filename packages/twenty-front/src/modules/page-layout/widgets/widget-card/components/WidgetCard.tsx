import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import { type WidgetCardVariant } from '@/page-layout/widgets/types/WidgetCardVariant';
import { isWidgetCardFlushInViewMode } from '@/page-layout/widgets/utils/isWidgetCardFlushInViewMode';
import {
  spacing,
  background,
  backgroundTransparent,
  borderColor,
  borderRadius,
  color,
} from 'twenty-ui/theme/tokens.stylex';

export type WidgetCardProps = {
  variant: WidgetCardVariant;
  isEditable: boolean;
  isEditing: boolean;
  isDragging: boolean;
  isResizing: boolean;
  headerLess?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  className?: string;
  children?: React.ReactNode;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
  'data-testid'?: string;
  'data-widget-id'?: string;
};

export const WidgetCard = ({
  variant,
  isEditable,
  isEditing,
  isDragging,
  isResizing,
  headerLess,
  onClick,
  className,
  children,
  onMouseEnter,
  onMouseLeave,
  'data-testid': dataTestId,
  'data-widget-id': dataWidgetId,
}: WidgetCardProps) => {
  const isFlush = isWidgetCardFlushInViewMode({ variant, isEditable });
  const isFramed = variant === 'framed';
  const isHighlighted = isEditable && (isEditing || isDragging);
  const isDraggingEditable = isEditable && isDragging;
  const hasSecondaryBackground = isDraggingEditable || isFramed;
  const canHover = isEditable && !isDragging && !isEditing && !isResizing;
  const hasClickHandler = isDefined(onClick);

  return (
    <div
      data-secondary-background={hasSecondaryBackground}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-testid={dataTestId}
      data-widget-id={dataWidgetId}
      {...mergeClassName(
        stylex.props(
          styles.card,
          isFlush ? styles.insetsFlush : styles.insetsDefault,
          hasSecondaryBackground && styles.secondaryBackground,
          isDraggingEditable && styles.draggingBackground,
          (isFramed || isEditable) && styles.bordered,
          isHighlighted
            ? styles.borderHighlighted
            : isFramed
              ? canHover
                ? styles.borderLightHoverable
                : styles.borderLight
              : canHover
                ? styles.borderTransparentHoverable
                : styles.borderTransparent,
          isEditable &&
            !isDragging &&
            !isEditing &&
            !isResizing &&
            hasClickHandler &&
            styles.clickable,
          isFramed && headerLess !== true && styles.framedPadding,
        ),
        className,
      )}
    >
      {children}
    </div>
  );
};

const styles = stylex.create({
  card: {
    padding: 0,
    borderStyle: 'none',
    backgroundColor: 'transparent',
    boxSizing: 'border-box',
    cursor: 'default',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: 'var(--widget-height, 100%)',
    width: '100%',
  },
  insetsFlush: {
    '--widget-card-padding-inline': spacing['--t-spacing-4'],
    '--widget-card-title-padding-top': spacing['--t-spacing-3'],
  },
  insetsDefault: {
    '--widget-card-padding-inline': spacing['--t-spacing-2'],
    '--widget-card-title-padding-top': spacing['--t-spacing-2'],
  },
  secondaryBackground: {
    '--record-card-background-color': background['--t-background-secondary'],
    backgroundColor: background['--t-background-secondary'],
  },
  draggingBackground: {
    backgroundImage: `linear-gradient(0deg, ${backgroundTransparent['--t-background-transparent-lighter']} 0%, ${backgroundTransparent['--t-background-transparent-lighter']} 100%)`,
  },
  bordered: {
    borderColor: 'transparent',
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: 1,
  },
  borderTransparent: { borderColor: 'transparent' },
  borderTransparentHoverable: {
    borderColor: {
      default: 'transparent',
      ':hover': borderColor['--t-border-color-strong'],
    },
  },
  borderLight: { borderColor: borderColor['--t-border-color-light'] },
  borderLightHoverable: {
    borderColor: {
      default: borderColor['--t-border-color-light'],
      ':hover': borderColor['--t-border-color-strong'],
    },
  },
  borderHighlighted: { borderColor: color['--t-color-blue'] },
  clickable: { cursor: 'pointer' },
  framedPadding: { padding: spacing['--t-spacing-2'] },
});
