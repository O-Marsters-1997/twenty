import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

type StyledSettingsSelectGroupProps = {
  controlWidth: number;
  children: ReactNode;
};

export const StyledSettingsSelectGroup = ({
  controlWidth,
  children,
}: StyledSettingsSelectGroupProps) => (
  <div {...stylex.props(styles.root, styles.controlWidth(controlWidth))}>
    {children}
  </div>
);

const styles = stylex.create({
  root: {
    containerName: 'settings-select-group',
    containerType: 'inline-size',
  },
  controlWidth: (controlWidth: number) => ({
    '--settings-select-control-width': `${controlWidth}px`,
  }),
});
