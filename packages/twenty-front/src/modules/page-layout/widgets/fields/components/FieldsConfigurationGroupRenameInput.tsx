import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { type FormEvent } from 'react';

import { TextInput } from '@/ui/input/components/TextInput';
import { Button } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  form: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    width: '100%',
  },
});

type FieldsConfigurationGroupRenameInputProps = {
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onSave: (newName: string) => void;
  onClose: () => void;
};

export const FieldsConfigurationGroupRenameInput = ({
  renameValue,
  onRenameValueChange,
  onSave,
  onClose,
}: FieldsConfigurationGroupRenameInputProps) => {
  const { t } = useLingui();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedRenameValue = renameValue.trim();

    if (isNonEmptyString(trimmedRenameValue)) {
      onSave(trimmedRenameValue);
    }

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} {...stylex.props(styles.form)}>
      <TextInput
        value={renameValue}
        onChange={onRenameValueChange}
        autoFocus
        fullWidth
        sizeVariant="sm"
        placeholder={t`Group name`}
        aria-label={t`Group name`}
      />
      <Button type="submit" size="sm" variant="solid" color="accent">
        {t`Done`}
      </Button>
    </form>
  );
};
