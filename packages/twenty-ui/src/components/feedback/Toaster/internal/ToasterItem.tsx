import * as stylex from '@stylexjs/stylex';
import { useRef } from 'react';

import { Toast } from '@ui/components/feedback/Toast/Toast';
import { ToastTimingContext } from '@ui/components/feedback/Toast/internal/contexts/ToastTimingContext';
import { type ToastEntry } from '@ui/components/feedback/Toast/internal/types/ToastEntry';

import { media } from '../../../../theme/constants.stylex';
import { toasterVars } from '../Toaster.stylex';
import { type ToasterProps } from '../types/ToasterProps';
import { ToasterItemExitEffect } from './ToasterItemExitEffect';

type ToasterItemProps = {
  toastEntry: ToastEntry;
  getToastProps?: ToasterProps['getToastProps'];
  onClose: (id: string) => void;
};

export const ToasterItem = ({
  toastEntry,
  getToastProps,
  onClose,
}: ToasterItemProps) => {
  const { notification, status, durationRevision = 0 } = toastEntry;
  const { id, ...toastProps } = notification;
  const elementRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        ref={elementRef}
        {...stylex.props(
          styles.item,
          status === 'closing' && styles.itemExiting,
        )}
        data-exiting={status === 'closing' || undefined}
        inert={status === 'closing'}
      >
        <div {...stylex.props(styles.itemContent)}>
          <ToastTimingContext.Provider
            value={{ durationRevision, isActive: status === 'visible' }}
          >
            <Toast
              {...toastProps}
              {...getToastProps?.(notification)}
              id={id}
              onClose={() => onClose(id)}
            />
          </ToastTimingContext.Provider>
        </div>
      </div>
      <ToasterItemExitEffect elementRef={elementRef} toastEntry={toastEntry} />
    </>
  );
};

const styles = stylex.create({
  item: {
    display: 'grid',
    gridTemplateRows: {
      default: '1fr',
      '@starting-style': '0fr',
    },
    opacity: {
      default: 1,
      '@starting-style': 0,
    },
    pointerEvents: 'auto',
    transform: {
      default: 'translateY(0)',
      '@starting-style': `translateY(${toasterVars['--toaster-offset']})`,
    },
    transitionDuration: '500ms',
    transitionProperty: {
      default: 'grid-template-rows, opacity, transform',
      [media.reducedMotion]: 'none',
    },
    transitionTimingFunction: 'ease-in-out',
  },
  itemExiting: {
    gridTemplateRows: '0fr',
    opacity: 0,
    pointerEvents: 'none',
    transform: `translateY(${toasterVars['--toaster-offset']})`,
  },
  itemContent: {
    display: 'flex',
    flexDirection: 'column',
    minBlockSize: 0,
  },
});
