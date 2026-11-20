import type { IconComponent } from 'twenty-ui/icon';

import { CancelButton } from './CancelButton';
import { SaveButton } from './SaveButton';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
  },
});

type SaveAndCancelButtonsProps = {
  onSave?: () => void;
  isLoading?: boolean;
  onCancel?: () => void;
  isSaveDisabled?: boolean;
  isCancelDisabled?: boolean;
  inverted?: boolean;
  saveIcon?: IconComponent;
};

export const SaveAndCancelButtons = ({
  onSave,
  isLoading,
  onCancel,
  isSaveDisabled,
  isCancelDisabled,
  inverted = false,
  saveIcon,
}: SaveAndCancelButtonsProps) => {
  return (
    <div {...stylex.props(styles.container)}>
      <CancelButton
        onCancel={onCancel}
        disabled={isCancelDisabled}
        inverted={inverted}
      />
      <SaveButton
        onSave={onSave}
        disabled={isSaveDisabled}
        isLoading={isLoading}
        inverted={inverted}
        saveIcon={saveIcon}
      />
    </div>
  );
};
