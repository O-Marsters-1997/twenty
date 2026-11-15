import { DialogInstance } from '@/ui/layout/dialog/components/DialogInstance';
import { useDialog } from '@/ui/layout/dialog/hooks/useDialog';
import { OnboardingMainButton } from '@/onboarding/components/OnboardingMainButton';
import { type OnboardingAction } from '@/onboarding/types/OnboardingAction';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode, useRef } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconButton } from 'twenty-ui/components/input';
import { IconX } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { Dialog, type DialogPopupProps } from 'twenty-ui/primitives/surfaces';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  header: {
    alignItems: 'center',
    position: 'relative',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: spacing['--t-spacing-3'],
    top: spacing['--t-spacing-3'],
  },
  visual: {
    marginBottom: spacing['--t-spacing-2'],
  },
});

type OnboardingSkipDialogProps = {
  dialogId: string;
  visual: ReactNode;
  title: string;
  description?: string;
  actions: OnboardingAction[];
  finalFocus?: DialogPopupProps['finalFocus'];
  onSkip: () => void;
};

export const OnboardingSkipDialog = ({
  dialogId,
  visual,
  title,
  description,
  actions,
  finalFocus,
  onSkip,
}: OnboardingSkipDialogProps) => {
  const { t } = useLingui();
  const { closeDialog } = useDialog();
  const firstActionRef = useRef<HTMLButtonElement>(null);

  const runAction = (action: OnboardingAction) => {
    closeDialog(dialogId);
    action.onClick();
  };

  return (
    <DialogInstance dialogId={dialogId} dismissible renderInDocumentBody>
      {({ onKeyDown }) => (
        <Dialog.Popup
          onKeyDown={onKeyDown}
          size="compact"
          initialFocus={firstActionRef}
          finalFocus={finalFocus}
          data-globally-prevent-click-outside
        >
          <Dialog.Header {...stylex.props(styles.header)}>
            <div {...stylex.props(styles.closeButton)}>
              <IconButton
                variant="ghost"
                size="sm"
                aria-label={t`Close`}
                onClick={() => closeDialog(dialogId)}
              >
                <IconX />
              </IconButton>
            </div>
            <div {...stylex.props(styles.visual)}>{visual}</div>
            <Dialog.Title>{title}</Dialog.Title>
            {isDefined(description) && (
              <Dialog.Description>{description}</Dialog.Description>
            )}
          </Dialog.Header>
          <Dialog.Footer>
            {actions.map((action, index) => (
              <OnboardingMainButton
                key={action.label}
                ref={index === 0 ? firstActionRef : undefined}
                label={action.label}
                Icon={action.Icon}
                onClick={() => runAction(action)}
              />
            ))}
            <Button
              variant="ghost"
              fullWidth
              data-testid="onboarding-skip-dialog-skip-anyway"
              onClick={() => {
                closeDialog(dialogId);
                onSkip();
              }}
            >
              {t`Skip anyway`}
            </Button>
          </Dialog.Footer>
        </Dialog.Popup>
      )}
    </DialogInstance>
  );
};
