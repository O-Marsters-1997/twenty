import { t } from '@lingui/core/macro';
import { Dialog } from 'twenty-ui/primitives/surfaces';
import { DialogInstance } from '@/ui/layout/dialog/components/DialogInstance';

import { useSpreadsheetImportInternal } from '@/spreadsheet-import/hooks/useSpreadsheetImportInternal';

import { SpreadSheetImportModalCloseButton } from './SpreadSheetImportModalCloseButton';
import * as stylex from '@stylexjs/stylex';
import { modalSize } from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

type SpreadSheetImportModalWrapperProps = {
  children: React.ReactNode;
  modalInstanceId: string;
  onClose: () => void;
};

export const SpreadSheetImportModalWrapper = ({
  modalInstanceId,
  children,
  onClose,
}: SpreadSheetImportModalWrapperProps) => {
  const { rtl } = useSpreadsheetImportInternal();

  return (
    <DialogInstance
      dialogId={modalInstanceId}
      dismissible={true}
      onClose={onClose}
      closeOnDismiss={false}
    >
      {({ onKeyDown }) => (
        <Dialog.Popup
          aria-label={t`Import data`}
          onKeyDown={onKeyDown}
          size="xl"
          {...stylex.props(styles.popup)}
        >
          <div {...stylex.props(styles.innerContainer)}>
            <div dir={rtl ? 'rtl' : 'ltr'} {...stylex.props(styles.rtlLtr)}>
              <SpreadSheetImportModalCloseButton onClose={onClose} />
              {children}
            </div>
          </div>
        </Dialog.Popup>
      )}
    </DialogInstance>
  );
};

const styles = stylex.create({
  popup: {
    paddingBlock: 0,
    paddingInline: 0,
    height: modalSize['--t-modal-size-xl-height'],
  },
  innerContainer: {
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    position: 'relative',
    height: { default: null, [media.mobile]: '80%' },
    minHeight: { default: '600px', [media.mobile]: 'auto' },
    minWidth: { default: '800px', [media.mobile]: 'auto' },
    width: { default: null, [media.mobile]: '100%' },
  },
  rtlLtr: {
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
  },
});
