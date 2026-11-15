import * as stylex from '@stylexjs/stylex';
import { MessageFolderImportPolicy } from 'twenty-shared/types';

import {
  accent,
  background,
  borderColor,
  borderRadius,
} from 'twenty-ui/theme/tokens.stylex';

type SettingsAccountsMessageFolderIconProps = {
  value?: MessageFolderImportPolicy;
};

const styles = stylex.create({
  cardMedia: {
    alignItems: 'center',
    backgroundColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    boxSizing: 'border-box',
    display: 'flex',
    height: '40px',
    justifyContent: 'center',
    padding: '2px',
    width: '32px',
  },
  cardMediaContent: {
    alignItems: 'stretch',
    backgroundColor: background['--t-background-secondary'],
    borderRadius: borderRadius['--t-border-radius-xs'],
    boxSizing: 'border-box',
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    gap: '2px',
    height: '100%',
    justifyContent: 'center',
    minWidth: '0',
    padding: '2px',
  },
  folderRow: {
    alignItems: 'center',
    display: 'flex',
    flex: '1 0 0',
    gap: '2px',
    minHeight: '0',
  },
  folderIcon: {
    backgroundColor: accent['--t-accent-accent7'],
    borderRadius: '1px',
    height: '100%',
    width: '4.8px',
  },
  folderLabel: {
    backgroundColor: accent['--t-accent-accent7'],
    borderRadius: '1px',
    flex: '1',
    height: '100%',
  },
  disabled: {
    backgroundColor: borderColor['--t-border-color-medium'],
  },
});

const ROW_CAN_BE_DISABLED = [true, true, false, true, false];

export const SettingsAccountsMessageFolderIcon = ({
  value,
}: SettingsAccountsMessageFolderIconProps) => {
  const isSelectedFolders =
    value === MessageFolderImportPolicy.SELECTED_FOLDERS;

  return (
    <div {...stylex.props(styles.cardMedia)}>
      <div {...stylex.props(styles.cardMediaContent)}>
        {ROW_CAN_BE_DISABLED.map((canBeDisabled, index) => {
          const disabled =
            canBeDisabled && isSelectedFolders && styles.disabled;

          return (
            <div key={index} {...stylex.props(styles.folderRow)}>
              <div {...stylex.props(styles.folderIcon, disabled)} />
              <div {...stylex.props(styles.folderLabel, disabled)} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
