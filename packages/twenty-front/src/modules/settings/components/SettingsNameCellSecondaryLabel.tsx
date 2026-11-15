import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type SettingsNameCellSecondaryLabelProps = {
  children: ReactNode;
  id?: string;
  title?: string;
};

const styles = stylex.create({
  root: {
    '::before': {
      content: "'·'",
      marginRight: spacing['--t-spacing-1'],
    },
    color: fontColor['--t-font-color-light'],
    flex: '0 999 auto',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    minWidth: '48px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

export const SettingsNameCellSecondaryLabel = ({
  children,
  id,
  title,
}: SettingsNameCellSecondaryLabelProps) => (
  <span id={id} title={title} {...stylex.props(styles.root)}>
    {children}
  </span>
);
