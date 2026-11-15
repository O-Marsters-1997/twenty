import { useRender } from '@base-ui/react/use-render';
import { isUndefined } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { type FocusEvent, type MouseEvent, useState } from 'react';

import {
  IconAlertTriangle,
  IconInfoCircle,
  IconSquareRoundedCheck,
  IconX,
} from '@ui/icon';
import { Button } from '@ui/primitives/input/Button/Button';
import { Separator } from '@ui/primitives/layout/Separator/Separator';
import { useTheme } from '@ui/theme';
import { isRenderableSlot } from '@ui/utilities/internal/isRenderableSlot';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { isDefined } from '@ui/utilities/utils/isDefined';

import { media } from '../../../theme/constants.stylex';
import {
  background,
  blur,
  borderRadius,
  boxShadow,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from '../../../theme/tokens.stylex';
import { ToastCountdownEffect } from './internal/components/ToastCountdownEffect';
import { ToastFocusEffect } from './internal/components/ToastFocusEffect';
import { ToastProgress } from './internal/components/ToastProgress';
import { useToastCountdown } from './internal/hooks/useToastCountdown';
import { type ToastProps } from './types/ToastProps';
import { type ToastStatus } from './types/ToastStatus';

const TOAST_ICONS = {
  neutral: IconAlertTriangle,
  error: IconAlertTriangle,
  success: IconSquareRoundedCheck,
  info: IconInfoCircle,
  warning: IconAlertTriangle,
} satisfies Record<ToastStatus, typeof IconAlertTriangle>;

export const Toast = ({
  children,
  description,
  icon,
  iconLabel,
  action,
  progress,
  duration = 6000,
  onCancel,
  onClose,
  cancelLabel = 'Cancel',
  closeLabel = 'Close',
  status = 'neutral',
  role = 'status',
  className,
  xstyle,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  render,
  ref,
  ...props
}: WithXstyle<ToastProps>) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [toastElement, setToastElement] = useState<HTMLDivElement | null>(null);

  const isPaused = isHovered || isFocused;
  const { countdown, clock } = useToastCountdown({
    duration,
    isPaused,
  });
  const Icon = TOAST_ICONS[status];
  const toastColors = theme.snackBar[status === 'neutral' ? 'default' : status];
  const toastIcon = isUndefined(icon) ? (
    <Icon
      aria-label={iconLabel}
      aria-hidden={!isDefined(iconLabel)}
      color={toastColors.color}
      size={theme.icon.size.md}
    />
  ) : (
    icon
  );

  const element = useRender({
    render,
    ref: [ref ?? null, setToastElement],
    props: {
      role,
      'aria-live': role === 'alert' ? 'assertive' : 'polite',
      ...props,
      ...mergeStylexProps(stylex.props(styles.root, xstyle), className),
      onMouseEnter: (event: MouseEvent<HTMLDivElement>) => {
        setIsHovered(true);
        onMouseEnter?.(event);
      },
      onMouseLeave: (event: MouseEvent<HTMLDivElement>) => {
        setIsHovered(false);
        onMouseLeave?.(event);
      },
      onFocus: (event: FocusEvent<HTMLDivElement>) => {
        setIsFocused(true);
        onFocus?.(event);
      },
      onBlur: (event: FocusEvent<HTMLDivElement>) => {
        const isFocusInsideToast = event.currentTarget.contains(
          event.relatedTarget,
        );

        if (!isFocusInsideToast) {
          setIsFocused(false);
        }

        onBlur?.(event);
      },
      children: (
        <>
          <div {...stylex.props(styles.progress)} aria-hidden>
            <ToastProgress
              barColor={toastColors.backgroundColor}
              progress={progress}
              duration={countdown.duration}
              remainingDuration={countdown.remainingDuration}
              revision={countdown.revision}
              isPaused={countdown.isPaused}
            />
          </div>
          <div {...stylex.props(styles.header)}>
            {isRenderableSlot(toastIcon) && (
              <div {...stylex.props(styles.icon)}>{toastIcon}</div>
            )}
            <div {...stylex.props(styles.message)}>{children}</div>
            <div {...stylex.props(styles.actions)}>
              {isDefined(onCancel) && isRenderableSlot(cancelLabel) && (
                <Button
                  onClick={onCancel}
                  size="sm"
                  variant="ghost"
                  xstyle={styles.cancelButton}
                >
                  {cancelLabel}
                </Button>
              )}
              {isDefined(onClose) && (
                <Button
                  title={closeLabel}
                  aria-label={closeLabel}
                  startIcon={<IconX />}
                  xstyle={styles.closeButton}
                  variant="ghost"
                  size="sm"
                  onClick={clock.close}
                />
              )}
            </div>
          </div>
          {isRenderableSlot(description) && (
            <div {...stylex.props(styles.description)}>{description}</div>
          )}
          {isRenderableSlot(action) && (
            <div {...stylex.props(styles.footer)}>
              <Separator />
              <div {...stylex.props(styles.footerAction)}>{action}</div>
            </div>
          )}
        </>
      ),
    },
  });

  return (
    <>
      {element}
      <ToastFocusEffect
        element={toastElement}
        isFocused={isFocused}
        onFocusChange={setIsFocused}
      />
      <ToastCountdownEffect
        clock={clock}
        duration={duration}
        progress={progress}
        isPaused={isPaused}
        onClose={onClose}
      />
    </>
  );
};

const styles = stylex.create({
  root: {
    backdropFilter: blur['--t-blur-medium'],
    backgroundColor: background['--t-background-primary'],
    borderRadius: {
      default: borderRadius['--t-border-radius-md'],
      [media.mobile]: 0,
    },
    boxShadow: boxShadow['--t-box-shadow-strong'],
    boxSizing: 'border-box',
    inlineSize: {
      default: 296,
      [media.mobile]: '100%',
    },
    marginBlockStart: spacing['--t-spacing-2'],
    paddingBlockEnd: spacing['--t-spacing-1'],
    paddingBlockStart: spacing['--t-spacing-2'],
    paddingInline: spacing['--t-spacing-2'],
    position: 'relative',
  },
  progress: {
    borderRadius: 'inherit',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    position: 'absolute',
  },
  header: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-2'],
    marginBlockEnd: spacing['--t-spacing-1'],
    position: 'relative',
  },
  message: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-sm'],
  },
  icon: {
    alignItems: 'center',
    display: 'flex',
  },
  actions: {
    alignItems: 'center',
    display: 'flex',
    marginInlineStart: 'auto',
  },
  description: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    inlineSize: 200,
    overflow: 'hidden',
    paddingInlineStart: spacing['--t-spacing-6'],
    textOverflow: 'ellipsis',
  },
  footer: {
    marginBlockStart: spacing['--t-spacing-2'],
  },
  footerAction: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'flex-end',
    paddingBlockStart: spacing['--t-spacing-1'],
  },
  cancelButton: {
    fontWeight: fontWeight['--t-font-weight-regular'],
  },
  closeButton: {
    inlineSize: spacing['--t-spacing-6'],
    maxInlineSize: 'none',
    paddingInline: 0,
  },
});
