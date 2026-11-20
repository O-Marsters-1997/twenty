import { type ReactNode } from 'react';
import { type IconComponent } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  row: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'flex-start',
    display: 'flex',
  },
  label: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexShrink: '0',
    fontSize: fontSize['--t-font-size-sm'],
    height: spacing['--t-spacing-6'],
    width: spacing['--t-spacing-24'],
  },
  labelText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  value: {
    flex: '1',
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    minHeight: spacing['--t-spacing-6'],
    minWidth: '0',
  },
});

type AiChatThreadDetailsRowProps = {
  Icon: IconComponent;
  label: string;
  action?: ReactNode;
  children: ReactNode;
};

export const AiChatThreadDetailsRow = ({
  Icon,
  label,
  action,
  children,
}: AiChatThreadDetailsRowProps) => {
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.row)}>
      <div {...stylex.props(styles.label)}>
        <Icon size={theme.icon.size.sm} />
        <span {...stylex.props(styles.labelText)}>{label}</span>
      </div>
      <div {...stylex.props(styles.value)}>{children}</div>
      {action}
    </div>
  );
};
