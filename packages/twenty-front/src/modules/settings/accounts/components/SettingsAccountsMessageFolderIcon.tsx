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
    padding: '2px',
    borderRadius: borderRadius['--t-border-radius-sm'],
    alignItems: 'center',
    backgroundColor: borderColor['--t-border-color-medium'],
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'center',
    height: '40px',
    width: '32px',
  },
  cardMediaContent: {
    padding: '2px',
    borderRadius: borderRadius['--t-border-radius-xs'],
    flex: '1',
    gap: '2px',
    alignItems: 'stretch',
    backgroundColor: background['--t-background-secondary'],
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: '100%',
    minWidth: '0',
  },
  folderRow: {
    flexGrow: '1',
    flexShrink: '0',
    flexBasis: '0',
    gap: '2px',
    alignItems: 'center',
    display: 'flex',
    minHeight: '0',
  },
  folderIcon: {
    borderRadius: '1px',
    backgroundColor: accent['--t-accent-accent7'],
    height: '100%',
    width: '4.8px',
  },
  folderLabel: {
    borderRadius: '1px',
    flex: '1',
    backgroundColor: accent['--t-accent-accent7'],
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
