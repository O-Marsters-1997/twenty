import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { borderColor } from 'twenty-ui/theme/tokens.stylex';

type StyledSettingsDataModelTableBodyContainerProps = {
  children: ReactNode;
};

export const StyledSettingsDataModelTableBodyContainer = ({
  children,
}: StyledSettingsDataModelTableBodyContainerProps) => (
  <div {...stylex.props(styles.container)}>{children}</div>
);

const styles = stylex.create({
  container: {
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
  },
});
