import { type ReactNode } from 'react';
import { type IconComponent } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  fieldRow: {
    alignItems: 'center',
    display: 'grid',
    gap: spacing['--t-spacing-1'],
    gridTemplateColumns: '92px minmax(0, 1fr)',
    minHeight: '24px',
  },
  fieldLabel: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    gap: spacing['--t-spacing-2'],
    minWidth: '0',
  },
  fieldValue: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    minWidth: '0',
  },
});

type LogConsoleFieldRowProps = {
  Icon: IconComponent;
  label: string;
  children: ReactNode;
};

export const LogConsoleFieldRow = ({
  Icon,
  label,
  children,
}: LogConsoleFieldRowProps) => {
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.fieldRow)}>
      <div {...stylex.props(styles.fieldLabel)}>
        <Icon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />
        <OverflowingTextWithTooltip text={label} />
      </div>
      <div {...stylex.props(styles.fieldValue)}>{children}</div>
    </div>
  );
};
