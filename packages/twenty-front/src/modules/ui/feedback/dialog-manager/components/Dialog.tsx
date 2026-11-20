import { type DialogProps } from '@/ui/feedback/dialog-manager/types/DialogProps';
import { motion } from 'framer-motion';
import { Key } from 'ts-key-enum';

import { DIALOG_CLICK_OUTSIDE_ID } from '@/ui/feedback/dialog-manager/constants/DialogClickOutsideId';
import { DIALOG_FOCUS_ID } from '@/ui/feedback/dialog-manager/constants/DialogFocusId';
import { DIALOG_LISTENER_ID } from '@/ui/feedback/dialog-manager/constants/DialogListenerId';
import { RootStackingContextZIndices } from '@/ui/layout/constants/RootStackingContextZIndices';
import { useHotkeysOnFocusedElement } from '@/ui/utilities/hotkey/hooks/useHotkeysOnFocusedElement';
import { useListenClickOutside } from '@/ui/utilities/pointer-event/hooks/useListenClickOutside';
import { useRef } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: background['--t-background-overlay-primary'],
    display: 'flex',
    justifyContent: 'center',
    position: 'fixed',
    height: 'calc(100dvh / var(--t-zoom, 1))',
    left: 0,
    top: 0,
    width: 'calc(100vw / var(--t-zoom, 1))',
  },
  overlayZIndex: (zIndex: number) => ({
    zIndex,
  }),
  container: {
    padding: '2em',
    backgroundColor: background['--t-background-primary'],
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    maxWidth: '320px',
    width: '100%',
  },
  dialogTitle: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    textAlign: 'center',
    marginBottom: spacing['--t-spacing-6'],
  },
  dialogMessage: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    textAlign: 'center',
    marginBottom: spacing['--t-spacing-6'],
  },
  dialogButtonContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: spacing['--t-spacing-2'],
  },
});

export const Dialog = ({
  title,
  message,
  buttons = [],
  children,
  xstyle,
  onClose,
  id,
}: DialogProps) => {
  const dialogVariants = {
    open: { opacity: 1 },
    closed: { opacity: 0 },
  };

  const containerVariants = {
    open: { y: 0 },
    closed: { y: '50vh' },
  };

  const handleEnter = (event: KeyboardEvent) => {
    const confirmButton = buttons.find((button) => button.role === 'confirm');

    event.preventDefault();

    if (isDefined(confirmButton)) {
      confirmButton?.onClick?.(event);
      onClose?.();
    }
  };

  const handleEscape = (event: KeyboardEvent) => {
    event.preventDefault();
    onClose?.();
  };

  useHotkeysOnFocusedElement({
    keys: [Key.Enter],
    callback: handleEnter,
    focusId: DIALOG_FOCUS_ID,
    dependencies: [buttons],
  });

  useHotkeysOnFocusedElement({
    keys: [Key.Escape],
    callback: handleEscape,
    focusId: DIALOG_FOCUS_ID,
    dependencies: [handleEscape],
  });

  const dialogRef = useRef<HTMLDivElement>(null);

  useListenClickOutside({
    refs: [dialogRef],
    callback: () => {
      onClose?.();
    },
    listenerId: DIALOG_LISTENER_ID,
  });

  return (
    <motion.div
      variants={dialogVariants}
      initial="closed"
      animate="open"
      exit="closed"
      data-click-outside-id={DIALOG_CLICK_OUTSIDE_ID}
      {...stylex.props(
        styles.overlay,
        styles.overlayZIndex(RootStackingContextZIndices.Dialog),
        xstyle,
      )}
    >
      <motion.div
        variants={containerVariants}
        transition={{ damping: 15, stiffness: 100 }}
        id={id}
        ref={dialogRef}
        {...stylex.props(styles.container)}
      >
        {title && <span {...stylex.props(styles.dialogTitle)}>{title}</span>}
        {message && (
          <span {...stylex.props(styles.dialogMessage)}>{message}</span>
        )}
        {children}
        {buttons.map(({ color, onClick, title: key, variant }) => (
          <div key={key} {...stylex.props(styles.dialogButtonContainer)}>
            <Button
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                onClose?.();
                onClick?.(event);
              }}
              fullWidth={true}
              color={color}
              variant={variant ?? 'outline'}
            >
              {key}
            </Button>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
};
