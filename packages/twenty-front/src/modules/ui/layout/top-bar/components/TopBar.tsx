import { type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  fontColor,
  fontWeight,
  general,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type TopBarProps = {
  className?: string;
  leftComponent?: ReactNode;
  rightComponent?: ReactNode;
  bottomComponent?: ReactNode;
  displayBottomBorder?: boolean;
};

const styles = stylex.create({
  container: {
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    display: 'flex',
    flexDirection: 'column',
    marginLeft: spacing['--t-spacing-2'],
  },
  rightSection: {
    display: 'flex',
    fontWeight: fontWeight['--t-font-weight-regular'],
    gap: general['--t-between-siblings-gap'],
  },
  topBar: {
    alignItems: 'center',
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    flexDirection: 'row',
    fontWeight: fontWeight['--t-font-weight-medium'],
    height: '39px',
    justifyContent: 'space-between',
    marginLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-2'],
    zIndex: 7,
  },
  leftSection: {
    display: 'flex',
  },
});

export const TopBar = ({
  className,
  leftComponent,
  rightComponent,
  bottomComponent,
}: TopBarProps) => {
  const containerProps = stylex.props(styles.container);

  return (
    <div
      {...containerProps}
      className={[containerProps.className, className].join(' ')}
    >
      <div {...stylex.props(styles.topBar)}>
        <div {...stylex.props(styles.leftSection)}>{leftComponent}</div>
        <div {...stylex.props(styles.rightSection)}>{rightComponent}</div>
      </div>
      {bottomComponent}
    </div>
  );
};
