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
    flexGrow: '0',
    flexShrink: '999',
    flexBasis: 'auto',
    overflow: 'hidden',
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: '48px',
    '::before': {
      content: "'·'",
      marginRight: spacing['--t-spacing-1'],
    },
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
