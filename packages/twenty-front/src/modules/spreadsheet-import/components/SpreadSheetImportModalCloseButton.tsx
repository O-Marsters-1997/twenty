import { t } from '@lingui/core/macro';

import { IconX } from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/components/input';
import * as stylex from '@stylexjs/stylex';

type SpreadSheetImportModalCloseButtonProps = {
  onClose: () => void;
};

export const SpreadSheetImportModalCloseButton = ({
  onClose,
}: SpreadSheetImportModalCloseButtonProps) => {
  return (
    <div {...stylex.props(styles.closeButtonContainer)}>
      <IconButton aria-label={t`Close import`} onClick={onClose}>
        <IconX />
      </IconButton>
    </div>
  );
};

const styles = stylex.create({
  closeButtonContainer: {
    alignItems: 'center',
    aspectRatio: '1',
    display: 'flex',
    height: '60px',
    justifyContent: 'center',
    position: 'absolute',
    right: '0',
    top: '0',
  },
});
