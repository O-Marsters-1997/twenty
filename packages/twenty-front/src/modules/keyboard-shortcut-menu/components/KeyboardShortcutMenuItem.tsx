import { type Shortcut as ShortcutMenuEntry } from '@/keyboard-shortcut-menu/types/Shortcut';
import { t } from '@lingui/core/macro';
import { Fragment } from 'react';
import { Shortcut } from 'twenty-ui/primitives/typography';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  item: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flexDirection: 'row',
    fontWeight: fontWeight['--t-font-weight-regular'],
    height: '24px',
    justifyContent: 'space-between',
  },
  shortcuts: {
    alignItems: 'center',
    display: 'inline-flex',
    gap: spacing['--t-spacing-1'],
  },
});

type KeyboardMenuItemProps = {
  shortcut: ShortcutMenuEntry;
};

export const KeyboardMenuItem = ({ shortcut }: KeyboardMenuItemProps) => (
  <div {...stylex.props(styles.item)}>
    {shortcut.label}
    <span {...stylex.props(styles.shortcuts)}>
      {shortcut.shortcuts.map((definition, index) => (
        <Fragment key={index}>
          {index > 0 && t`or`}
          <Shortcut shortcut={definition} sequenceJoinLabel={t`then`} />
        </Fragment>
      ))}
    </span>
  </div>
);
