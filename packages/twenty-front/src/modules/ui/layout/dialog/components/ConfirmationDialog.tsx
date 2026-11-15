import { Button } from 'twenty-ui/primitives/input';
import { DialogInstance } from '@/ui/layout/dialog/components/DialogInstance';
import { type ConfirmationDialogProps } from '@/ui/layout/dialog/types/ConfirmationDialogProps';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { isNonEmptyString } from '@sniptt/guards';
import { useState } from 'react';

import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';

import { useDialog } from '@/ui/layout/dialog/hooks/useDialog';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { Section } from 'twenty-ui/components/layout';
import { Dialog } from 'twenty-ui/primitives/surfaces';

const styles = stylex.create({
  popup: {
    borderRadius: spacing['--t-spacing-1'],
    padding: spacing['--t-spacing-6'],
    width: 'calc(400px - var(--t-spacing-32))',
  },
  centeredButton: {
    boxSizing: 'border-box',
    marginTop: spacing['--t-spacing-2'],
  },
  description: {
    color: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    marginBottom: spacing['--t-spacing-6'],
  },
});

const defaultConfirmButtonText = msg`Confirm`;

export const ConfirmationDialog = ({
  dialogId,
  title,
  loading,
  isConfirmButtonDisabled = false,
  subtitle,
  onConfirmClick,
  onClose,
  confirmButtonText,
  confirmationValue,
  confirmationPlaceholder,
  confirmButtonColor = 'danger',
  AdditionalButtons,
  hideCancelButton = false,
}: ConfirmationDialogProps) => {
  const { i18n, t } = useLingui();
  const translatedConfirmButtonText =
    confirmButtonText ?? i18n._(defaultConfirmButtonText);
  const [inputConfirmationValue, setInputConfirmationValue] =
    useState<string>('');

  const isValidValue =
    !isConfirmButtonDisabled &&
    (!isNonEmptyString(confirmationValue) ||
      inputConfirmationValue === confirmationValue);

  const { closeDialog } = useDialog();

  const handleClose = () => {
    setInputConfirmationValue('');
    closeDialog(dialogId);
  };

  const handleConfirmClick = () => {
    handleClose();
    onConfirmClick();
  };

  const handleCancelClick = () => {
    handleClose();
    onClose?.();
  };

  const handleEnter = () => {
    if (isValidValue && !loading) {
      handleConfirmClick();
    }
  };

  return (
    <DialogInstance
      dialogId={dialogId}
      dismissible={true}
      onClose={() => {
        setInputConfirmationValue('');
        onClose?.();
      }}
      onEnter={handleEnter}
      renderInDocumentBody
    >
      {({ onKeyDown }) => (
        <Dialog.Popup
          onKeyDown={onKeyDown}
          data-globally-prevent-click-outside
          {...stylex.props(styles.popup)}
        >
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description
            render={<div />}
            {...stylex.props(styles.description)}
          >
            <Section.Root align="center" color="primary">
              {subtitle}
            </Section.Root>
          </Dialog.Description>
          {isNonEmptyString(confirmationValue) && (
            <Section.Root>
              <SettingsTextInput
                instanceId="confirmation-modal-input"
                dataTestId="confirmation-modal-input"
                value={inputConfirmationValue}
                onChange={setInputConfirmationValue}
                placeholder={confirmationPlaceholder}
                fullWidth
                disableHotkeys
                key={'input-' + confirmationValue}
              />
            </Section.Root>
          )}
          {!hideCancelButton && (
            <Button
              {...stylex.props(styles.centeredButton)}
              onClick={handleCancelClick}
              fullWidth
              data-testid="confirmation-modal-cancel-button"
              variant="outline"
            >{t`Cancel`}</Button>
          )}

          {AdditionalButtons}

          <Button
            {...stylex.props(styles.centeredButton)}
            onClick={handleConfirmClick}
            disabled={!isValidValue || loading}
            fullWidth
            data-testid="confirmation-modal-confirm-button"
            variant={confirmButtonColor === 'neutral' ? 'outline' : 'solid'}
            color={confirmButtonColor}
          >
            {translatedConfirmButtonText}
          </Button>
        </Dialog.Popup>
      )}
    </DialogInstance>
  );
};
